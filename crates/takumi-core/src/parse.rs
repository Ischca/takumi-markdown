//! Markdown parser using pulldown-cmark.
//!
//! Converts raw Markdown text into our `Document` AST, applying ruby
//! notation processing on text nodes.

use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag, TagEnd};

use crate::ast::*;
use crate::ruby::process_ruby;

/// Parse a Markdown string into a `Document`.
pub fn parse(input: &str) -> Document {
    let (frontmatter, body) = extract_frontmatter(input);

    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);

    let parser = Parser::new_ext(body, opts);
    let events: Vec<Event> = parser.collect();

    let mut builder = AstBuilder::new();
    builder.build(&events);

    Document {
        children: builder.root,
        frontmatter: frontmatter.map(|s| s.to_string()),
    }
}

/// Extract YAML frontmatter from the beginning of a Markdown document.
fn extract_frontmatter(input: &str) -> (Option<&str>, &str) {
    if !input.starts_with("---") {
        return (None, input);
    }

    let after_first = &input[3..];
    // Find the closing ---
    if let Some(end) = after_first.find("\n---") {
        let fm_content = after_first[..end].trim();
        let body_start = 3 + end + 4; // skip "---\n---"
        let body = if body_start < input.len() {
            input[body_start..].trim_start_matches('\n')
        } else {
            ""
        };
        (Some(fm_content), body)
    } else {
        (None, input)
    }
}

struct AstBuilder {
    root: Vec<Node>,
    /// Stack of open block containers.
    block_stack: Vec<BlockFrame>,
    /// Stack of open inline containers.
    inline_stack: Vec<InlineFrame>,
}

enum BlockFrame {
    BlockQuote(Vec<Node>),
    List {
        ordered: bool,
        start: u32,
        items: Vec<ListItem>,
    },
    ListItem {
        checked: Option<bool>,
        children: Vec<Node>,
    },
    Table {
        alignments: Vec<Alignment>,
        head: Vec<Vec<InlineNode>>,
        rows: Vec<Vec<Vec<InlineNode>>>,
        current_row: Vec<Vec<InlineNode>>,
        current_cell: Vec<InlineNode>,
        in_head: bool,
    },
    Heading {
        level: u8,
        children: Vec<InlineNode>,
    },
    Paragraph(Vec<InlineNode>),
}

enum InlineFrame {
    Strong(Vec<InlineNode>),
    Emphasis(Vec<InlineNode>),
    Strikethrough(Vec<InlineNode>),
    Link {
        url: String,
        children: Vec<InlineNode>,
    },
}

impl AstBuilder {
    fn new() -> Self {
        Self {
            root: Vec::new(),
            block_stack: Vec::new(),
            inline_stack: Vec::new(),
        }
    }

    fn build(&mut self, events: &[Event]) {
        for event in events {
            match event {
                Event::Start(tag) => self.open_tag(tag),
                Event::End(tag) => self.close_tag(tag),
                Event::Text(text) => self.push_text(text),
                Event::Code(code) => self.push_inline(InlineNode::Code {
                    code: code.to_string(),
                }),
                Event::SoftBreak => self.push_inline(InlineNode::Text {
                    text: " ".to_string(),
                }),
                Event::HardBreak => self.push_inline(InlineNode::LineBreak),
                Event::Html(html) => self.handle_html(html),
                Event::Rule => self.push_block(Node::ThematicBreak),
                Event::TaskListMarker(checked) => self.set_task_checked(*checked),
                _ => {}
            }
        }
    }

    fn open_tag(&mut self, tag: &Tag) {
        match tag {
            Tag::Heading { level, .. } => {
                let lvl = heading_level_to_u8(level);
                self.block_stack.push(BlockFrame::Heading {
                    level: lvl,
                    children: Vec::new(),
                });
            }
            Tag::Paragraph => {
                self.block_stack
                    .push(BlockFrame::Paragraph(Vec::new()));
            }
            Tag::BlockQuote(_) => {
                self.block_stack
                    .push(BlockFrame::BlockQuote(Vec::new()));
            }
            Tag::CodeBlock(kind) => {
                let language = match kind {
                    pulldown_cmark::CodeBlockKind::Fenced(lang) => {
                        let l = lang.to_string();
                        if l.is_empty() {
                            None
                        } else {
                            Some(l)
                        }
                    }
                    pulldown_cmark::CodeBlockKind::Indented => None,
                };
                // We'll collect the code text and emit a CodeBlock node on close
                self.block_stack.push(BlockFrame::Paragraph(Vec::new()));
                // Store language info by pushing a special sentinel
                // Actually, let's handle this via a dedicated approach
                self.block_stack.pop(); // Remove the paragraph we just pushed
                self.block_stack.push(BlockFrame::Heading {
                    level: 0, // sentinel: level 0 means code block
                    children: Vec::new(),
                });
                // We need to store the language. Let's use a different approach.
                // Re-do: use a text accumulator
                self.block_stack.pop();
                // Push a special marker. We'll collect text events and emit CodeBlock on End.
                self.block_stack.push(BlockFrame::Paragraph(Vec::new()));
                // Store language in a text node (hacky but works for our simple parser)
                if let Some(lang) = language {
                    if let Some(BlockFrame::Paragraph(ref mut inlines)) =
                        self.block_stack.last_mut()
                    {
                        inlines.push(InlineNode::HtmlInline {
                            html: format!("__lang:{lang}"),
                        });
                    }
                }
            }
            Tag::List(start) => {
                let ordered = start.is_some();
                let start_num = start.unwrap_or(1) as u32;
                self.block_stack.push(BlockFrame::List {
                    ordered,
                    start: start_num,
                    items: Vec::new(),
                });
            }
            Tag::Item => {
                self.block_stack.push(BlockFrame::ListItem {
                    checked: None,
                    children: Vec::new(),
                });
            }
            Tag::Table(aligns) => {
                let alignments = aligns
                    .iter()
                    .map(|a| match a {
                        pulldown_cmark::Alignment::None => Alignment::None,
                        pulldown_cmark::Alignment::Left => Alignment::Left,
                        pulldown_cmark::Alignment::Center => Alignment::Center,
                        pulldown_cmark::Alignment::Right => Alignment::Right,
                    })
                    .collect();
                self.block_stack.push(BlockFrame::Table {
                    alignments,
                    head: Vec::new(),
                    rows: Vec::new(),
                    current_row: Vec::new(),
                    current_cell: Vec::new(),
                    in_head: false,
                });
            }
            Tag::TableHead => {
                if let Some(BlockFrame::Table { in_head, .. }) = self.block_stack.last_mut() {
                    *in_head = true;
                }
            }
            Tag::TableRow => {
                if let Some(BlockFrame::Table { current_row, .. }) = self.block_stack.last_mut() {
                    current_row.clear();
                }
            }
            Tag::TableCell => {
                if let Some(BlockFrame::Table { current_cell, .. }) = self.block_stack.last_mut() {
                    current_cell.clear();
                }
            }
            Tag::Emphasis => {
                self.inline_stack
                    .push(InlineFrame::Emphasis(Vec::new()));
            }
            Tag::Strong => {
                self.inline_stack.push(InlineFrame::Strong(Vec::new()));
            }
            Tag::Strikethrough => {
                self.inline_stack
                    .push(InlineFrame::Strikethrough(Vec::new()));
            }
            Tag::Link { dest_url, .. } => {
                self.inline_stack.push(InlineFrame::Link {
                    url: dest_url.to_string(),
                    children: Vec::new(),
                });
            }
            Tag::Image { dest_url, title, .. } => {
                // Images are self-closing in our model
                let alt = title.to_string();
                self.push_inline(InlineNode::Image {
                    url: dest_url.to_string(),
                    alt,
                });
            }
            _ => {}
        }
    }

    fn close_tag(&mut self, tag: &TagEnd) {
        match tag {
            TagEnd::Heading(_level) => {
                if let Some(BlockFrame::Heading { level, children }) = self.block_stack.pop() {
                    self.push_block(Node::Heading { level, children });
                }
            }
            TagEnd::Paragraph => {
                if let Some(BlockFrame::Paragraph(children)) = self.block_stack.pop() {
                    self.push_block(Node::Paragraph { children });
                }
            }
            TagEnd::BlockQuote(_) => {
                if let Some(BlockFrame::BlockQuote(children)) = self.block_stack.pop() {
                    self.push_block(Node::BlockQuote { children });
                }
            }
            TagEnd::CodeBlock => {
                if let Some(BlockFrame::Paragraph(inlines)) = self.block_stack.pop() {
                    // Extract language and code text
                    let mut language = None;
                    let mut code = String::new();
                    for inline in &inlines {
                        match inline {
                            InlineNode::HtmlInline { html } if html.starts_with("__lang:") => {
                                language = Some(html[7..].to_string());
                            }
                            InlineNode::Text { text } => code.push_str(text),
                            _ => {}
                        }
                    }
                    // Remove trailing newline from code
                    if code.ends_with('\n') {
                        code.pop();
                    }
                    self.push_block(Node::CodeBlock { language, code });
                }
            }
            TagEnd::List(_) => {
                if let Some(BlockFrame::List {
                    ordered,
                    start,
                    items,
                }) = self.block_stack.pop()
                {
                    self.push_block(Node::List {
                        ordered,
                        start,
                        items,
                    });
                }
            }
            TagEnd::Item => {
                if let Some(BlockFrame::ListItem { checked, children }) = self.block_stack.pop() {
                    if let Some(BlockFrame::List { items, .. }) = self.block_stack.last_mut() {
                        items.push(ListItem { checked, children });
                    }
                }
            }
            TagEnd::Table => {
                if let Some(BlockFrame::Table {
                    alignments,
                    head,
                    rows,
                    ..
                }) = self.block_stack.pop()
                {
                    self.push_block(Node::Table {
                        alignments,
                        head,
                        rows,
                    });
                }
            }
            TagEnd::TableHead => {
                if let Some(BlockFrame::Table {
                    in_head,
                    current_row,
                    head,
                    ..
                }) = self.block_stack.last_mut()
                {
                    *head = std::mem::take(current_row);
                    *in_head = false;
                }
            }
            TagEnd::TableRow => {
                if let Some(BlockFrame::Table {
                    in_head,
                    current_row,
                    head,
                    rows,
                    ..
                }) = self.block_stack.last_mut()
                {
                    let row = std::mem::take(current_row);
                    if *in_head {
                        *head = row;
                    } else {
                        rows.push(row);
                    }
                }
            }
            TagEnd::TableCell => {
                if let Some(BlockFrame::Table {
                    current_cell,
                    current_row,
                    ..
                }) = self.block_stack.last_mut()
                {
                    let cell = std::mem::take(current_cell);
                    current_row.push(cell);
                }
            }
            TagEnd::Emphasis => {
                if let Some(InlineFrame::Emphasis(children)) = self.inline_stack.pop() {
                    self.push_inline(InlineNode::Emphasis { children });
                }
            }
            TagEnd::Strong => {
                if let Some(InlineFrame::Strong(children)) = self.inline_stack.pop() {
                    self.push_inline(InlineNode::Strong { children });
                }
            }
            TagEnd::Strikethrough => {
                if let Some(InlineFrame::Strikethrough(children)) = self.inline_stack.pop() {
                    self.push_inline(InlineNode::Strikethrough { children });
                }
            }
            TagEnd::Link => {
                if let Some(InlineFrame::Link { url, children }) = self.inline_stack.pop() {
                    self.push_inline(InlineNode::Link { url, children });
                }
            }
            _ => {}
        }
    }

    fn push_text(&mut self, text: &str) {
        // Apply ruby processing on text nodes
        if let Some(ruby_nodes) = process_ruby(text) {
            for node in ruby_nodes {
                self.push_inline(node);
            }
        } else {
            self.push_inline(InlineNode::Text {
                text: text.to_string(),
            });
        }
    }

    fn push_inline(&mut self, node: InlineNode) {
        // Try inline stack first
        if let Some(frame) = self.inline_stack.last_mut() {
            match frame {
                InlineFrame::Strong(children)
                | InlineFrame::Emphasis(children)
                | InlineFrame::Strikethrough(children) => {
                    children.push(node);
                    return;
                }
                InlineFrame::Link { children, .. } => {
                    children.push(node);
                    return;
                }
            }
        }

        // Then try block stack
        if let Some(frame) = self.block_stack.last_mut() {
            match frame {
                BlockFrame::Heading { children, .. } => {
                    children.push(node);
                    return;
                }
                BlockFrame::Paragraph(children) => {
                    children.push(node);
                    return;
                }
                BlockFrame::Table { current_cell, .. } => {
                    current_cell.push(node);
                    return;
                }
                BlockFrame::ListItem { children, .. } => {
                    // Tight lists: inline content goes directly into list item
                    // Wrap in an implicit paragraph
                    if let Some(Node::Paragraph {
                        children: ref mut p,
                    }) = children.last_mut()
                    {
                        p.push(node);
                    } else {
                        children.push(Node::Paragraph {
                            children: vec![node],
                        });
                    }
                    return;
                }
                _ => {}
            }
        }

        // Fallback: wrap in a paragraph
        self.root.push(Node::Paragraph {
            children: vec![node],
        });
    }

    fn push_block(&mut self, node: Node) {
        if let Some(frame) = self.block_stack.last_mut() {
            match frame {
                BlockFrame::BlockQuote(children) => {
                    children.push(node);
                    return;
                }
                BlockFrame::ListItem { children, .. } => {
                    children.push(node);
                    return;
                }
                _ => {}
            }
        }
        self.root.push(node);
    }

    fn handle_html(&mut self, html: &str) {
        let trimmed = html.trim();
        if trimmed.is_empty() {
            return;
        }
        // Try to parse as inline HTML (e.g. ruby elements)
        self.push_inline(InlineNode::HtmlInline {
            html: trimmed.to_string(),
        });
    }

    fn set_task_checked(&mut self, checked: bool) {
        if let Some(BlockFrame::ListItem {
            checked: ref mut c, ..
        }) = self.block_stack.last_mut()
        {
            *c = Some(checked);
        }
    }
}

fn heading_level_to_u8(level: &HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_heading() {
        let doc = parse("# Hello World");
        assert_eq!(doc.children.len(), 1);
        match &doc.children[0] {
            Node::Heading { level, children } => {
                assert_eq!(*level, 1);
                assert_eq!(children.len(), 1);
                match &children[0] {
                    InlineNode::Text { text } => assert_eq!(text, "Hello World"),
                    _ => panic!("expected text"),
                }
            }
            _ => panic!("expected heading"),
        }
    }

    #[test]
    fn parse_paragraph_with_ruby() {
        let doc = parse("漢字《かんじ》のテスト");
        assert_eq!(doc.children.len(), 1);
        match &doc.children[0] {
            Node::Paragraph { children } => {
                assert!(children.len() >= 2);
                match &children[0] {
                    InlineNode::Ruby { base, annotation } => {
                        assert_eq!(base, "漢字");
                        assert_eq!(annotation, "かんじ");
                    }
                    _ => panic!("expected ruby"),
                }
            }
            _ => panic!("expected paragraph"),
        }
    }

    #[test]
    fn parse_code_block() {
        let doc = parse("```rust\nfn main() {}\n```");
        assert_eq!(doc.children.len(), 1);
        match &doc.children[0] {
            Node::CodeBlock { language, code } => {
                assert_eq!(language.as_deref(), Some("rust"));
                assert_eq!(code, "fn main() {}");
            }
            _ => panic!("expected code block"),
        }
    }

    #[test]
    fn parse_frontmatter() {
        let doc = parse("---\ntitle: Test\n---\n\n# Hello");
        assert_eq!(doc.frontmatter.as_deref(), Some("title: Test"));
        assert_eq!(doc.children.len(), 1);
    }

    #[test]
    fn parse_list() {
        let doc = parse("- item 1\n- item 2\n- item 3");
        assert_eq!(doc.children.len(), 1);
        match &doc.children[0] {
            Node::List {
                ordered,
                items,
                start,
            } => {
                assert!(!ordered);
                assert_eq!(*start, 1);
                assert_eq!(items.len(), 3);
            }
            _ => panic!("expected list"),
        }
    }

    #[test]
    fn parse_blockquote() {
        let doc = parse("> quoted text");
        assert_eq!(doc.children.len(), 1);
        match &doc.children[0] {
            Node::BlockQuote { children } => {
                assert_eq!(children.len(), 1);
                match &children[0] {
                    Node::Paragraph { children } => {
                        assert!(!children.is_empty());
                    }
                    _ => panic!("expected paragraph inside blockquote"),
                }
            }
            _ => panic!("expected blockquote"),
        }
    }

    #[test]
    fn parse_table() {
        let doc = parse("| A | B |\n|---|---|\n| 1 | 2 |");
        assert_eq!(doc.children.len(), 1);
        match &doc.children[0] {
            Node::Table { head, rows, .. } => {
                assert!(!head.is_empty());
                assert!(!rows.is_empty());
            }
            _ => panic!("expected table"),
        }
    }
}
