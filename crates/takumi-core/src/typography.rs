//! Typography constants and calculations.
//!
//! Ported from the CSS variables in `src/lib/styles.css`.

/// Vertical rhythm base unit in rem.
pub const RHYTHM_REM: f64 = 1.75;

/// Base line height for body text.
pub const LINE_HEIGHT_BODY: f64 = 1.8;

/// Line height for headings (tighter).
pub const LINE_HEIGHT_HEADING: f64 = 1.3;

/// Maximum content width in em units.
/// Japanese optimal line length: 25-40 characters (35 ideal).
/// Since 1 CJK char ≈ 1em, 38em ≈ 38 characters.
pub const MAX_WIDTH_EM: f64 = 38.0;

/// Heading scale factors (Major Third modular scale).
pub const HEADING_SCALE: [f64; 6] = [
    2.441, // h1
    1.953, // h2
    1.563, // h3
    1.25,  // h4
    1.0,   // h5
    0.875, // h6
];

/// Letter spacing in em for body text.
pub const LETTER_SPACING_BODY: f64 = 0.02;

/// Letter spacing in em for headings.
pub const LETTER_SPACING_HEADING: f64 = 0.01;

/// Calculate fluid font size using clamp(15px, 1vw + 12px, 18px).
///
/// Returns the computed font size in pixels for a given viewport width.
pub fn fluid_font_size(viewport_width_px: f64) -> f64 {
    let preferred = viewport_width_px * 0.01 + 12.0;
    preferred.clamp(15.0, 18.0)
}

/// Calculate max content width in pixels for a given viewport.
pub fn max_content_width_px(viewport_width_px: f64) -> f64 {
    let font_size = fluid_font_size(viewport_width_px);
    let max_em = font_size * MAX_WIDTH_EM;
    let viewport_90 = viewport_width_px * 0.9;
    // clamp(320px, 90vw, 38em)
    viewport_90.clamp(320.0, max_em)
}

/// Get the heading font size scale factor for a given level (1-6).
pub fn heading_scale(level: u8) -> f64 {
    let idx = (level.saturating_sub(1) as usize).min(5);
    HEADING_SCALE[idx]
}

/// Calculate heading margin-top in rhythm units.
///
/// h1 has no top margin; all others get 2 × rhythm.
pub fn heading_margin_top(level: u8) -> f64 {
    if level == 1 {
        0.0
    } else {
        RHYTHM_REM * 2.0
    }
}

/// Calculate heading margin-bottom in rhythm units.
pub fn heading_margin_bottom() -> f64 {
    RHYTHM_REM
}

/// Paragraph margin-bottom in rem.
pub fn paragraph_margin_bottom() -> f64 {
    RHYTHM_REM
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fluid_font_size_clamp() {
        // Small viewport: clamps to 15px
        assert!((fluid_font_size(200.0) - 15.0).abs() < f64::EPSILON);

        // Large viewport: clamps to 18px
        assert!((fluid_font_size(2000.0) - 18.0).abs() < f64::EPSILON);

        // Middle: 1vw + 12 = 0.01 * 1000 + 12 = 22 → clamped to 18
        assert!((fluid_font_size(1000.0) - 18.0).abs() < f64::EPSILON);

        // 500px: 0.01 * 500 + 12 = 17
        assert!((fluid_font_size(500.0) - 17.0).abs() < f64::EPSILON);
    }

    #[test]
    fn heading_scales() {
        assert!((heading_scale(1) - 2.441).abs() < f64::EPSILON);
        assert!((heading_scale(2) - 1.953).abs() < f64::EPSILON);
        assert!((heading_scale(6) - 0.875).abs() < f64::EPSILON);
    }
}
