/**
 * Takumi Markdown - Web API
 *
 * Framework-agnostic Markdown renderer powered by Rust/WASM core.
 *
 * @example
 * ```typescript
 * import { renderMarkdown } from 'takumi-markdown';
 *
 * const el = document.getElementById('content')!;
 * await renderMarkdown(el, '# Hello World\n\n漢字《かんじ》のテスト');
 * ```
 */

import init, { render as wasmRender } from "../pkg/takumi_wasm.js";
import { buildDOM } from "./renderer.js";
import type { LayoutTree } from "./types.js";

export type { LayoutTree } from "./types.js";
export type {
  LayoutNode,
  LayoutInline,
  LayoutListItem,
  LayoutAlignment,
} from "./types.js";

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Ensure WASM module is initialized. Safe to call multiple times.
 */
async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = init().then(() => {
      initialized = true;
    });
  }
  await initPromise;
}

export interface RenderOptions {
  /** Override viewport width (default: window.innerWidth). */
  viewportWidth?: number;
}

/**
 * Render Markdown into a target DOM element.
 *
 * This is the primary API. It initializes WASM on first call,
 * parses Markdown in Rust, and builds DOM nodes from the result.
 *
 * @param target - The element to render into (will be cleared)
 * @param markdown - Raw Markdown text
 * @param options - Optional rendering options
 */
export async function renderMarkdown(
  target: HTMLElement,
  markdown: string,
  options?: RenderOptions
): Promise<void> {
  await ensureInit();

  const viewportWidth =
    options?.viewportWidth ??
    (typeof window !== "undefined" ? window.innerWidth : 1024);

  const tree = wasmRender(markdown, viewportWidth) as unknown as LayoutTree;

  target.innerHTML = "";
  target.classList.add("markdown-body");
  target.appendChild(buildDOM(tree));
}

/**
 * Parse Markdown and return the raw LayoutTree (for advanced use cases).
 *
 * @param markdown - Raw Markdown text
 * @param viewportWidth - Viewport width in pixels
 * @returns LayoutTree object
 */
export async function parseMarkdown(
  markdown: string,
  viewportWidth: number = 1024
): Promise<LayoutTree> {
  await ensureInit();
  return wasmRender(markdown, viewportWidth) as unknown as LayoutTree;
}
