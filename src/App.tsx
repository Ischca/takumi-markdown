import { useState } from 'react';
import './App.css';
import { MarkdownRenderer } from './components/MarkdownRenderer';

const INITIAL_MARKDOWN = `---
title: Takumi Markdown
date: 2026-01-30
author: Sample Author
status: published
tags:
  - Typography
  - Markdown
  - Japanese
---

# Takumi Markdown

これは**最も美しいマークダウンレンダラー**です。
日本語の文章が読みやすく表示されるようにデザインされています。

## 特徴

- 洗練されたタイポグラフィ
- 日本語に最適化された行間と文字間
- クリアな階層構造

## ルビ記法テスト

｜山田太郎《やまだたろう》は｜彼女《ヒロイン》と出会った。

漢字《かんじ》の自動検出も可能です。

\`\`\`javascript
function hello() {
  console.log("Hello, Beautiful World!");
}
\`\`\`

> シンプルさは究極の洗練である。

| 機能 | 状態 |
|---|---|
| CJK対応 | ✅ |
| 美しさ | ✅ |
`;

function App() {
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);

  return (
    <div className="app-container">
      <div className="editor-pane">
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Type markdown here..."
        />
      </div>
      <div className="preview-pane">
        <MarkdownRenderer content={markdown} />
      </div>
    </div>
  );
}

export default App;
