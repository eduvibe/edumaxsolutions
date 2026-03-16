"use client";

import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline } from "lucide-react";
import { useCallback } from "react";

type EditableEl = HTMLInputElement | HTMLTextAreaElement;

function wrapSelection(el: EditableEl, left: string, right: string) {
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const value = el.value ?? "";
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  const next = `${before}${left}${selected}${right}${after}`;
  el.value = next;
  const cursorStart = start + left.length;
  const cursorEnd = cursorStart + selected.length;
  el.setSelectionRange(cursorStart, cursorEnd);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
}

export function InlineFormatToolbar({
  getEl,
}: {
  getEl: () => EditableEl | null;
}) {
  const apply = useCallback(
    (kind: "bold" | "italic" | "underline") => {
      const el = getEl();
      if (!el) return;
      if (kind === "bold") wrapSelection(el, "**", "**");
      if (kind === "italic") wrapSelection(el, "*", "*");
      if (kind === "underline") wrapSelection(el, "__", "__");
    },
    [getEl]
  );

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="secondary"
        className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
        onClick={() => apply("bold")}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
        onClick={() => apply("italic")}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
        onClick={() => apply("underline")}
      >
        <Underline className="h-4 w-4" />
      </Button>
    </div>
  );
}

