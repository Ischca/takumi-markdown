# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Takumi Markdown is a React component library for rendering Markdown with Japanese typography optimization. The philosophy is **"beautiful readability through subtraction"** - focusing on the reading experience rather than feature accumulation.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (demo page)

# Build
npm run build:lib    # Build library for npm (ESM + CJS + CSS + types)
npm run build        # Build demo site for GitHub Pages

# Test
npm run test:ssr     # SSR smoke test (ESM, CJS, CSS verification)

# Lint
npm run lint         # ESLint

# Deploy
npm run deploy       # Deploy demo to GitHub Pages
```

## Architecture

```
src/
├── lib/
│   ├── index.ts         # Library entry point (exports MarkdownRenderer, remarkRuby)
│   └── styles.css       # Typography CSS (copied to dist as takumi-markdown.css)
├── components/
│   └── MarkdownRenderer.tsx   # Main React component
├── plugins/
│   ├── remarkRuby.ts          # Remark plugin: ｜text《ruby》 → <ruby>
│   └── rehypeHighlightCustom.ts # Custom rehype-highlight with language subset
├── App.tsx              # Demo page (not included in library build)
└── main.tsx             # Demo entry point
```

### Build Outputs

- `dist/takumi-markdown.mjs` - ESM bundle
- `dist/takumi-markdown.cjs` - CJS bundle
- `dist/takumi-markdown.css` - Styles (copied from src/lib/styles.css)
- `dist/lib/index.d.ts` - TypeScript declarations

### Key Design Decisions

**Font Stack**: Manrope (Latin-only) + BIZ UDPGothic (Japanese fallback). Manrope has no Japanese glyphs, so browsers automatically fall back to BIZ UDPGothic for CJK characters.

**Syntax Highlighting**: Custom `rehypeHighlightCustom` plugin uses `lowlight` core with 15 languages only (js, ts, python, go, rust, etc.) to reduce bundle size. Full highlight.js would add ~600KB.

**Typography CSS**: Implements vertical rhythm (`--rhythm: 1.75rem`), Japanese line-breaking (`line-break: strict`), punctuation optimization (`font-feature-settings: "palt", "halt"`), and fluid typography (`clamp()`).

## Design Philosophy

From team discussion: The goal is not "better than Word" but "what reading experience is only possible on the Web." Prioritize:
- Line length optimization (25-40 chars for Japanese)
- Static, predictable layout (no dynamic UI elements)
- Default beauty (no configuration needed)
- Accessibility (contrast, dark mode ready)

Avoid: progress bars, theme toggles, customization options, visual decorations.
