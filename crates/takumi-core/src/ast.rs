//! Document AST types for Takumi Markdown.
//!
//! This is the intermediate representation produced by the parser.
//! It is consumed by the layout engine to produce a LayoutTree.

use serde::{Deserialize, Serialize};

/// A complete Markdown document.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub children: Vec<Node>,
    pub frontmatter: Option<String>,
}

/// Block-level node.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Node {
    Heading {
        level: u8,
        children: Vec<InlineNode>,
    },
    Paragraph {
        children: Vec<InlineNode>,
    },
    BlockQuote {
        children: Vec<Node>,
    },
    CodeBlock {
        language: Option<String>,
        code: String,
    },
    List {
        ordered: bool,
        start: u32,
        items: Vec<ListItem>,
    },
    Table {
        alignments: Vec<Alignment>,
        head: Vec<Vec<InlineNode>>,
        rows: Vec<Vec<Vec<InlineNode>>>,
    },
    ThematicBreak,
    /// Raw HTML block (passed through from Markdown).
    HtmlBlock {
        html: String,
    },
}

/// A single item in a list.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListItem {
    pub checked: Option<bool>,
    pub children: Vec<Node>,
}

/// Inline-level node.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum InlineNode {
    Text { text: String },
    Strong { children: Vec<InlineNode> },
    Emphasis { children: Vec<InlineNode> },
    Strikethrough { children: Vec<InlineNode> },
    Code { code: String },
    Link { url: String, children: Vec<InlineNode> },
    Image { url: String, alt: String },
    Ruby { base: String, annotation: String },
    LineBreak,
    /// Raw inline HTML (e.g. from ruby plugin output).
    HtmlInline { html: String },
}

/// Table column alignment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Alignment {
    None,
    Left,
    Center,
    Right,
}
