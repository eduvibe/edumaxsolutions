"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { richDocToHtml, sanitizeRichHtml } from "@/lib/platform/richText";
import type { RichTextContent } from "@/lib/platform/types";
import { getSupabaseAccessToken } from "@/lib/platform/supabaseBrowser";
import { Bold, Italic, Underline } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName,
  disabled,
}: {
  value: RichTextContent;
  onChange: (next: { json: RichTextContent; text: string }) => void;
  placeholder?: string;
  minHeightClassName?: string;
  disabled?: boolean;
}) {
  const env = getPlatformPublicEnv();
  const { toast } = useToast();
  const html = useMemo(() => richDocToHtml(value), [value]);
  const editableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, [html]);

  function emitChange({ sanitize }: { sanitize: boolean }) {
    const el = editableRef.current;
    if (!el) return;
    const rawHtml = el.innerHTML || "";
    const html = sanitize ? sanitizeRichHtml(rawHtml) : rawHtml;
    if (sanitize && html !== rawHtml) el.innerHTML = html;
    const text = (el.innerText || "").replace(/\u00a0/g, " ").trim();
    onChange({ json: { type: "html", html } as unknown as RichTextContent, text });
  }

  function exec(cmd: "bold" | "italic" | "underline") {
    if (disabled) return;
    if (typeof document === "undefined") return;
    document.execCommand(cmd);
    emitChange({ sanitize: false });
  }

  async function uploadClipboardImage(file: File) {
    if (!env.cloudinaryConfigured) {
      throw new Error("Image paste is disabled until Cloudinary is configured.");
    }
    const token = await getSupabaseAccessToken();
    if (!token) throw new Error("Tutor session expired. Please sign in again.");
    const form = new FormData();
    form.set("file", file);
    form.set("folder", "edumax/rich-text");
    const res = await fetch("/api/cloudinary/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    if (!data.url) throw new Error("Upload failed");
    return data.url;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-black/70 dark:text-white/70">{placeholder ?? ""}</div>
        <div className="inline-flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => exec("bold")}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => exec("italic")}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-8 rounded-md border-2 border-black bg-transparent px-2 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
            onClick={() => exec("underline")}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={editableRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={() => {
          if (!disabled) emitChange({ sanitize: false });
        }}
        onBlur={() => {
          if (!disabled) emitChange({ sanitize: true });
        }}
        onPaste={(e) => {
          if (disabled) return;
          const items = Array.from(e.clipboardData?.items ?? []);
          const img = items.find((it) => it.kind === "file" && /^image\//i.test(it.type));
          const file = img?.getAsFile();
          if (!file) return;
          e.preventDefault();
          void (async () => {
            try {
              const url = await uploadClipboardImage(file);
              if (typeof document !== "undefined") {
                document.execCommand("insertImage", false, url);
                emitChange({ sanitize: true });
              }
            } catch (err) {
              toast({ title: "Paste failed", description: err instanceof Error ? err.message : "Unknown error" });
            }
          })();
        }}
        className={[
          "rounded-xl border border-black/10 bg-white/65 shadow-sm px-3 py-2 text-sm text-black outline-none",
          "dark:border-white/10 dark:bg-white/5 dark:text-white",
          "focus-visible:ring-0",
          minHeightClassName ?? "min-h-[140px]",
        ].join(" ")}
      />
    </div>
  );
}
