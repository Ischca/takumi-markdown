//! WASM bindings for Takumi Markdown renderer.
//!
//! Exports a single `render` function that takes Markdown text
//! and viewport width, returns a serialized LayoutTree as a JS object.

use wasm_bindgen::prelude::*;

use takumi_core::parse;
use takumi_layout::{layout, LayoutContext};

/// Render Markdown text into a LayoutTree (returned as a JS object).
///
/// # Arguments
/// * `markdown` - Raw Markdown text
/// * `viewport_width_px` - Viewport width in pixels (used for fluid typography)
///
/// # Returns
/// A JS object representing the LayoutTree (serialized via serde).
#[wasm_bindgen]
pub fn render(markdown: &str, viewport_width_px: f64) -> JsValue {
    let doc = parse::parse(markdown);
    let ctx = LayoutContext::new(viewport_width_px);
    let tree = layout(&doc, &ctx);
    serde_wasm_bindgen::to_value(&tree).unwrap()
}

/// Parse Markdown and return only the frontmatter (if any).
#[wasm_bindgen]
pub fn extract_frontmatter(markdown: &str) -> Option<String> {
    let doc = parse::parse(markdown);
    doc.frontmatter
}
