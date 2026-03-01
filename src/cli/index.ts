/**
 * takumi-md - Beautiful Markdown rendering in the terminal
 *
 * Usage:
 *   takumi-md [file]              Render a Markdown file
 *   cat file.md | takumi-md       Render from stdin (pipe)
 *   takumi-md --width 60 file.md  Set output width
 *   takumi-md --help              Show help
 *
 * Supports Japanese typography: CJK-aware wrapping, ruby notation,
 * kinsoku shori (line-breaking rules), and beautiful readability.
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRuby from '../plugins/remarkRuby.js'
import { renderToTerminal } from './render.js'
import type { Root } from 'mdast'
import * as fs from 'node:fs'

interface CliOptions {
  file?: string
  width?: number
  help: boolean
}

function parseArgs(args: string[]): CliOptions {
  const opts: CliOptions = { help: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--help' || arg === '-h') {
      opts.help = true
    } else if (arg === '--width' || arg === '-w') {
      const next = args[++i]
      if (next) opts.width = parseInt(next, 10)
    } else if (arg.startsWith('--width=')) {
      opts.width = parseInt(arg.slice(8), 10)
    } else if (!arg.startsWith('-')) {
      opts.file = arg
    }
  }

  return opts
}

function showHelp(): void {
  const help = `
  takumi-md - Beautiful Markdown in the terminal

  Usage:
    takumi-md [options] [file]

  Options:
    -w, --width <n>   Set output width (default: terminal width, max 88)
    -h, --help        Show this help message

  Examples:
    takumi-md README.md                 Render a file
    cat doc.md | takumi-md              Pipe from stdin
    takumi-md -w 60 notes.md            Set width to 60 columns
    curl -s URL/readme.md | takumi-md   Render from URL

  Japanese Typography:
    Supports ruby notation: |漢字《かんじ》 → 漢字(かんじ)
    CJK-aware text wrapping with kinsoku shori (禁則処理)
`.trimStart()

  process.stdout.write(help)
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk: string) => { data += chunk })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.help) {
    showHelp()
    process.exit(0)
  }

  let input: string

  if (opts.file) {
    try {
      input = fs.readFileSync(opts.file, 'utf8')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(`Error: ${message}\n`)
      process.exit(1)
    }
  } else if (!process.stdin.isTTY) {
    input = await readStdin()
  } else {
    showHelp()
    process.exit(0)
  }

  // Parse markdown through unified pipeline with remark plugins
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRuby)

  const tree = processor.parse(input)
  const transformed = await processor.run(tree as Root)

  // Render to terminal
  const output = renderToTerminal(transformed as Root, { width: opts.width })
  process.stdout.write(output)
}

main().catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
