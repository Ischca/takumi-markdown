import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { renderMarkdown } from '../web/src/index';

const SAMPLE_DOC = `---
title: The Art of Documentation
date: 2026-01-30
author: Takumi
---

# Takumi Markdown

The **premium** markdown renderer, now powered by **Rust/WASM**.
Designed for the AI era, optimized for readability.

## Typography
- Optimized line-height
- CJK (Chinese, Japanese, Korean) support
- Beautiful vertical rhythm

## Ruby Support
｜Typography《タイポグラフィ》 matters.
We support both explicit \`｜text《ruby》\` syntax and auto-detection for Kanji.

> "Simplicity is the ultimate sophistication."
`;

const SAMPLE_CHAT = `Here is an explanation of **Takumi Markdown** with some code examples.

### Key Features

1. **Drop-in Replacement**: Works with existing apps — no React dependency required.
2. **Beautiful Defaults**: No configuration needed.
3. **Multilingual**: \`｜未来《ミライ》\` (Future) looks great.

\`\`\`typescript
import { renderMarkdown } from 'takumi-markdown';

const el = document.getElementById('content')!;
await renderMarkdown(el, '# Hello World');
\`\`\`

Is there anything else you would like to know?`;

/** Hook to render markdown into a ref'd element via WASM. */
function useMarkdownRenderer(markdown: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    renderMarkdown(ref.current, markdown).catch(console.error);
  }, [markdown]);

  return ref;
}

function App() {
  const [markdown, setMarkdown] = useState(SAMPLE_DOC);
  const [mode, setMode] = useState<'doc' | 'chat'>('doc');
  const [streaming, setStreaming] = useState(false);

  const previewRef = useMarkdownRenderer(markdown);

  // Switch content when mode changes
  useEffect(() => {
    setMarkdown(mode === 'doc' ? SAMPLE_DOC : SAMPLE_CHAT);
    setStreaming(false);
  }, [mode]);

  // Simulate streaming effect
  const handleSimulateStream = useCallback(() => {
    if (streaming) return;
    setStreaming(true);
    const targetText = mode === 'chat' ? SAMPLE_CHAT : SAMPLE_DOC;
    setMarkdown('');

    let i = 0;
    const interval = setInterval(() => {
      setMarkdown(targetText.slice(0, i));
      i += 5;
      if (i > targetText.length) {
        clearInterval(interval);
        setStreaming(false);
        setMarkdown(targetText);
      }
    }, 10);
  }, [streaming, mode]);

  return (
    <div className="app-container">
      {/* Header / Hero */}
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Takumi Markdown</h1>
          <p className="hero-subtitle">
            <strong>Reading is the bottleneck of the AI Era.</strong><br />
            Takumi transforms generated text into a beautiful reading experience.<br />
            Now powered by <strong>Rust/WASM</strong> — framework-agnostic, zero React dependency.
          </p>
          <div className="hero-actions">
            <a href="https://github.com/ischca/takumi-markdown" className="btn btn-primary">GitHub</a>
            <a href="https://www.npmjs.com/package/takumi-markdown" className="btn btn-secondary">npm</a>
          </div>
          <div className="install-block">
            <code>npm install takumi-markdown</code>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText('npm install takumi-markdown')}>Copy</button>
          </div>
        </div>
      </header>

      {/* Demo Section */}
      <section className="demo-section">
        <div className="demo-header">
          <h2>Interactive Demo</h2>
          <div className="demo-controls">
            <div className="toggle-group">
              <button
                className={`toggle-btn ${mode === 'doc' ? 'active' : ''}`}
                onClick={() => setMode('doc')}
              >
                Document Mode
              </button>
              <button
                className={`toggle-btn ${mode === 'chat' ? 'active' : ''}`}
                onClick={() => setMode('chat')}
              >
                AI Chat Mode
              </button>
            </div>
            <button className="simulate-btn" onClick={handleSimulateStream} disabled={streaming}>
              {streaming ? 'Streaming...' : 'Simulate Streaming'}
            </button>
          </div>
        </div>

        <div className={`demo-workspace ${mode}`}>
          <div className="editor-pane">
            <div className="pane-label">Input (Markdown)</div>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Type markdown here..."
              spellCheck={false}
            />
          </div>
          <div className="preview-pane-wrapper">
            <div className="pane-label">Preview (WASM Renderer)</div>
            <div className="preview-pane">
              {mode === 'chat' ? (
                <div className="chat-bubble ai">
                  <div className="avatar">AI</div>
                  <div className="bubble-content">
                    <div ref={previewRef} />
                  </div>
                </div>
              ) : (
                <div ref={previewRef} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="feature-card">
          <h3>Rust/WASM Core</h3>
          <p>Markdown parsing and layout in Rust, compiled to WASM. Framework-agnostic — works with React, Vue, Svelte, or vanilla JS.</p>
        </div>
        <div className="feature-card">
          <h3>CJK Optimization</h3>
          <p>Ruby (furigana) rendering, kinsoku line-breaking, and vertical rhythm. <code>｜漢字《かんじ》</code> syntax supported.</p>
        </div>
        <div className="feature-card">
          <h3>AI Ready</h3>
          <p>Stable rendering during token streaming. No layout shifts or broken formatting.</p>
        </div>
      </section>

      <footer className="app-footer">
        <p>&copy; 2026 Takumi Markdown. MIT License.</p>
      </footer>
    </div>
  );
}

export default App;
