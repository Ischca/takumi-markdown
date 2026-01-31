import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src', 'lib', 'styles.css');
const distDir = path.join(root, 'dist');
const dest = path.join(distDir, 'takumi-markdown.css');

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(src, dest);
