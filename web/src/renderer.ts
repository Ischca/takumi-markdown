/**
 * LayoutTree → DOM renderer.
 *
 * Converts the serialized LayoutTree from WASM into real DOM nodes,
 * using CSS classes from the existing takumi-markdown stylesheet.
 */

import type {
  LayoutTree,
  LayoutNode,
  LayoutInline,
  LayoutListItem,
  LayoutAlignment,
} from "./types.js";

/**
 * Build a DOM subtree from a LayoutTree.
 */
export function buildDOM(tree: LayoutTree): DocumentFragment {
  const frag = document.createDocumentFragment();

  // Frontmatter
  if (tree.frontmatter) {
    frag.appendChild(buildFrontmatter(tree.frontmatter));
  }

  for (const node of tree.root) {
    frag.appendChild(buildBlockNode(node));
  }
  return frag;
}

function buildFrontmatter(fm: string): HTMLElement {
  const details = document.createElement("details");
  details.className = "frontmatter-block";

  const summary = document.createElement("summary");
  summary.textContent = "Frontmatter";
  details.appendChild(summary);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = fm;
  pre.appendChild(code);
  details.appendChild(pre);

  return details;
}

function buildBlockNode(node: LayoutNode): HTMLElement {
  switch (node.type) {
    case "Heading":
      return buildHeading(node.level, node.children);
    case "Paragraph":
      return buildParagraph(node.children);
    case "BlockQuote":
      return buildBlockQuote(node.children);
    case "CodeBlock":
      return buildCodeBlock(node.language, node.code);
    case "List":
      return buildList(node.ordered, node.start, node.items);
    case "Table":
      return buildTable(node.alignments, node.head, node.rows);
    case "ThematicBreak":
      return document.createElement("hr");
    case "HtmlBlock": {
      const div = document.createElement("div");
      div.innerHTML = node.html;
      return div;
    }
  }
}

function buildHeading(
  level: number,
  children: LayoutInline[]
): HTMLHeadingElement {
  const tag = `h${Math.min(Math.max(level, 1), 6)}` as
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6";
  const el = document.createElement(tag);
  appendInlines(el, children);
  return el;
}

function buildParagraph(children: LayoutInline[]): HTMLParagraphElement {
  const p = document.createElement("p");
  appendInlines(p, children);
  return p;
}

function buildBlockQuote(children: LayoutNode[]): HTMLQuoteElement {
  const bq = document.createElement("blockquote");
  for (const child of children) {
    bq.appendChild(buildBlockNode(child));
  }
  return bq;
}

function buildCodeBlock(language: string | null, code: string): HTMLElement {
  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");

  if (language) {
    codeEl.className = `language-${language}`;
  }
  codeEl.textContent = code;
  pre.appendChild(codeEl);

  // Syntax highlighting is handled by JS-side lowlight (delegated from WASM)
  // The consumer can apply highlighting after mounting.
  return pre;
}

function buildList(
  ordered: boolean,
  start: number,
  items: LayoutListItem[]
): HTMLElement {
  const el = ordered
    ? document.createElement("ol")
    : document.createElement("ul");

  if (ordered && start !== 1) {
    (el as HTMLOListElement).start = start;
  }

  let hasTask = false;
  for (const item of items) {
    const li = document.createElement("li");

    // Task list checkbox
    if (item.checked !== null) {
      hasTask = true;
      li.className = "task-list-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.checked;
      cb.disabled = true;
      li.appendChild(cb);

      // Inline the first paragraph's content to avoid line break after checkbox
      const firstChild = item.children[0];
      if (firstChild && firstChild.type === "Paragraph") {
        const span = document.createElement("span");
        appendInlines(span, firstChild.children);
        li.appendChild(span);
        for (let i = 1; i < item.children.length; i++) {
          li.appendChild(buildBlockNode(item.children[i]));
        }
      } else {
        for (const child of item.children) {
          li.appendChild(buildBlockNode(child));
        }
      }
    } else {
      for (const child of item.children) {
        li.appendChild(buildBlockNode(child));
      }
    }

    el.appendChild(li);
  }

  if (hasTask) {
    el.classList.add("contains-task-list");
  }

  return el;
}

function buildTable(
  alignments: LayoutAlignment[],
  head: LayoutInline[][],
  rows: LayoutInline[][][]
): HTMLTableElement {
  const table = document.createElement("table");

  // Header
  if (head.length > 0) {
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    for (let i = 0; i < head.length; i++) {
      const th = document.createElement("th");
      applyAlignment(th, alignments[i]);
      appendInlines(th, head[i]!);
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  // Body
  if (rows.length > 0) {
    const tbody = document.createElement("tbody");
    for (const row of rows) {
      const tr = document.createElement("tr");
      for (let i = 0; i < row.length; i++) {
        const td = document.createElement("td");
        applyAlignment(td, alignments[i]);
        appendInlines(td, row[i]!);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  return table;
}

function applyAlignment(
  el: HTMLElement,
  align: LayoutAlignment | undefined
): void {
  if (!align || align === "None") return;
  el.style.textAlign = align.toLowerCase();
}

// --- Inline rendering ---

function appendInlines(parent: HTMLElement, inlines: LayoutInline[]): void {
  for (const inline of inlines) {
    parent.appendChild(buildInline(inline));
  }
}

function buildInline(node: LayoutInline): Node {
  switch (node.type) {
    case "Text":
      return document.createTextNode(node.text);

    case "Strong": {
      const strong = document.createElement("strong");
      appendInlines(strong, node.children);
      return strong;
    }

    case "Emphasis": {
      const em = document.createElement("em");
      appendInlines(em, node.children);
      return em;
    }

    case "Strikethrough": {
      const del = document.createElement("del");
      appendInlines(del, node.children);
      return del;
    }

    case "Code": {
      const code = document.createElement("code");
      code.textContent = node.code;
      return code;
    }

    case "Link": {
      const a = document.createElement("a");
      a.href = node.url;
      appendInlines(a, node.children);
      return a;
    }

    case "Image": {
      const img = document.createElement("img");
      img.src = node.url;
      img.alt = node.alt;
      return img;
    }

    case "Ruby": {
      const ruby = document.createElement("ruby");
      ruby.appendChild(document.createTextNode(node.base));
      const rt = document.createElement("rt");
      rt.textContent = node.annotation;
      ruby.appendChild(rt);
      return ruby;
    }

    case "LineBreak":
      return document.createElement("br");

    case "HtmlInline": {
      const span = document.createElement("span");
      span.innerHTML = node.html;
      return span;
    }
  }
}
