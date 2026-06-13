import { useNoteStore } from "../store/noteStore";

export function StatusBar() {
  const { filePath, isDirty, content, isAiStreaming } = useNoteStore();
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const name = filePath ? filePath.split(/[\\/]/).pop() : "untitled";

  return (
    <div style={{
      height: "var(--status-h)",
      background: "var(--bg-surface)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      gap: "16px",
      fontSize: "12px",
      color: "var(--text-muted)",
      fontFamily: "var(--font-ui)",
    }}>
      <span style={{ color: isDirty ? "var(--accent)" : "var(--text-muted)" }}>
        {isDirty ? "● " : ""}{name}
      </span>
      <span style={{ marginLeft: "auto" }}>
        {isAiStreaming ? "⚡ AI thinking…" : `${words}w ${chars}c`}
      </span>
    </div>
  );
}