"use client";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInline(input: string) {
  let html = escapeHtml(input);
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([\s\S]+?)__/g, "<u>$1</u>");
  html = html.replace(/\*([\s\S]+?)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br />");
  return html;
}

export function FormattedText({ text, className }: { text: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
}

