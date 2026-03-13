"use client";

import { useEffect } from "react";

export function NoteViewTracker({ noteId }: { noteId: string }) {
  useEffect(() => {
    void fetch(`/api/notes/${noteId}/view`, { method: "POST" });
  }, [noteId]);

  return null;
}

