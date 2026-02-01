/**
 * Custom rehype-highlight plugin with language subset
 * Uses lowlight core to minimize bundle size
 */

import { createLowlight } from 'lowlight';
import { visit } from 'unist-util-visit';
import type { Root, Element, ElementContent } from 'hast';

// Import only common languages to reduce bundle size
// Full highlight.js: ~700KB → Subset: ~80KB
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml'; // HTML, XML
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';
import plaintext from 'highlight.js/lib/languages/plaintext';

// Create lowlight instance with only selected languages
const lowlight = createLowlight({
    javascript,
    typescript,
    python,
    json,
    xml,
    css,
    bash,
    shell,
    go,
    rust,
    yaml,
    sql,
    markdown,
    diff,
    plaintext,
});

// Register language aliases
lowlight.registerAlias('javascript', ['js', 'jsx']);
lowlight.registerAlias('typescript', ['ts', 'tsx']);
lowlight.registerAlias('python', ['py']);
lowlight.registerAlias('xml', ['html', 'htm', 'svg']);
lowlight.registerAlias('bash', ['sh', 'zsh']);
lowlight.registerAlias('go', ['golang']);
lowlight.registerAlias('rust', ['rs']);
lowlight.registerAlias('yaml', ['yml']);
lowlight.registerAlias('markdown', ['md']);
lowlight.registerAlias('diff', ['patch']);
lowlight.registerAlias('plaintext', ['text', 'txt']);

interface Options {
    prefix?: string;
    ignoreMissing?: boolean;
}

/**
 * Check if highlighting is disabled via no-highlight/nohighlight class
 */
function isHighlightDisabled(node: Element): boolean {
    const className = node.properties?.className;
    if (!Array.isArray(className)) return false;

    for (const name of className) {
        if (typeof name === 'string') {
            const lower = name.toLowerCase();
            if (lower === 'no-highlight' || lower === 'nohighlight') {
                return true;
            }
        }
    }
    return false;
}

/**
 * Get the programming language from a code element
 * Supports both 'language-' and 'lang-' prefixes
 */
function getLanguage(node: Element): string | undefined {
    const className = node.properties?.className;
    if (!Array.isArray(className)) return undefined;

    for (const name of className) {
        if (typeof name === 'string') {
            // Support 'language-xxx' prefix
            if (name.startsWith('language-')) {
                return name.slice(9);
            }
            // Support 'lang-xxx' prefix
            if (name.startsWith('lang-')) {
                return name.slice(5);
            }
        }
    }
    return undefined;
}

/**
 * Custom rehype-highlight plugin
 */
export default function rehypeHighlightCustom(options: Options = {}) {
    const { prefix = 'hljs-', ignoreMissing = true } = options;

    return (tree: Root) => {
        visit(tree, 'element', (node: Element, _index, parent) => {
            // Find <code> elements inside <pre>
            if (
                node.tagName !== 'code' ||
                !parent ||
                (parent as Element).tagName !== 'pre'
            ) {
                return;
            }

            // Skip if highlighting is explicitly disabled
            if (isHighlightDisabled(node)) return;

            const language = getLanguage(node);
            if (!language) return;

            // Check if language is registered
            if (!lowlight.registered(language)) {
                if (ignoreMissing) return;
                throw new Error(`Unknown language: ${language}`);
            }

            // Get text content
            const textContent = getTextContent(node);
            if (!textContent) return;

            try {
                // Highlight the code
                const result = lowlight.highlight(language, textContent, { prefix });

                // Replace children with highlighted content
                node.children = result.children as ElementContent[];

                // Add hljs class
                const className = node.properties?.className;
                if (Array.isArray(className)) {
                    if (!className.includes('hljs')) {
                        className.unshift('hljs');
                    }
                } else {
                    node.properties = node.properties || {};
                    node.properties.className = ['hljs', `language-${language}`];
                }
            } catch {
                // Silently ignore highlighting errors
            }
        });
    };
}

/**
 * Extract text content from a node
 */
function getTextContent(node: Element): string {
    let text = '';

    function extract(children: ElementContent[]) {
        for (const child of children) {
            if (child.type === 'text') {
                text += child.value;
            } else if (child.type === 'element' && child.children) {
                extract(child.children);
            }
        }
    }

    extract(node.children);
    return text;
}
