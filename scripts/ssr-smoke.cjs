const React = require('react');
const { renderToString } = require('react-dom/server');
const { MarkdownRenderer } = require('../dist/takumi-markdown.cjs');

const html = renderToString(
    React.createElement(MarkdownRenderer, { content: '# SSR Test\n\n`code`' })
);

if (!html.includes('markdown-body')) {
    throw new Error('SSR CJS render failed: missing markdown-body');
}

console.log('SSR CJS OK');
