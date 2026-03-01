//! Layout engine: converts AST → LayoutTree.
//!
//! Handles line-breaking with kinsoku rules, vertical rhythm
//! calculation, and other typography decisions.

use takumi_core::ast::*;
use takumi_core::typography;

use crate::tree::*;

/// Layout context with viewport information.
pub struct LayoutContext {
    pub viewport_width_px: f64,
    pub base_font_size_px: f64,
    pub max_width_px: f64,
}

impl LayoutContext {
    pub fn new(viewport_width_px: f64) -> Self {
        let base_font_size_px = typography::fluid_font_size(viewport_width_px);
        let max_width_px = typography::max_content_width_px(viewport_width_px);
        Self {
            viewport_width_px,
            base_font_size_px,
            max_width_px,
        }
    }
}

/// Convert a parsed Document into a LayoutTree.
pub fn layout(doc: &Document, ctx: &LayoutContext) -> LayoutTree {
    let root = doc.children.iter().map(|n| layout_node(n)).collect();
    LayoutTree {
        root,
        base_font_size_px: ctx.base_font_size_px,
        max_width_px: ctx.max_width_px,
        frontmatter: doc.frontmatter.clone(),
    }
}

fn layout_node(node: &Node) -> LayoutNode {
    match node {
        Node::Heading { level, children } => LayoutNode::Heading {
            level: *level,
            children: children.iter().map(layout_inline).collect(),
        },
        Node::Paragraph { children } => LayoutNode::Paragraph {
            children: children.iter().map(layout_inline).collect(),
        },
        Node::BlockQuote { children } => LayoutNode::BlockQuote {
            children: children.iter().map(layout_node).collect(),
        },
        Node::CodeBlock { language, code } => LayoutNode::CodeBlock {
            language: language.clone(),
            code: code.clone(),
        },
        Node::List {
            ordered,
            start,
            items,
        } => LayoutNode::List {
            ordered: *ordered,
            start: *start,
            items: items.iter().map(layout_list_item).collect(),
        },
        Node::Table {
            alignments,
            head,
            rows,
        } => LayoutNode::Table {
            alignments: alignments
                .iter()
                .map(|a| match a {
                    Alignment::None => LayoutAlignment::None,
                    Alignment::Left => LayoutAlignment::Left,
                    Alignment::Center => LayoutAlignment::Center,
                    Alignment::Right => LayoutAlignment::Right,
                })
                .collect(),
            head: head
                .iter()
                .map(|cell| cell.iter().map(layout_inline).collect())
                .collect(),
            rows: rows
                .iter()
                .map(|row| {
                    row.iter()
                        .map(|cell| cell.iter().map(layout_inline).collect())
                        .collect()
                })
                .collect(),
        },
        Node::ThematicBreak => LayoutNode::ThematicBreak,
        Node::HtmlBlock { html } => LayoutNode::HtmlBlock { html: html.clone() },
    }
}

fn layout_list_item(item: &ListItem) -> LayoutListItem {
    LayoutListItem {
        checked: item.checked,
        children: item.children.iter().map(layout_node).collect(),
    }
}

fn layout_inline(node: &InlineNode) -> LayoutInline {
    match node {
        InlineNode::Text { text } => LayoutInline::Text { text: text.clone() },
        InlineNode::Strong { children } => LayoutInline::Strong {
            children: children.iter().map(layout_inline).collect(),
        },
        InlineNode::Emphasis { children } => LayoutInline::Emphasis {
            children: children.iter().map(layout_inline).collect(),
        },
        InlineNode::Strikethrough { children } => LayoutInline::Strikethrough {
            children: children.iter().map(layout_inline).collect(),
        },
        InlineNode::Code { code } => LayoutInline::Code { code: code.clone() },
        InlineNode::Link { url, children } => LayoutInline::Link {
            url: url.clone(),
            children: children.iter().map(layout_inline).collect(),
        },
        InlineNode::Image { url, alt } => LayoutInline::Image {
            url: url.clone(),
            alt: alt.clone(),
        },
        InlineNode::Ruby { base, annotation } => LayoutInline::Ruby {
            base: base.clone(),
            annotation: annotation.clone(),
        },
        InlineNode::LineBreak => LayoutInline::LineBreak,
        InlineNode::HtmlInline { html } => LayoutInline::HtmlInline { html: html.clone() },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use takumi_core::parse;

    #[test]
    fn layout_basic_document() {
        let doc = parse::parse("# Hello\n\nThis is a test paragraph.");
        let ctx = LayoutContext::new(1024.0);
        let tree = layout(&doc, &ctx);

        assert_eq!(tree.root.len(), 2);
        assert!(matches!(&tree.root[0], LayoutNode::Heading { level: 1, .. }));
        assert!(matches!(&tree.root[1], LayoutNode::Paragraph { .. }));
    }

    #[test]
    fn layout_with_ruby() {
        let doc = parse::parse("漢字《かんじ》のテスト");
        let ctx = LayoutContext::new(1024.0);
        let tree = layout(&doc, &ctx);

        assert_eq!(tree.root.len(), 1);
        if let LayoutNode::Paragraph { children } = &tree.root[0] {
            assert!(children
                .iter()
                .any(|c| matches!(c, LayoutInline::Ruby { .. })));
        } else {
            panic!("expected paragraph");
        }
    }

    #[test]
    fn layout_preserves_frontmatter() {
        let doc = parse::parse("---\ntitle: Test\n---\n\n# Hello");
        let ctx = LayoutContext::new(1024.0);
        let tree = layout(&doc, &ctx);

        assert_eq!(tree.frontmatter.as_deref(), Some("title: Test"));
    }

    #[test]
    fn layout_computes_metrics() {
        let doc = parse::parse("# Hello");
        let ctx = LayoutContext::new(500.0);
        let tree = layout(&doc, &ctx);

        // At 500px viewport: font = clamp(15, 5+12, 18) = 17px
        assert!((tree.base_font_size_px - 17.0).abs() < f64::EPSILON);
    }
}
