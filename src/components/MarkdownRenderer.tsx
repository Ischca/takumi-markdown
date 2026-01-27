import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import '../styles/typography.css'; // Will create this next
// Import a highlight.js theme
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    return (
        <div className="markdown-body">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Custom components can be added here if needed for further control
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
