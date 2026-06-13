import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, WidgetType } from "@codemirror/view";
import { createEditorState } from "../lib/codemirror";
import { useNoteStore } from "../store/noteStore";
import { useAi } from "../hooks/useAi";

// ── Ghost widget ─────────────────────────────────────────────────────────────

class GhostWidget extends WidgetType {
  constructor(private text: string) { super(); }
  toDOM() {
    const span = document.createElement("span");
    span.style.color = "#555";
    span.style.fontStyle = "italic";
    span.style.pointerEvents = "none";
    span.style.whiteSpace = "pre";
    span.textContent = this.text;
    return span;
  }
  eq(other: GhostWidget) { return this.text === other.text; }
}

// ── Ghost state field ────────────────────────────────────────────────────────

interface GhostState { text: string; pos: number }

const setGhost = StateEffect.define<GhostState | null>();

const ghostField = StateField.define<GhostState | null>({
  create: () => null,
  update(val, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGhost)) return effect.value;
    }
    if (tr.docChanged) return null;
    return val;
  },
  provide: (f) =>
    EditorView.decorations.from(f, (val): DecorationSet => {
      if (!val) return Decoration.none;
      const widget = Decoration.widget({ widget: new GhostWidget(val.text), side: 1 });
      return Decoration.set([widget.range(val.pos)]);
    }),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

interface TriggerResult {
  blockText: string;
  instruction: string;
  blockFrom: number;
  triggerFrom: number;
  triggerTo: number;
  insertOnly: boolean;
}

function findTrigger(content: string, cursorLineText: string): TriggerResult | null {
  if (!cursorLineText.includes("//")) return null;

  const lines = content.split("\n");

  // Find the trigger line index by matching cursor line text
  let triggerLineIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes("//")) {
      triggerLineIndex = i;
      break;
    }
  }
  if (triggerLineIndex === -1) return null;

  const triggerLine = lines[triggerLineIndex];
  const slashIndex = triggerLine.indexOf("//");
  const instruction = triggerLine.slice(slashIndex + 2).trim();
  const inlineBefore = triggerLine.slice(0, slashIndex).trim();

  const triggerLineStart = lines.slice(0, triggerLineIndex).join("\n").length + (triggerLineIndex > 0 ? 1 : 0);
  const triggerLineEnd = lines.slice(0, triggerLineIndex + 1).join("\n").length + (triggerLineIndex < lines.length - 1 ? 1 : 0);

  if (instruction) {
    const blockText = lines.slice(0, triggerLineIndex)
      .concat(inlineBefore ? [inlineBefore] : [])
      .join("\n")
      .trim();

    return {
      blockText,
      instruction,
      blockFrom: triggerLineStart,
      triggerFrom: triggerLineStart,
      triggerTo: triggerLineEnd,
      insertOnly: true,
    };
  } else {
    let blockStart = triggerLineIndex;
    if (!inlineBefore) {
      for (let i = triggerLineIndex - 1; i >= 0; i--) {
        if (lines[i].trim() === "") break;
        blockStart = i;
      }
    }

    const blockLines = inlineBefore
      ? [...lines.slice(blockStart, triggerLineIndex), inlineBefore]
      : lines.slice(blockStart, triggerLineIndex);
    const blockText = blockLines.join("\n").trim();
    const blockFrom = lines.slice(0, blockStart).join("\n").length + (blockStart > 0 ? 1 : 0);

    return {
      blockText,
      instruction: "",
      blockFrom,
      triggerFrom: triggerLineStart,
      triggerTo: triggerLineEnd,
      insertOnly: false,
    };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const setContent = useNoteStore((s) => s.setContent);
  const filePath = useNoteStore((s) => s.filePath);
  const { stream, cancel } = useAi();

  const ghostRef = useRef<string>("");
  const triggerBlockRef = useRef<{ from: number; to: number; insertOnly: boolean } | null>(null);
  const isStreamingRef = useRef(false);

  // Mount editor once
  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: createEditorState("", setContent, [ghostField]),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => view.destroy();
  }, []);

  // Reload editor when file changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    ghostRef.current = "";
    triggerBlockRef.current = null;
    isStreamingRef.current = false;
    // read content fresh from store
    const currentContent = useNoteStore.getState().content;
    view.setState(createEditorState(currentContent, setContent, [ghostField]));
  }, [filePath]);

  // Keyboard handler — mounted once, reads live state from view
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {

      // Enter — check cursor line directly from editor state
      if (e.key === "Enter" && !isStreamingRef.current) {
        const view = viewRef.current;
        if (!view) return;

        const cursorPos = view.state.selection.main.head;
        const cursorLine = view.state.doc.lineAt(cursorPos);

        // Check current line first, then previous line (cursor may have already moved)
        let cursorLineText = cursorLine.text;
        if (!cursorLineText.includes("//") && cursorLine.number > 1) {
          const prevLine = view.state.doc.line(cursorLine.number - 1);
          cursorLineText = prevLine.text;
        }
        console.log("Cursor line:", JSON.stringify(cursorLineText));
        console.log("Has //:", cursorLineText.includes("//"));

        if (!cursorLineText.includes("//")) return; // normal Enter

        e.preventDefault();

        // Read current content directly from editor — no stale closure
        const content = view.state.doc.toString();
        const trigger = findTrigger(content, cursorLineText);
        if (!trigger) return;

        const { blockText, instruction, blockFrom, triggerFrom, triggerTo, insertOnly } = trigger;
        if (!blockText && !instruction) return;

        // Remove the // line immediately
        view.dispatch({
          changes: { from: triggerFrom, to: triggerTo, insert: "" },
        });

        const ghostPos = triggerFrom;
        triggerBlockRef.current = { from: insertOnly ? ghostPos : blockFrom, to: ghostPos, insertOnly };
        ghostRef.current = "";
        isStreamingRef.current = true;
        setContent(view.state.doc.toString());

        let suggestion = "";
        stream(blockText, instruction, (token) => {
          suggestion += token;
          ghostRef.current = suggestion;
          viewRef.current?.dispatch({
            effects: setGhost.of({ text: suggestion, pos: ghostPos }),
          });
        }).finally(() => {
          isStreamingRef.current = false;
        });

        return;
      }

      // Tab accepts ghost
      if (e.key === "Tab" && ghostRef.current && triggerBlockRef.current) {
        e.preventDefault();
        const view = viewRef.current;
        if (!view) return;
        const { from, to, insertOnly } = triggerBlockRef.current;
        const suggestion = ghostRef.current;
        ghostRef.current = "";
        triggerBlockRef.current = null;

        view.dispatch({
          changes: { from, to, insert: suggestion + "\n" },
          effects: setGhost.of(null),
        });
        setContent(view.state.doc.toString());
      }

      // Escape dismisses
      if (e.key === "Escape" && (ghostRef.current || isStreamingRef.current)) {
        e.preventDefault();
        ghostRef.current = "";
        triggerBlockRef.current = null;
        isStreamingRef.current = false;
        viewRef.current?.dispatch({ effects: setGhost.of(null) });
        cancel();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // mounted once — reads live from viewRef, no stale closures

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}