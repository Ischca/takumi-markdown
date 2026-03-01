//! Ruby (furigana) notation processor.
//!
//! Supports three formats compatible with 小説家になろう / カクヨム:
//! - `｜親文字《ルビ》` (explicit delimiter with full-width pipe)
//! - `|親文字《ルビ》`  (explicit delimiter with half-width pipe)
//! - `漢字《かんじ》`    (auto-detect kanji)

use regex::Regex;
use std::sync::LazyLock;

use crate::ast::InlineNode;

/// Compiled regex for ruby notation.
///
/// Matches:
/// - Group 1: explicit delimiter text (after ｜ or |)
/// - Group 2: auto-detected CJK characters (Kanji etc.)
/// - Group 3: ruby annotation text (inside 《》)
static RUBY_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?:[｜|]([^《》]+)|([\x{4E00}-\x{9FFF}\x{3400}-\x{4DBF}\x{F900}-\x{FAFF}々〆〇]+))《([^》]+)》",
    )
    .expect("ruby regex must compile")
});

/// Process a text string and split it into text and ruby inline nodes.
///
/// Returns `None` if no ruby notation is found (the original text is unchanged).
pub fn process_ruby(text: &str) -> Option<Vec<InlineNode>> {
    let re = &*RUBY_PATTERN;
    if !re.is_match(text) {
        return None;
    }

    let mut parts = Vec::new();
    let mut last_end = 0;

    for cap in re.captures_iter(text) {
        let m = cap.get(0).unwrap();

        // Text before this match
        if m.start() > last_end {
            parts.push(InlineNode::Text {
                text: text[last_end..m.start()].to_string(),
            });
        }

        // Base text: either explicit (group 1) or auto-detect kanji (group 2)
        let base = cap
            .get(1)
            .or_else(|| cap.get(2))
            .unwrap()
            .as_str()
            .to_string();
        let annotation = cap.get(3).unwrap().as_str().to_string();

        parts.push(InlineNode::Ruby { base, annotation });

        last_end = m.end();
    }

    // Remaining text after the last match
    if last_end < text.len() {
        parts.push(InlineNode::Text {
            text: text[last_end..].to_string(),
        });
    }

    Some(parts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explicit_fullwidth_pipe() {
        let result = process_ruby("｜山田太郎《やまだたろう》").unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            InlineNode::Ruby { base, annotation } => {
                assert_eq!(base, "山田太郎");
                assert_eq!(annotation, "やまだたろう");
            }
            _ => panic!("expected Ruby node"),
        }
    }

    #[test]
    fn explicit_halfwidth_pipe() {
        let result = process_ruby("|東京《とうきょう》").unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            InlineNode::Ruby { base, annotation } => {
                assert_eq!(base, "東京");
                assert_eq!(annotation, "とうきょう");
            }
            _ => panic!("expected Ruby node"),
        }
    }

    #[test]
    fn auto_detect_kanji() {
        let result = process_ruby("漢字《かんじ》").unwrap();
        assert_eq!(result.len(), 1);
        match &result[0] {
            InlineNode::Ruby { base, annotation } => {
                assert_eq!(base, "漢字");
                assert_eq!(annotation, "かんじ");
            }
            _ => panic!("expected Ruby node"),
        }
    }

    #[test]
    fn mixed_text_and_ruby() {
        let result = process_ruby("これは漢字《かんじ》です").unwrap();
        assert_eq!(result.len(), 3);
        match &result[0] {
            InlineNode::Text { text } => assert_eq!(text, "これは"),
            _ => panic!("expected Text"),
        }
        match &result[1] {
            InlineNode::Ruby { base, annotation } => {
                assert_eq!(base, "漢字");
                assert_eq!(annotation, "かんじ");
            }
            _ => panic!("expected Ruby"),
        }
        match &result[2] {
            InlineNode::Text { text } => assert_eq!(text, "です"),
            _ => panic!("expected Text"),
        }
    }

    #[test]
    fn no_ruby() {
        assert!(process_ruby("plain text").is_none());
        assert!(process_ruby("ひらがなonly").is_none());
    }

    #[test]
    fn multiple_rubies() {
        let result = process_ruby("｜東京《とうきょう》と｜大阪《おおさか》").unwrap();
        assert_eq!(result.len(), 3); // Ruby, Text("と"), Ruby
    }
}
