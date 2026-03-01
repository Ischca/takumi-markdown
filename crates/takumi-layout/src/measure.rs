//! Text measurement trait and implementations.
//!
//! Different rendering targets use different measurement strategies:
//! - Web: character-count heuristic (CJK ≈ 1em, ASCII ≈ 0.5em)
//! - Metal: precise glyph metrics via cosmic-text

use takumi_core::unicode;

/// Trait for measuring the width of text in em units.
pub trait TextMeasurer {
    fn measure_em(&self, text: &str) -> f64;
}

/// Heuristic text measurer for web layout.
///
/// Uses character-based estimation: CJK chars = 1em, ASCII = ~0.5em.
/// This is good enough for line-breaking decisions since CSS handles
/// the actual rendering.
pub struct WebMeasurer;

impl TextMeasurer for WebMeasurer {
    fn measure_em(&self, text: &str) -> f64 {
        unicode::estimated_string_em_width(text)
    }
}
