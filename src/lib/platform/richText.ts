import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { generateHTML } from "@tiptap/html";
import type { RichTextContent } from "@/lib/platform/types";
import type { Extension, JSONContent } from "@tiptap/core";

export const richTextExtensions: Extension[] = [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    horizontalRule: false,
  }),
  Underline,
];

export function plainTextToRichDoc(text: string): RichTextContent {
  const lines = text.replace(/\r/g, "").split("\n");
  const content = lines.map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  }));
  return { type: "doc", content } as RichTextContent;
}

export function richDocToHtml(doc: RichTextContent): string {
  return generateHTML(doc as JSONContent, richTextExtensions);
}
