"use client";

import type { RichTextContent } from "@/lib/platform/types";
import { richDocToHtml } from "@/lib/platform/richText";

export function RichTextRenderer({ doc, className }: { doc: RichTextContent; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: richDocToHtml(doc) }} />;
}

