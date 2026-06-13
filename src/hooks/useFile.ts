import { useCallback, useEffect } from "react";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useNoteStore } from "../store/noteStore";

export function useFile() {
  const { content, filePath, isDirty, setContent, setFilePath, setDirty } = useNoteStore();

  const openFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Text", extensions: ["md", "txt"] }],
    });
    if (!selected) return;
    const text = await readTextFile(selected as string);
    setContent(text);
    setFilePath(selected as string);
    setDirty(false);
  }, []);

  const saveFile = useCallback(async () => {
    if (filePath) {
      await writeTextFile(filePath, content);
      setDirty(false);
    } else {
      await saveFileAs();
    }
  }, [filePath, content]);

  const saveFileAs = useCallback(async () => {
    const selected = await save({
      filters: [{ name: "Text", extensions: ["md", "txt"] }],
    });
    if (!selected) return;
    await writeTextFile(selected, content);
    setFilePath(selected);
    setDirty(false);
  }, [content]);

const newFile = useCallback(async () => {
  console.log("newFile called");
  const dirty = useNoteStore.getState().isDirty;
  console.log("isDirty:", dirty);
  if (dirty) {
    const confirmed = await ask("You have unsaved changes. Discard and create new file?", {
      title: "Ment",
      kind: "warning",
    });
    if (!confirmed) return;
  }
  setContent("");
  setFilePath(null);
  setDirty(false);
}, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "n") { e.preventDefault(); newFile(); }
      if (e.ctrlKey && e.key === "o") { e.preventDefault(); openFile(); }
      if (e.ctrlKey && !e.shiftKey && e.key === "s") { e.preventDefault(); saveFile(); }
      if (e.ctrlKey && e.shiftKey && e.key === "S") { e.preventDefault(); saveFileAs(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openFile, saveFile, saveFileAs, newFile]);

  return { openFile, saveFile, saveFileAs, newFile };
}