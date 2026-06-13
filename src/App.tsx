import { Editor } from "./components/Editor";
import { StatusBar } from "./components/StatusBar";
import { useFile } from "./hooks/useFile";
import "./styles/global.css";

export default function App() {
  useFile();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Editor />
      </div>
      <StatusBar />
    </div>
  );
}