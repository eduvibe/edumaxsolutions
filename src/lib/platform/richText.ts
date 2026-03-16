import type { RichTextContent } from "@/lib/platform/types";
 
type HtmlRichDoc = { type: "html"; html: string };

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeRichHtml(inputHtml: string): string {
  if (typeof window === "undefined") {
    return `<p>${escapeHtml(inputHtml)}</p>`;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(inputHtml, "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "EM", "U", "DIV", "SPAN", "B", "I"]);
  const root = doc.body;
  if (!root) {
    return `<p>${escapeHtml(inputHtml)}</p>`;
  }

  function unwrap(el: Element) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  }

  function clean(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toUpperCase();
      if (!allowed.has(tag)) {
        unwrap(el);
        return;
      }
      for (const attr of Array.from(el.attributes)) {
        el.removeAttribute(attr.name);
      }
    }
    for (const child of Array.from(node.childNodes)) clean(child);
  }

  for (const child of Array.from(root.childNodes)) clean(child);
  return root.innerHTML || "";
}

export function plainTextToRichDoc(text: string): RichTextContent {
  const lines = text.replace(/\r/g, "").split("\n");
  const html = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
  return { type: "html", html } as HtmlRichDoc as unknown as RichTextContent;
}

export function richDocToHtml(doc: RichTextContent): string {
  const d = doc as unknown as Partial<HtmlRichDoc>;
  if (d && d.type === "html" && typeof d.html === "string") {
    return sanitizeRichHtml(d.html);
  }
  const maybeText = (doc as unknown as { text?: unknown } | null)?.text;
  return `<p>${escapeHtml(String(maybeText ?? ""))}</p>`;
}
