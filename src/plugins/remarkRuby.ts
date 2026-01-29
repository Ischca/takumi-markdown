import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Parent } from 'mdast';

/**
 * Remark plugin to convert ruby notation to HTML ruby elements
 * 
 * Supports the following formats (compatible with 小説家になろう / カクヨム):
 * - ｜親文字《ルビ》 (explicit delimiter with full-width pipe)
 * - |親文字《ルビ》 (explicit delimiter with half-width pipe)
 * - 漢字《かんじ》 (auto-detect kanji)
 * 
 * @example
 * Input: ｜山田太郎《やまだたろう》
 * Output: <ruby>山田太郎<rt>やまだたろう</rt></ruby>
 */

const remarkRuby: Plugin<[], Root> = () => {
    return (tree) => {
        visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
            if (!parent || index === undefined) return;

            const text = node.value;

            // Combined pattern for ruby notation
            // Pattern 1: Explicit delimiter ｜ or | followed by text and 《ruby》
            // Pattern 2: Kanji auto-detect (kanji followed by 《ruby》)
            const combinedPattern = /(?:[｜|]([^《》]+)|([\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF々〆〇]+))《([^》]+)》/g;

            const parts: Array<Text | { type: 'html'; value: string }> = [];
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = combinedPattern.exec(text)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    parts.push({
                        type: 'text',
                        value: text.slice(lastIndex, match.index)
                    } as Text);
                }

                // Get the base text (either from explicit delimiter or kanji auto-detect)
                const baseText = match[1] || match[2];
                const rubyText = match[3];

                // Add ruby HTML node
                parts.push({
                    type: 'html',
                    value: `<ruby>${baseText}<rt>${rubyText}</rt></ruby>`
                });

                lastIndex = match.index + match[0].length;
            }

            // If no matches, leave node unchanged
            if (parts.length === 0) return;

            // Add remaining text after last match
            if (lastIndex < text.length) {
                parts.push({
                    type: 'text',
                    value: text.slice(lastIndex)
                } as Text);
            }

            // Replace current node with parts
            parent.children.splice(index, 1, ...parts as any);
        });
    };
};

export default remarkRuby;
