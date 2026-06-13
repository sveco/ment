import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";

export const createEditorState = (doc: string, onChange: (val: string) => void): EditorState => {
  return EditorState.create({
    doc,
    extensions: [
      markdown(),
      oneDark,
      history(),
      lineNumbers(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        "&": { height: "100%", fontSize: "15px" },
        ".cm-scroller": { fontFamily: "var(--font-mono)", overflow: "auto" },
        ".cm-content": { padding: "16px", caretColor: "var(--accent)" },
      }),
    ],
  });
};