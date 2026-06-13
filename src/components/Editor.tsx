import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { createEditorState } from "../lib/codemirror";
import { useNoteStore } from "../store/noteStore";

export function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const setContent = useNoteStore((s) => s.setContent);
  const content = useNoteStore((s) => s.content);
  const filePath = useNoteStore((s) => s.filePath);

  // Mount editor once
  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: createEditorState("", setContent),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => view.destroy();
  }, []);

  // When a new file is loaded, replace editor state with new content
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.setState(createEditorState(content, setContent));
  }, [filePath]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}