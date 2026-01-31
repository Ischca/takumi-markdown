# Takumi Markdown (匠)

[![npm version](https://img.shields.io/npm/v/takumi-markdown.svg)](https://www.npmjs.com/package/takumi-markdown)
[![npm downloads](https://img.shields.io/npm/dm/takumi-markdown.svg)](https://www.npmjs.com/package/takumi-markdown)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Beautiful Markdown renderer for React with Japanese typography optimization and ruby notation support.

<img src="./assets/preview.png" alt="Takumi Markdown Preview" width="600" />

## Features

- 🎨 **Beautiful Typography** - Optimized for Japanese (CJK) text
- 📝 **Ruby Notation** - Support for `｜親文字《ルビ》` syntax (小説家になろう/カクヨム style)
- 📋 **Frontmatter** - YAML frontmatter parsing and display
- ✨ **GFM Support** - Tables, checkboxes, and more
- 🎯 **Syntax Highlighting** - Code blocks with highlight.js

## Comparison

<img src="./assets/comparison.png" alt="Comparison with standard renderer" width="700" />

> Left: Standard Markdown (ruby syntax shown as raw text)  
> Right: Takumi Markdown (ruby rendered as furigana)

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
# タイトル

これは**美しい**マークダウンです。

｜山田太郎《やまだたろう》は旅に出た。
`;

  return <MarkdownRenderer content={markdown} />;
}
```

## Ruby Notation

Supports 小説家になろう / カクヨム style ruby (furigana) notation:

| Syntax | Result |
|--------|--------|
| `｜漢字《かんじ》` | <ruby>漢字<rt>かんじ</rt></ruby> |
| `漢字《かんじ》` | <ruby>漢字<rt>かんじ</rt></ruby> (auto-detect) |

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
