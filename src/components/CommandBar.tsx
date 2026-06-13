import { useState, useEffect, useRef } from "react";
import { useAi } from "../hooks/useAi";
import { useNoteStore } from "../store/noteStore";

interface Props {
  onClose: () => void;
  onResult: (text: string) => void;
}

export function CommandBar({ onClose, onResult }: Props) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { stream, cancel } = useAi();
  const content = useNoteStore((s) => s.content);
  const isStreaming = useNoteStore((s) => s.isAiStreaming);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || isStreaming) return;
    setResponse("");
    let accumulated = "";
    await stream(prompt, content, (token) => {
      accumulated += token;
      setResponse(accumulated);
    });
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "80px",
      zIndex: 100,
    }}>
      <div style={{
        width: "640px",
        background: "var(--bg-overlay)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px" }}>
          <span style={{ color: "var(--accent)", marginRight: "8px", fontFamily: "var(--font-mono)" }}>⚡</span>
          <input
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="Ask AI anything about your note… (Enter to send, Esc to close)"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontFamily: "var(--font-ui)",
              fontSize: "14px",
            }}
          />
        </div>

        {response && (
          <div style={{
            borderTop: "1px solid var(--border)",
            padding: "12px",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            color: "var(--text)",
            whiteSpace: "pre-wrap",
            maxHeight: "300px",
            overflowY: "auto",
          }}>
            {response}
          </div>
        )}

        {response && !isStreaming && (
          <div style={{
            borderTop: "1px solid var(--border)",
            padding: "8px 12px",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
          }}>
            <button onClick={onClose} style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              padding: "4px 12px",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: "12px",
            }}>Discard</button>
            <button onClick={() => { onResult(response); onClose(); }} style={{
              background: "var(--accent)",
              border: "none",
              color: "#000",
              padding: "4px 12px",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: "12px",
              fontWeight: 600,
            }}>Insert</button>
          </div>
        )}
      </div>
    </div>
  );
}