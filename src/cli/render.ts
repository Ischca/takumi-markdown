/**
 * MDAST (Markdown AST) to terminal string renderer.
 *
 * Converts a unified/remark MDAST tree to beautifully formatted terminal
 * output with ANSI colors, CJK-aware text wrapping, and Japanese
 * typography considerations.
 */

import type { Root, Content, Heading, Paragraph, Text, Emphasis, Strong, InlineCode, Code, Link, Image, List, ListItem, Blockquote, ThematicBreak, Table, TableRow, TableCell, Delete, Html, Definition } from 'mdast'
import * as ansi from './ansi.js'
import { wrapText, stringWidth, padEnd } from './width.js'
import { highlightCode } from './highlight.js'

export interface RenderOptions {
  /** Terminal column width. Default: auto-detect or 80. */
  width?: number
}

type MdastNode = Root | Content

/**
 * Render an MDAST tree to a terminal string.
 */
export function renderToTerminal(tree: Root, options: RenderOptions = {}): string {
  const width = options.width ?? getTerminalWidth()
  // Cap content width for readability (similar to web version's max-width: 38em)
  const contentWidth = Math.min(width, 88)
  const ctx: RenderContext = { width: contentWidth, indent: 0, ordered: false, listIndex: 0 }
  return renderNode(tree, ctx).trimEnd() + '\n'
}

interface RenderContext {
  width: number
  indent: number
  ordered: boolean
  listIndex: number
}

function getTerminalWidth(): number {
  if (typeof process !== 'undefined' && process.stdout?.columns) {
    return process.stdout.columns
  }
  return 80
}

// Heading colors by depth
const HEADING_STYLE: Array<(s: string) => string> = [
  (s) => ansi.bold(ansi.brightCyan(s)),     // h1
  (s) => ansi.bold(ansi.brightBlue(s)),     // h2
  (s) => ansi.bold(ansi.brightMagenta(s)),  // h3
  (s) => ansi.bold(ansi.yellow(s)),         // h4
  (s) => ansi.bold(ansi.green(s)),          // h5
  (s) => ansi.bold(s),                       // h6
]

function renderNode(node: MdastNode, ctx: RenderContext): string {
  switch (node.type) {
    case 'root':           return renderRoot(node as Root, ctx)
    case 'heading':        return renderHeading(node as Heading, ctx)
    case 'paragraph':      return renderParagraph(node as Paragraph, ctx)
    case 'text':           return (node as Text).value
    case 'emphasis':       return renderEmphasis(node as Emphasis, ctx)
    case 'strong':         return renderStrong(node as Strong, ctx)
    case 'delete':         return renderDelete(node as Delete, ctx)
    case 'inlineCode':     return renderInlineCode(node as InlineCode)
    case 'code':           return renderCode(node as Code, ctx)
    case 'link':           return renderLink(node as Link, ctx)
    case 'image':          return renderImage(node as Image)
    case 'list':           return renderList(node as List, ctx)
    case 'listItem':       return renderListItem(node as ListItem, ctx)
    case 'blockquote':     return renderBlockquote(node as Blockquote, ctx)
    case 'thematicBreak':  return renderThematicBreak(node as ThematicBreak, ctx)
    case 'table':          return renderTable(node as Table, ctx)
    case 'html':           return renderHtml(node as Html)
    case 'break':          return '\n'
    case 'definition':     return renderDefinition(node as Definition)
    default:               return renderFallback(node, ctx)
  }
}

function renderRoot(node: Root, ctx: RenderContext): string {
  return renderChildren(node.children as Content[], ctx, '\n\n')
}

function renderChildren(children: Content[], ctx: RenderContext, separator = ''): string {
  return children.map(child => renderNode(child, ctx)).join(separator)
}

// --- Block elements ---

function renderHeading(node: Heading, ctx: RenderContext): string {
  const depth = Math.min(node.depth, 6)
  const style = HEADING_STYLE[depth - 1] ?? HEADING_STYLE[5]!
  const text = renderInlineChildren(node.children as Content[], ctx)
  const prefix = '#'.repeat(depth) + ' '

  const styledText = style(prefix + text)
  const availWidth = ctx.width - ctx.indent

  // Add underline for h1 and h2
  if (depth <= 2) {
    const lineChar = depth === 1 ? '━' : '─'
    const lineWidth = Math.min(stringWidth(prefix + text), availWidth)
    const line = lineChar.repeat(lineWidth)
    return styledText + '\n' + style(line)
  }

  return styledText
}

function renderParagraph(node: Paragraph, ctx: RenderContext): string {
  const text = renderInlineChildren(node.children as Content[], ctx)
  const availWidth = ctx.width - ctx.indent
  const lines = wrapText(text, availWidth)
  const indent = ' '.repeat(ctx.indent)
  return lines.map(l => indent + l).join('\n')
}

function renderCode(node: Code, ctx: RenderContext): string {
  const lang = node.lang ?? ''
  const code = node.value
  const highlighted = highlightCode(code, lang)

  const lines = highlighted.split('\n')
  const availWidth = ctx.width - ctx.indent - 4  // 4 = "│ " prefix + " │" suffix
  const indent = ' '.repeat(ctx.indent)

  // Header line with language label
  const header = lang
    ? `${indent}╭─ ${ansi.dim(lang)} ${'─'.repeat(Math.max(0, availWidth - stringWidth(lang) - 2))}╮`
    : `${indent}╭${'─'.repeat(availWidth + 2)}╮`

  const footer = `${indent}╰${'─'.repeat(availWidth + 2)}╯`

  const codeLines = lines.map(line => {
    const padded = padEnd(line, availWidth)
    return `${indent}│ ${padded} │`
  })

  return [header, ...codeLines, footer].join('\n')
}

function renderBlockquote(node: Blockquote, ctx: RenderContext): string {
  const innerCtx = { ...ctx, width: ctx.width - 2, indent: 0 }
  const content = renderChildren(node.children as Content[], innerCtx, '\n\n')
  const lines = content.split('\n')
  const indent = ' '.repeat(ctx.indent)
  const bar = ansi.dim('│')
  return lines.map(l => `${indent}${bar} ${l}`).join('\n')
}

function renderList(node: List, ctx: RenderContext): string {
  const items = node.children as ListItem[]
  return items.map((item, i) => {
    const childCtx: RenderContext = {
      ...ctx,
      ordered: !!node.ordered,
      listIndex: (node.start ?? 1) + i,
    }
    return renderListItem(item, childCtx)
  }).join('\n')
}

function renderListItem(node: ListItem, ctx: RenderContext): string {
  const indent = ' '.repeat(ctx.indent)
  const marker = ctx.ordered
    ? ansi.dim(`${ctx.listIndex}.`) + ' '
    : ansi.dim('•') + ' '
  const markerWidth = ctx.ordered ? `${ctx.listIndex}. `.length : 2

  const innerCtx: RenderContext = {
    ...ctx,
    indent: ctx.indent + markerWidth,
  }

  // Render children (paragraphs, nested lists, etc.)
  const parts: string[] = []
  const children = node.children as Content[]

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    if (child.type === 'paragraph') {
      const text = renderInlineChildren((child as Paragraph).children as Content[], innerCtx)
      const availWidth = ctx.width - ctx.indent - markerWidth
      const lines = wrapText(text, availWidth)
      if (i === 0) {
        // First paragraph: attach marker
        parts.push(indent + marker + (lines[0] ?? ''))
        for (let j = 1; j < lines.length; j++) {
          parts.push(' '.repeat(ctx.indent + markerWidth) + lines[j])
        }
      } else {
        // Subsequent paragraphs: indented
        for (const line of lines) {
          parts.push(' '.repeat(ctx.indent + markerWidth) + line)
        }
      }
    } else if (child.type === 'list') {
      parts.push(renderNode(child, innerCtx))
    } else {
      const rendered = renderNode(child, innerCtx)
      if (i === 0) {
        parts.push(indent + marker + rendered.trimStart())
      } else {
        parts.push(rendered)
      }
    }
  }

  return parts.join('\n')
}

function renderThematicBreak(_node: ThematicBreak, ctx: RenderContext): string {
  const indent = ' '.repeat(ctx.indent)
  const lineWidth = ctx.width - ctx.indent
  return indent + ansi.dim('─'.repeat(lineWidth))
}

function renderTable(node: Table, ctx: RenderContext): string {
  const rows = node.children as TableRow[]
  if (rows.length === 0) return ''

  // Calculate column widths
  const colWidths: number[] = []
  for (const row of rows) {
    const cells = row.children as TableCell[]
    for (let i = 0; i < cells.length; i++) {
      const text = renderInlineChildren(cells[i]!.children as Content[], ctx)
      const w = stringWidth(text)
      colWidths[i] = Math.max(colWidths[i] ?? 0, w)
    }
  }

  // Cap column widths to available space
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + colWidths.length * 3 + 1
  if (totalWidth > ctx.width - ctx.indent) {
    const excess = totalWidth - (ctx.width - ctx.indent)
    const maxCol = colWidths.indexOf(Math.max(...colWidths))
    colWidths[maxCol] = Math.max(4, (colWidths[maxCol] ?? 4) - excess)
  }

  const indent = ' '.repeat(ctx.indent)
  const lines: string[] = []

  // Top border
  const topBorder = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐'
  lines.push(indent + ansi.dim(topBorder))

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r]!.children as TableCell[]
    const cellTexts = cells.map((cell, i) => {
      const text = renderInlineChildren(cell.children as Content[], ctx)
      return padEnd(text, colWidths[i] ?? 0)
    })

    const rowLine = ansi.dim('│') + cellTexts.map((t, i) => ` ${padEnd(t, colWidths[i] ?? 0)} `).join(ansi.dim('│')) + ansi.dim('│')
    lines.push(indent + rowLine)

    // After header row, add separator
    if (r === 0) {
      const sep = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤'
      lines.push(indent + ansi.dim(sep))
    }
  }

  // Bottom border
  const bottomBorder = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘'
  lines.push(indent + ansi.dim(bottomBorder))

  return lines.join('\n')
}

function renderDefinition(node: Definition): string {
  // Link definitions are reference targets, typically not rendered
  return ansi.dim(`[${node.identifier}]: ${node.url}`)
}

// --- Inline elements ---

function renderInlineChildren(children: Content[], ctx: RenderContext): string {
  return children.map(child => renderNode(child, ctx)).join('')
}

function renderEmphasis(node: Emphasis, ctx: RenderContext): string {
  return ansi.italic(renderInlineChildren(node.children as Content[], ctx))
}

function renderStrong(node: Strong, ctx: RenderContext): string {
  return ansi.bold(renderInlineChildren(node.children as Content[], ctx))
}

function renderDelete(node: Delete, ctx: RenderContext): string {
  return ansi.strikethrough(renderInlineChildren(node.children as Content[], ctx))
}

function renderInlineCode(node: InlineCode): string {
  return ansi.inverse(` ${node.value} `)
}

function renderLink(node: Link, ctx: RenderContext): string {
  const text = renderInlineChildren(node.children as Content[], ctx)
  const url = node.url
  // Use OSC 8 hyperlink if terminal supports it, with visible text + dim URL
  return `${ansi.underline(ansi.blue(text))} ${ansi.dim(`(${url})`)}`
}

function renderImage(node: Image): string {
  const alt = node.alt ?? 'image'
  return ansi.dim(`[${alt}]`)
}

// --- Special ---

function renderHtml(node: Html): string {
  const value = node.value

  // Handle ruby elements from remarkRuby plugin
  // <ruby>baseText<rt>rubyText</rt></ruby>
  const rubyMatch = value.match(/<ruby>(.+?)<rt>(.+?)<\/rt><\/ruby>/)
  if (rubyMatch) {
    const base = rubyMatch[1]
    const ruby = rubyMatch[2]
    return `${base}${ansi.dim(`(${ruby})`)}`
  }

  // Strip other HTML tags for terminal display
  const stripped = value.replace(/<[^>]*>/g, '').trim()
  if (stripped) return stripped

  return ''
}

function renderFallback(node: MdastNode, ctx: RenderContext): string {
  // For unknown node types, try to render children if they exist
  if ('children' in node && Array.isArray(node.children)) {
    return renderChildren(node.children as Content[], ctx, '')
  }
  if ('value' in node && typeof node.value === 'string') {
    return node.value
  }
  return ''
}
