import { useState } from "react";
import { Editor } from "./components/Editor";
import { StatusBar } from "./components/StatusBar";
import { CommandBar } from "./components/CommandBar";
import { useFile } from "./hooks/useFile";
import "./styles/global.css";

export default function App() {
  const [showCommand, setShowCommand] = useState(false);
  const { editorRef } = useFile();

  const handleResult = (text: string) => {
    const store = (window as any).__noteStore;
    // We'll wire this to the editor in the next step
    console.log("AI result:", text);
  };

  useState(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setShowCommand(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Editor />
      </div>
      <StatusBar />
      {showCommand && (
        <CommandBar
          onClose={() => setShowCommand(false)}
          onResult={handleResult}
        />
      )}
    </div>
  );
}