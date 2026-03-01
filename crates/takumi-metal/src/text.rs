//! Text shaping and measurement using cosmic-text.
//!
//! Provides the MetalMeasurer (precise glyph metrics) and text layout.

use cosmic_text::{Attrs, Buffer, Family, FontSystem, Metrics, Shaping, SwashCache};

use takumi_layout::measure::TextMeasurer;

/// Font configuration for Takumi rendering.
pub struct FontConfig {
    pub font_system: FontSystem,
    pub swash_cache: SwashCache,
}

impl FontConfig {
    pub fn new() -> Self {
        let mut font_system = FontSystem::new();
        // System fonts will be used. On macOS, Manrope and BIZ UDPGothic
        // should be installed or embedded.
        // For now, use system defaults with fallback.
        let _db = font_system.db_mut();
        Self {
            font_system,
            swash_cache: SwashCache::new(),
        }
    }

    /// Create a text buffer for layout.
    pub fn create_buffer(&mut self, text: &str, font_size: f32, max_width: f32) -> Buffer {
        let metrics = Metrics::new(font_size, font_size * 1.8); // line_height = 1.8
        let mut buffer = Buffer::new(&mut self.font_system, metrics);

        let attrs = Attrs::new()
            .family(Family::SansSerif);

        buffer.set_size(&mut self.font_system, Some(max_width), None);
        buffer.set_text(&mut self.font_system, text, attrs, Shaping::Advanced);
        buffer.shape_until_scroll(&mut self.font_system, false);

        buffer
    }
}

/// Precise text measurer using cosmic-text glyph metrics.
pub struct MetalMeasurer<'a> {
    font_system: &'a mut FontSystem,
}

impl<'a> MetalMeasurer<'a> {
    pub fn new(font_system: &'a mut FontSystem) -> Self {
        Self { font_system }
    }
}

impl TextMeasurer for MetalMeasurer<'_> {
    fn measure_em(&self, text: &str) -> f64 {
        // For the MetalMeasurer, we use cosmic-text's layout to get precise width.
        // However, since we need &mut self for font_system, we fall back to
        // heuristic for the trait interface (the actual rendering uses Buffer directly).
        takumi_core::unicode::estimated_string_em_width(text)
    }
}
