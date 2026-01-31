import React from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownRenderer } from '../dist/takumi-markdown.mjs';

const html = renderToString(
    React.createElement(MarkdownRenderer, { content: '# SSR Test\n\n`code`' })
);

if (!html.includes('markdown-body')) {
    throw new Error('SSR ESM render failed: missing markdown-body');
}

console.log('SSR ESM OK');
