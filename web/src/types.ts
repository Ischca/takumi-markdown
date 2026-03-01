/**
 * TypeScript types for the LayoutTree produced by takumi-wasm.
 *
 * These mirror the Rust serde output from takumi-layout/src/tree.rs.
 */

export interface LayoutTree {
  root: LayoutNode[];
  base_font_size_px: number;
  max_width_px: number;
  frontmatter: string | null;
}

export type LayoutNode =
  | HeadingNode
  | ParagraphNode
  | BlockQuoteNode
  | CodeBlockNode
  | ListNode
  | TableNode
  | ThematicBreakNode
  | HtmlBlockNode;

export interface HeadingNode {
  type: "Heading";
  level: number;
  children: LayoutInline[];
}

export interface ParagraphNode {
  type: "Paragraph";
  children: LayoutInline[];
}

export interface BlockQuoteNode {
  type: "BlockQuote";
  children: LayoutNode[];
}

export interface CodeBlockNode {
  type: "CodeBlock";
  language: string | null;
  code: string;
}

export interface ListNode {
  type: "List";
  ordered: boolean;
  start: number;
  items: LayoutListItem[];
}

export interface TableNode {
  type: "Table";
  alignments: LayoutAlignment[];
  head: LayoutInline[][];
  rows: LayoutInline[][][];
}

export interface ThematicBreakNode {
  type: "ThematicBreak";
}

export interface HtmlBlockNode {
  type: "HtmlBlock";
  html: string;
}

export interface LayoutListItem {
  checked: boolean | null;
  children: LayoutNode[];
}

export type LayoutInline =
  | TextInline
  | StrongInline
  | EmphasisInline
  | StrikethroughInline
  | CodeInline
  | LinkInline
  | ImageInline
  | RubyInline
  | LineBreakInline
  | HtmlInlineNode;

export interface TextInline {
  type: "Text";
  text: string;
}

export interface StrongInline {
  type: "Strong";
  children: LayoutInline[];
}

export interface EmphasisInline {
  type: "Emphasis";
  children: LayoutInline[];
}

export interface StrikethroughInline {
  type: "Strikethrough";
  children: LayoutInline[];
}

export interface CodeInline {
  type: "Code";
  code: string;
}

export interface LinkInline {
  type: "Link";
  url: string;
  children: LayoutInline[];
}

export interface ImageInline {
  type: "Image";
  url: string;
  alt: string;
}

export interface RubyInline {
  type: "Ruby";
  base: string;
  annotation: string;
}

export interface LineBreakInline {
  type: "LineBreak";
}

export interface HtmlInlineNode {
  type: "HtmlInline";
  html: string;
}

export type LayoutAlignment = "None" | "Left" | "Center" | "Right";
