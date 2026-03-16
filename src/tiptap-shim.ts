declare module "@tiptap/core" {
  export type Extension = unknown;
  export type JSONContent = Record<string, unknown>;
}

declare module "@tiptap/html" {
  export function generateHTML(doc: unknown, extensions: unknown): string;
}

declare module "@tiptap/starter-kit" {
  const StarterKit: { configure: (options: unknown) => unknown };
  export default StarterKit;
}

declare module "@tiptap/extension-underline" {
  const Underline: unknown;
  export default Underline;
}

declare module "@tiptap/react" {
  export type Editor = {
    getJSON: () => unknown;
    getText: () => string;
    commands: Record<string, (...args: unknown[]) => unknown>;
    destroy: () => void;
  };
  export function useEditor(options: unknown): Editor | null;
  export const EditorContent: (props: { editor: Editor | null }) => import("react").ReactElement;
}
