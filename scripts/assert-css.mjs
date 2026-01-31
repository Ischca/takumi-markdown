import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.resolve('dist', 'takumi-markdown.css');

if (!fs.existsSync(cssPath)) {
    throw new Error(`CSS output missing: ${cssPath}`);
}

const css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('.hljs') || !css.includes('.markdown-body')) {
    throw new Error('CSS output missing expected selectors');
}

console.log('CSS OK');
