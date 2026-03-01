/**
 * React wrapper for Takumi Markdown.
 *
 * Provides backward-compatible MarkdownRenderer component.
 *
 * @example
 * ```tsx
 * import { MarkdownRenderer } from 'takumi-markdown/react';
 *
 * function App() {
 *   return <MarkdownRenderer content="# Hello" />;
 * }
 * ```
 */

import { useRef, useEffect, createElement } from "react";
import { renderMarkdown } from "./index.js";
import type { RenderOptions } from "./index.js";

export interface MarkdownRendererProps {
  /** Markdown content to render. */
  content: string;
  /** Optional rendering options. */
  options?: RenderOptions;
  /** Optional CSS class name for the container. */
  className?: string;
}

/**
 * React component for rendering Markdown.
 *
 * Drop-in replacement for the v1 MarkdownRenderer.
 */
export function MarkdownRenderer({
  content,
  options,
  className,
}: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      renderMarkdown(ref.current, content, options);
    }
  }, [content, options]);

  return createElement("div", { ref, className });
}
