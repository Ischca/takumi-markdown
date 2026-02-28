/**
 * CJK-aware string width calculation and text wrapping for terminal.
 *
 * In monospace terminals, CJK characters occupy 2 columns while ASCII
 * characters occupy 1 column. This module handles that properly.
 */

import { stripAnsi } from './ansi.js'

/**
 * Check if a Unicode code point is a full-width (2-column) character.
 * Covers CJK Unified Ideographs, Hiragana, Katakana, Hangul, fullwidth forms, etc.
 */
export function isFullWidth(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||   // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) ||   // CJK Radicals, Kangxi, Symbols & Punctuation
    (cp >= 0x3040 && cp <= 0x309f) ||   // Hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) ||   // Katakana
    (cp >= 0x3100 && cp <= 0x312f) ||   // Bopomofo
    (cp >= 0x3130 && cp <= 0x318f) ||   // Hangul Compatibility Jamo
    (cp >= 0x3190 && cp <= 0x31ff) ||   // Kanbun, CJK Strokes
    (cp >= 0x3200 && cp <= 0x32ff) ||   // Enclosed CJK Letters
    (cp >= 0x3300 && cp <= 0x33ff) ||   // CJK Compatibility
    (cp >= 0x3400 && cp <= 0x4dbf) ||   // CJK Extension A
    (cp >= 0x4e00 && cp <= 0x9fff) ||   // CJK Unified Ideographs
    (cp >= 0xa000 && cp <= 0xa4cf) ||   // Yi Syllables & Radicals
    (cp >= 0xac00 && cp <= 0xd7af) ||   // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) ||   // CJK Compatibility Ideographs
    (cp >= 0xfe10 && cp <= 0xfe6f) ||   // CJK Compatibility Forms & Small Forms
    (cp >= 0xff01 && cp <= 0xff60) ||   // Fullwidth ASCII & Punctuation
    (cp >= 0xffe0 && cp <= 0xffe6) ||   // Fullwidth Signs
    (cp >= 0x20000 && cp <= 0x2a6df) || // CJK Extension B
    (cp >= 0x2a700 && cp <= 0x2ceaf) || // CJK Extensions C-F
    (cp >= 0x2ceb0 && cp <= 0x2ebef) || // CJK Extensions G-H
    (cp >= 0x30000 && cp <= 0x3134f)    // CJK Extension I
  )
}

/**
 * Calculate the display width of a single character (code point).
 */
export function charWidth(cp: number): number {
  if (cp < 0x20) return 0  // control characters
  return isFullWidth(cp) ? 2 : 1
}

/**
 * Calculate the display width of a string, ignoring ANSI escape sequences.
 */
export function stringWidth(s: string): number {
  const clean = stripAnsi(s)
  let width = 0
  for (const ch of clean) {
    const cp = ch.codePointAt(0)
    if (cp !== undefined) width += charWidth(cp)
  }
  return width
}

// Characters that should not start a line (Japanese kinsoku: closing marks)
const NO_LINE_START = new Set(
  '、。，．）】」』〉》〕｝)].!?,;:！？。、；：'.split('')
)

// Characters that should not end a line (Japanese kinsoku: opening marks)
const NO_LINE_END = new Set(
  '（【「『〈《〔｛(['.split('')
)

/**
 * Wrap text to fit within the given column width.
 * Handles ANSI escape sequences and CJK double-width characters.
 * Respects basic Japanese kinsoku (line-breaking) rules.
 */
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [text]

  const lines: string[] = []
  // Split on existing newlines first
  const inputLines = text.split('\n')

  for (const inputLine of inputLines) {
    if (inputLine === '') {
      lines.push('')
      continue
    }

    let currentLine = ''
    let currentWidth = 0
    let inEscape = false
    let escapeSeq = ''

    const chars = [...inputLine]

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!

      // Handle ANSI escape sequences
      if (ch === '\x1b') {
        inEscape = true
        escapeSeq = ch
        continue
      }

      if (inEscape) {
        escapeSeq += ch
        if (ch === 'm') {
          inEscape = false
          currentLine += escapeSeq
          escapeSeq = ''
        }
        continue
      }

      const cp = ch.codePointAt(0)!
      const cw = charWidth(cp)

      // Would this character exceed the width?
      if (currentWidth + cw > width && currentLine !== '') {
        // Kinsoku: don't break if next char shouldn't start a line
        if (NO_LINE_START.has(ch) && currentWidth + cw <= width + 2) {
          currentLine += ch
          currentWidth += cw
          lines.push(currentLine)
          currentLine = ''
          currentWidth = 0
          continue
        }

        // Kinsoku: don't break if current last char shouldn't end a line
        const lastVisibleChar = getLastVisibleChar(currentLine)
        if (lastVisibleChar && NO_LINE_END.has(lastVisibleChar)) {
          currentLine += ch
          currentWidth += cw
          continue
        }

        // For ASCII text, try to break at the last space
        if (cw === 1 && ch !== ' ') {
          const lastSpace = currentLine.lastIndexOf(' ')
          if (lastSpace > 0) {
            const before = currentLine.slice(0, lastSpace)
            const after = currentLine.slice(lastSpace + 1)
            lines.push(before)
            currentLine = after + ch
            currentWidth = stringWidth(currentLine)
            continue
          }
        }

        lines.push(currentLine)
        currentLine = ''
        currentWidth = 0

        // Skip leading spaces on new line
        if (ch === ' ') continue
      }

      currentLine += ch
      currentWidth += cw
    }

    if (currentLine || inputLine === '') {
      lines.push(currentLine)
    }
  }

  return lines
}

/**
 * Get the last visible (non-ANSI) character from a string.
 */
function getLastVisibleChar(s: string): string | null {
  const clean = stripAnsi(s)
  if (clean.length === 0) return null
  const chars = [...clean]
  return chars[chars.length - 1] ?? null
}

/**
 * Pad a string to a given display width (right-padding with spaces).
 */
export function padEnd(s: string, targetWidth: number): string {
  const w = stringWidth(s)
  if (w >= targetWidth) return s
  return s + ' '.repeat(targetWidth - w)
}
