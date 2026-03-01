/**
 * Terminal syntax highlighting using lowlight.
 * Converts lowlight HAST output to ANSI-colored terminal strings.
 * Reuses the same language subset as the web component.
 */

import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import shell from 'highlight.js/lib/languages/shell'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import yaml from 'highlight.js/lib/languages/yaml'
import sql from 'highlight.js/lib/languages/sql'
import markdownLang from 'highlight.js/lib/languages/markdown'
import diff from 'highlight.js/lib/languages/diff'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { colorEnabled } from './ansi.js'

const lowlight = createLowlight({
  javascript, typescript, python, json, xml, css,
  bash, shell, go, rust, yaml, sql,
  markdown: markdownLang, diff, plaintext,
})

lowlight.registerAlias('javascript', ['js', 'jsx'])
lowlight.registerAlias('typescript', ['ts', 'tsx'])
lowlight.registerAlias('python', ['py'])
lowlight.registerAlias('xml', ['html', 'htm', 'svg'])
lowlight.registerAlias('bash', ['sh', 'zsh'])
lowlight.registerAlias('go', ['golang'])
lowlight.registerAlias('rust', ['rs'])
lowlight.registerAlias('yaml', ['yml'])
lowlight.registerAlias('markdown', ['md'])
lowlight.registerAlias('diff', ['patch'])
lowlight.registerAlias('plaintext', ['text', 'txt'])

// Map hljs CSS scope names to ANSI escape codes
// Uses 256-color palette for richer highlighting
const SCOPE_COLORS: Record<string, string> = {
  'keyword':          '\x1b[38;5;134m', // purple
  'built_in':         '\x1b[38;5;37m',  // teal
  'type':             '\x1b[38;5;37m',  // teal
  'literal':          '\x1b[38;5;37m',  // teal
  'number':           '\x1b[38;5;173m', // orange
  'string':           '\x1b[38;5;71m',  // green
  'regexp':           '\x1b[38;5;173m', // orange
  'symbol':           '\x1b[38;5;173m', // orange
  'variable':         '\x1b[38;5;68m',  // blue
  'template-variable': '\x1b[38;5;68m', // blue
  'attr':             '\x1b[38;5;68m',  // blue
  'attribute':        '\x1b[38;5;68m',  // blue
  'params':           '\x1b[39m',       // default
  'comment':          '\x1b[38;5;243m', // gray
  'doctag':           '\x1b[38;5;243m', // gray
  'meta':             '\x1b[38;5;243m', // gray
  'title':            '\x1b[38;5;68m',  // blue
  'title.class_':     '\x1b[38;5;37m',  // teal
  'title.function_':  '\x1b[38;5;68m',  // blue
  'name':             '\x1b[38;5;68m',  // blue
  'tag':              '\x1b[38;5;134m', // purple
  'selector-tag':     '\x1b[38;5;134m', // purple
  'selector-class':   '\x1b[38;5;68m',  // blue
  'selector-id':      '\x1b[38;5;68m',  // blue
  'property':         '\x1b[38;5;68m',  // blue
  'function':         '\x1b[38;5;68m',  // blue
  'addition':         '\x1b[38;5;71m',  // green
  'deletion':         '\x1b[38;5;167m', // red
  'operator':         '\x1b[39m',       // default
  'punctuation':      '\x1b[39m',       // default
  'subst':            '\x1b[39m',       // default
  'section':          '\x1b[1;38;5;68m', // bold blue
  'bullet':           '\x1b[38;5;68m',  // blue
  'emphasis':         '\x1b[3m',        // italic
  'strong':           '\x1b[1m',        // bold
  'link':             '\x1b[4;38;5;68m', // underline blue
}

const RESET = '\x1b[0m'

interface HastNode {
  type: string
  value?: string
  children?: HastNode[]
  properties?: { className?: string[] }
}

/**
 * Convert a HAST tree (from lowlight) to an ANSI-colored string.
 */
function hastToAnsi(node: HastNode): string {
  if (!colorEnabled) {
    return hastToPlain(node)
  }

  if (node.type === 'text') {
    return node.value ?? ''
  }

  if (node.type === 'element' && node.children) {
    const classes = node.properties?.className ?? []
    // Find the hljs- prefixed class to get the scope
    let color = ''
    for (const cls of classes) {
      const scope = cls.replace(/^hljs-/, '')
      if (SCOPE_COLORS[scope]) {
        color = SCOPE_COLORS[scope]
        break
      }
    }

    const inner = node.children.map(hastToAnsi).join('')
    if (color) {
      return `${color}${inner}${RESET}`
    }
    return inner
  }

  if (node.children) {
    return node.children.map(hastToAnsi).join('')
  }

  return node.value ?? ''
}

function hastToPlain(node: HastNode): string {
  if (node.type === 'text') return node.value ?? ''
  if (node.children) return node.children.map(hastToPlain).join('')
  return node.value ?? ''
}

/**
 * Highlight code with ANSI colors for terminal output.
 * Returns the original code if the language is unknown.
 */
export function highlightCode(code: string, lang?: string): string {
  if (!lang) return code

  try {
    if (!lowlight.registered(lang)) return code
    const tree = lowlight.highlight(lang, code)
    return hastToAnsi(tree as unknown as HastNode)
  } catch {
    return code
  }
}
