//! CJK-aware character width and kinsoku (line-breaking) rules.
//!
//! Ported from `src/cli/width.ts`.

/// Check if a Unicode code point is full-width (occupies 2 columns in a monospace context).
///
/// Covers CJK Unified Ideographs, Hiragana, Katakana, Hangul, fullwidth forms, etc.
pub fn is_full_width(cp: u32) -> bool {
    matches!(cp,
        0x1100..=0x115F   | // Hangul Jamo
        0x2E80..=0x303E   | // CJK Radicals, Kangxi, Symbols & Punctuation
        0x3040..=0x309F   | // Hiragana
        0x30A0..=0x30FF   | // Katakana
        0x3100..=0x312F   | // Bopomofo
        0x3130..=0x318F   | // Hangul Compatibility Jamo
        0x3190..=0x31FF   | // Kanbun, CJK Strokes
        0x3200..=0x32FF   | // Enclosed CJK Letters
        0x3300..=0x33FF   | // CJK Compatibility
        0x3400..=0x4DBF   | // CJK Extension A
        0x4E00..=0x9FFF   | // CJK Unified Ideographs
        0xA000..=0xA4CF   | // Yi Syllables & Radicals
        0xAC00..=0xD7AF   | // Hangul Syllables
        0xF900..=0xFAFF   | // CJK Compatibility Ideographs
        0xFE10..=0xFE6F   | // CJK Compatibility Forms & Small Forms
        0xFF01..=0xFF60   | // Fullwidth ASCII & Punctuation
        0xFFE0..=0xFFE6   | // Fullwidth Signs
        0x20000..=0x2A6DF | // CJK Extension B
        0x2A700..=0x2CEAF | // CJK Extensions C-F
        0x2CEB0..=0x2EBEF | // CJK Extensions G-H
        0x30000..=0x3134F   // CJK Extension I
    )
}

/// Display width of a single character (0 for control chars, 2 for CJK, 1 otherwise).
pub fn char_width(cp: u32) -> usize {
    if cp < 0x20 {
        0
    } else if is_full_width(cp) {
        2
    } else {
        1
    }
}

/// Calculate the display width of a string (CJK = 2 columns, ASCII = 1).
pub fn string_width(s: &str) -> usize {
    s.chars().map(|c| char_width(c as u32)).sum()
}

/// Characters that must not appear at the start of a line (禁則: 行頭禁止).
///
/// Includes closing brackets, periods, commas, and other punctuation.
pub const NO_LINE_START: &[char] = &[
    '、', '。', '，', '．', '）', '】', '」', '』', '〉', '》', '〕', '｝', ')', ']', '.', '!',
    '?', ',', ';', ':', '！', '？', '。', '、', '；', '：',
];

/// Characters that must not appear at the end of a line (禁則: 行末禁止).
///
/// Includes opening brackets.
pub const NO_LINE_END: &[char] = &[
    '（', '【', '「', '『', '〈', '《', '〔', '｛', '(', '[',
];

/// Check if a character should not start a line.
pub fn is_no_line_start(c: char) -> bool {
    NO_LINE_START.contains(&c)
}

/// Check if a character should not end a line.
pub fn is_no_line_end(c: char) -> bool {
    NO_LINE_END.contains(&c)
}

/// Estimate the em-width of a character for layout purposes.
///
/// CJK characters are ~1em, ASCII characters are ~0.5em.
/// This is a heuristic for web layout where actual font metrics are unknown.
pub fn estimated_em_width(c: char) -> f64 {
    if is_full_width(c as u32) {
        1.0
    } else {
        0.5
    }
}

/// Estimate the em-width of a string.
pub fn estimated_string_em_width(s: &str) -> f64 {
    s.chars().map(estimated_em_width).sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ascii_width() {
        assert_eq!(char_width('a' as u32), 1);
        assert_eq!(char_width('Z' as u32), 1);
        assert_eq!(char_width('0' as u32), 1);
    }

    #[test]
    fn cjk_width() {
        assert_eq!(char_width('漢' as u32), 2);
        assert_eq!(char_width('字' as u32), 2);
        assert_eq!(char_width('あ' as u32), 2);
        assert_eq!(char_width('ア' as u32), 2);
    }

    #[test]
    fn string_width_mixed() {
        // "Hello" = 5, "世界" = 4
        assert_eq!(string_width("Hello世界"), 9);
    }

    #[test]
    fn kinsoku_rules() {
        assert!(is_no_line_start('。'));
        assert!(is_no_line_start('、'));
        assert!(is_no_line_start('）'));
        assert!(!is_no_line_start('（'));

        assert!(is_no_line_end('（'));
        assert!(is_no_line_end('「'));
        assert!(!is_no_line_end('」'));
    }

    #[test]
    fn estimated_widths() {
        assert!((estimated_em_width('a') - 0.5).abs() < f64::EPSILON);
        assert!((estimated_em_width('漢') - 1.0).abs() < f64::EPSILON);
        // "Hello" = 2.5em, "世界" = 2.0em
        assert!((estimated_string_em_width("Hello世界") - 4.5).abs() < f64::EPSILON);
    }
}
