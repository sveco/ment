import { create } from "zustand";

interface NoteState {
  content: string;
  filePath: string | null;
  isDirty: boolean;
  isAiStreaming: boolean;
  setContent: (content: string) => void;
  setFilePath: (path: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setAiStreaming: (streaming: boolean) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  content: "",
  filePath: null,
  isDirty: false,
  isAiStreaming: false,
  setContent: (content) => set({ content, isDirty: true }),
  setFilePath: (filePath) => set({ filePath }),
  setDirty: (isDirty) => set({ isDirty }),
  setAiStreaming: (isAiStreaming) => set({ isAiStreaming }),
}));