"use client";

import { diffWords } from "@/lib/platform/diff";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function DiffViewer({ oldText, newText, className }: { oldText: string; newText: string; className?: string }) {
  const tokens = diffWords(oldText, newText);
  const html = tokens
    .map((t) => {
      const safe = escapeHtml(t.text);
      if (t.type === "equal") return safe;
      if (t.type === "insert") return `<ins class="bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 no-underline">${safe}</ins>`;
      return `<del class="bg-rose-500/15 text-rose-900 dark:text-rose-200">${safe}</del>`;
    })
    .join("");

  return (
    <div
      className={[
        "rounded-2xl border border-black/10 bg-white/10 p-4 text-sm text-black/80 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/80",
        className ?? "",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

