import { useEffect, useState } from "react";
import { transformJson, validateJson } from "@/shared/json";
import { loadSettings, saveSettings } from "@/shared/settings";
import type { JsonToolsSettings } from "@/shared/types";
import { ImportExportPanel } from "./components/ImportExportPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { TimestampConverter } from "./components/TimestampConverter";

type Status = { kind: "ok" | "err" | "info"; text: string } | null;

export function PopupApp() {
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<JsonToolsSettings | null>(null);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  const setStatusMsg = (kind: "ok" | "err" | "info", msg: string) => {
    setStatus({ kind, text: msg });
  };

  const persistSettings = async (next: JsonToolsSettings) => {
    setSettings(next);
    await saveSettings(next);
  };

  const runTransform = (mode: "minify" | "format") => {
    if (!settings) return;
    const result = transformJson(text, mode, settings);
    if (!result.ok) {
      setStatusMsg("err", result.error);
      return;
    }
    setText(result.output ?? "");
    setStatusMsg("ok", mode === "format" ? "Formatted" : "Minified");
  };

  const runValidate = () => {
    const result = validateJson(text);
    if (!result.ok) {
      setStatusMsg("err", result.error);
      return;
    }
    setStatusMsg("ok", "Valid JSON");
  };

  const pasteFromClipboard = async () => {
    try {
      const raw = await navigator.clipboard.readText();
      setText(raw);
      setStatusMsg("info", "Pasted from clipboard");
    } catch {
      setStatusMsg("err", "Could not read clipboard");
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMsg("ok", "Copied to clipboard");
    } catch {
      setStatusMsg("err", "Could not write clipboard");
    }
  };

  const pasteIntoPage = async (mode: "minify" | "format") => {
    let clipboardText: string;
    try {
      // Read here so we have a real user gesture (page scripts cannot).
      clipboardText = await navigator.clipboard.readText();
    } catch {
      setStatusMsg(
        "err",
        "Could not read clipboard. Copy JSON first, then try again."
      );
      return;
    }

    const result = await chrome.runtime.sendMessage({
      type: "TRANSFORM_AND_PASTE",
      mode,
      clipboardText
    });
    if (result?.ok && result.inserted) {
      setStatusMsg("ok", `Pasted ${mode} JSON into the page`);
    } else if (result?.ok && result.copiedToClipboard) {
      setStatusMsg(
        "ok",
        "No field focused — transformed JSON is on the clipboard (Cmd/Ctrl+V)"
      );
    } else {
      setStatusMsg("err", result?.error || "Paste into page failed");
    }
  };

  if (!settings) {
    return (
      <div className="popup">
        <p className="status">Loading…</p>
      </div>
    );
  }

  return (
    <div className="popup">
      <header>
        <h1>JSON Paste Tools</h1>
      </header>
      <p className="hint">
        Tip: click into a text field on the page first, then use{" "}
        <strong>Paste … → page</strong>, the right‑click menu, or shortcuts.
        Clipboard is read by the extension (not the website).
      </p>

      <textarea
        value={text}
        placeholder='Paste JSON here… e.g. {"a":1}'
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="row">
        <button type="button" onClick={() => void pasteFromClipboard()}>
          From clipboard
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => runTransform("format")}
        >
          Format
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => runTransform("minify")}
        >
          Minify
        </button>
        <button type="button" onClick={runValidate}>
          Validate
        </button>
        <button type="button" onClick={() => void copyOutput()}>
          Copy
        </button>
      </div>

      <div className="row">
        <button type="button" onClick={() => void pasteIntoPage("format")}>
          Paste formatted → page
        </button>
        <button type="button" onClick={() => void pasteIntoPage("minify")}>
          Paste minified → page
        </button>
      </div>

      <p
        className={`status${status ? ` ${status.kind === "err" ? "err" : status.kind === "ok" ? "ok" : ""}` : ""}`}
      >
        {status?.text ?? ""}
      </p>

      <ImportExportPanel
        editorText={text}
        settings={settings}
        onEditorText={setText}
        onSettings={(next) => void persistSettings(next)}
        onStatus={setStatusMsg}
      />

      <TimestampConverter
        onStatus={setStatusMsg}
        onUseInEditor={(value) => setText(value)}
      />

      <SettingsPanel
        settings={settings}
        onChange={(next) => void persistSettings(next)}
      />
    </div>
  );
}
