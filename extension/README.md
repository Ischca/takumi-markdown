# Takumi Markdown (匠)

**"Takumi"** is a Markdown renderer crafted with meticulous attention to typography.
Like a master craftsman, it carefully selects and combines fonts to create the ultimate reading experience.

![Takumi Banner](https://placehold.co/800x200/fafafa/333?text=Takumi+Markdown)

## Features (The Craftsman's Recipe)

- **Japanese**: `BIZ UDPGothic` (Universal Design) - The warmth of humanist sans.
- **English**: `Manrope` (Modern Grotesque) - Functional, friendly, and clean.
- **Code**: `Fira Code` (Monospace) - Playful ligatures and high legibility.
- **Tuning**:
  - **Fluid Hybrid**: Automatic 0.15px stroke adjustment for high-DPI displays.
  - **Solid Spacing**: Aggressively tightened headings and margins for a professional density.
  - **Native Dark Mode**: Perfect harmony with VS Code themes.

## Usage

Just install and open any Markdown file preview (`Cmd+K V`).
No configuration needed.

## Fonts

This extension loads **Manrope**, **Fira Code**, and **BIZ UDPGothic** from Google Fonts.
Please ensure you have internet access.

## Changelog

### 1.4.0 (Takumi Release)
- **Rebranding**: Project renamed to **Takumi Markdown (匠マークダウン)**.
- The name "Takumi" (匠 = craftsman) represents this project's dedication to typographic precision and readability.

### 1.3.0
- Previous release as "Tsumugi Markdown".
- Combined all typography refinements (Manrope, Fira Code, Solid Spacing).
- Fixed top margin inconsistencies.

### 1.2.3
- Fix: **Top Margin Consistency**.
  - Forced `margin-top: 0` for the first element.
  - Ensures reliable spacing at the start of the document across all environments.

### 1.2.2
- Improvement: **Aggressive Heading Tightening**.
  - H1/H2: Line-height reduced to `1.15`, margins tightened to `1.5em`/`0.5em`.
  - Eliminates visual looseness in large typography.

### 1.2.1
- Improvement: **Tighter Vertical Rhythm**.
  - Reduced line-height (1.8 -> 1.65) for sharper body text.
  - Condensed headings (1.4 -> 1.25) and vertical margins for better density.

### 1.2.0
- Feature: **Modern Typography Overhaul**.
  - English: **Manrope** (Modern Grotesque, Functional & Friendly).
  - Code: **Fira Code** (Modern Monospace with Ligatures).

### 1.1.1
- Fix: Reverted code font to system default (removed BIZ UDGothic).
  - Respects user's editor font settings for code.

### 1.1.0
- Feature: Added **BIZ UDGothic** (Monospace) for code blocks.
  - Ensures typographic consistency between text (P Gothic) and code (Gothic).

### 1.0.3
- Fix: Native Dark Mode Support.
  - Light Mode: Pure Black text with Black Micro-Stroke.
  - Dark Mode: Pure White text with White Micro-Stroke.
  - Removed forced page backgrounds to respect editor themes.

### 1.0.2
- Fix: Robust Dark Mode support using media queries.

### 1.0.1
- Fix: Enhanced code block visualization in Dark Mode.

### 1.0.0
- Initial release with BIZ UDPGothic Hybrid Tuning.

## License

MIT
