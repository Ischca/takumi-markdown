/**
 * Add shebang line to the CLI build output.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const file = 'dist-cli/takumi-md.mjs'
const content = readFileSync(file, 'utf8')

if (!content.startsWith('#!')) {
  writeFileSync(file, '#!/usr/bin/env node\n' + content)
}
