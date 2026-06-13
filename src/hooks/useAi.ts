import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef } from "react";
import { useNoteStore } from "../store/noteStore";

export function useAi() {
  const { setAiStreaming } = useNoteStore();
  const unlisten = useRef<(() => void) | null>(null);
  const instructions = useRef<string>("");

  // Load personal instructions once on mount
  useEffect(() => {
    invoke<string>("get_instructions").then((result) => {
      instructions.current = result;
    });
  }, []);

  const stream = useCallback(async (
    context: string,
    instruction: string,
    onToken: (token: string) => void
  ) => {
    setAiStreaming(true);

    const unlistenToken = await listen<string>("ai://token", (event) => {
      onToken(event.payload);
    });

    const unlistenDone = await listen("ai://done", () => {
      setAiStreaming(false);
      unlistenToken();
      unlistenDone();
    });

    unlisten.current = () => {
      unlistenToken();
      unlistenDone();
      setAiStreaming(false);
    };

    try {
      await invoke("stream_completion", {
        context,
        instruction,
        instructions: instructions.current,
      });
    } catch (e) {
      console.error("AI error:", e);
      setAiStreaming(false);
      unlistenToken();
      unlistenDone();
    }
  }, []);

  const cancel = useCallback(() => {
    unlisten.current?.();
    unlisten.current = null;
  }, []);

  return { stream, cancel };
}