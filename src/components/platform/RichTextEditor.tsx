"use client";

import { Button } from "@/components/ui/button";
import { richTextExtensions } from "@/lib/platform/richText";
import type { RichTextContent } from "@/lib/platform/types";
import { useEditor, EditorContent } from "@tiptap/react";
import { Bold, Italic, Underline } from "lucide-react";
import { useEffect, useMemo } from "react";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName,
}: {
  value: RichTextContent;
  onChange: (next: { json: RichTextContent; text: string }) => void;
  placeholder?: string;
  minHeightClassName?: string;
}) {
  const contentKey = useMemo(() => JSON.stringify(value ?? {}), [value]);
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value,
    editorProps: {
      attributes: {
        class: [
          "rounded-xl border border-black/10 bg-white/65 shadow-sm px-3 py-2 text-sm text-black outline-none",
          "dark:border-white/10 dark:bg-white/5 dark:text-white",
          "focus-visible:ring-0",
          minHeightClassName ?? "min-h-[140px]",
        ].join(" "),
      },
    },
    onUpdate({ editor }: { editor: { getJSON: () => unknown; getText: () => string } }) {
      onChange({ json: editor.getJSON() as RichTextContent, text: editor.getText() });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(value, false);
  }, [contentKey, editor, value]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-black/70 dark:text-white/70">{placeholder ?? ""}</div>
        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => {
              editor?.commands.focus?.();
              editor?.commands.toggleBold?.();
            }}
            disabled={!editor}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => {
              editor?.commands.focus?.();
              editor?.commands.toggleItalic?.();
            }}
            disabled={!editor}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => {
              editor?.commands.focus?.();
              editor?.commands.toggleUnderline?.();
            }}
            disabled={!editor}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
