//! LayoutTree: serializable output from the layout engine.
//!
//! This is the bridge between Rust layout and the rendering targets
//! (Web DOM / Metal GPU). It is serialized to JSON via serde for WASM.

use serde::{Deserialize, Serialize};

/// Root of the layout tree with global metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutTree {
    pub root: Vec<LayoutNode>,
    pub base_font_size_px: f64,
    pub max_width_px: f64,
    pub frontmatter: Option<String>,
}

/// Block-level layout node.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LayoutNode {
    Heading {
        level: u8,
        children: Vec<LayoutInline>,
    },
    Paragraph {
        children: Vec<LayoutInline>,
    },
    BlockQuote {
        children: Vec<LayoutNode>,
    },
    CodeBlock {
        language: Option<String>,
        code: String,
    },
    List {
        ordered: bool,
        start: u32,
        items: Vec<LayoutListItem>,
    },
    Table {
        alignments: Vec<LayoutAlignment>,
        head: Vec<Vec<LayoutInline>>,
        rows: Vec<Vec<Vec<LayoutInline>>>,
    },
    ThematicBreak,
    HtmlBlock {
        html: String,
    },
}

/// A single list item in the layout tree.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutListItem {
    pub checked: Option<bool>,
    pub children: Vec<LayoutNode>,
}

/// Inline layout node.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum LayoutInline {
    Text {
        text: String,
    },
    Strong {
        children: Vec<LayoutInline>,
    },
    Emphasis {
        children: Vec<LayoutInline>,
    },
    Strikethrough {
        children: Vec<LayoutInline>,
    },
    Code {
        code: String,
    },
    Link {
        url: String,
        children: Vec<LayoutInline>,
    },
    Image {
        url: String,
        alt: String,
    },
    Ruby {
        base: String,
        annotation: String,
    },
    LineBreak,
    HtmlInline {
        html: String,
    },
}

/// Table column alignment (mirrors core AST).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LayoutAlignment {
    None,
    Left,
    Center,
    Right,
}
