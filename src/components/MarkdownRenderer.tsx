import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import '../styles/typography.css';
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
    content: string;
}

/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content: string): { frontmatter: string | null; body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { frontmatter: null, body: content };
    }

    return {
        frontmatter: match[1],
        body: content.slice(match[0].length)
    };
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const { frontmatter, body } = extractFrontmatter(content);

    return (
        <div className="markdown-body">
            {frontmatter && (
                <details className="frontmatter-block">
                    <summary>Frontmatter</summary>
                    <pre><code className="language-yaml">{frontmatter}</code></pre>
                </details>
            )}
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{}}
            >
                {body}
            </ReactMarkdown>
        </div>
    );
};
