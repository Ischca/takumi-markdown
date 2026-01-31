# Takumi Markdown (匠)

[![npm version](https://img.shields.io/npm/v/takumi-markdown.svg)](https://www.npmjs.com/package/takumi-markdown)
[![npm downloads](https://img.shields.io/npm/dm/takumi-markdown.svg)](https://www.npmjs.com/package/takumi-markdown)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Beautiful Markdown renderer for React with CJK typography optimization and ruby (furigana) notation support.

<img src="./assets/preview.png" alt="Takumi Markdown Preview" width="600" />

## Features

- 🎨 **Beautiful Typography** - Optimized for CJK (Chinese, Japanese, Korean) text
- 📝 **Ruby Notation** - Support for `｜text《ruby》` syntax (小説家になろう/カクヨム style)
- 📋 **Frontmatter** - YAML frontmatter parsing and display
- ✨ **GFM Support** - Tables, checkboxes, and more
- 🎯 **Syntax Highlighting** - Code blocks with highlight.js

## Comparison

<img src="./assets/comparison.png" alt="Comparison with standard renderer" width="700" />

> **Left**: Standard Markdown (ruby syntax shown as raw text)  
> **Right**: Takumi Markdown (ruby rendered as furigana)

## Installation

```bash
npm install takumi-markdown
```

## Usage

```tsx
import { MarkdownRenderer } from 'takumi-markdown';
import 'takumi-markdown/styles.css';

function App() {
  const markdown = `
# Hello World

This is a **beautiful** markdown renderer.

## Ruby Notation Example

The protagonist ｜山田太郎《Yamada Taro》 embarked on a journey.

Japanese text with furigana: 漢字《かんじ》
`;

  return <MarkdownRenderer content={markdown} />;
}
```

## Ruby Notation

Supports ruby (furigana) notation commonly used in Japanese web novels:

| Syntax | Description | Result |
|--------|-------------|--------|
| `｜text《ruby》` | Explicit delimiter | text with ruby above |
| `漢字《かんじ》` | Auto-detect kanji | 漢字 with かんじ above |

### Examples

```markdown
The word ｜hello《こんにちは》 means "hello" in Japanese.

Character names: ｜Alice《アリス》 and ｜Bob《ボブ》

Mixed content: Welcome to 東京《Tokyo》!
```

## API

### `<MarkdownRenderer />`

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Markdown content to render |

### `remarkRuby`

Remark plugin for ruby notation. Exported for advanced users who want to use it with their own react-markdown setup.

```tsx
import remarkRuby from 'takumi-markdown/remarkRuby';
```

## License

MIT
