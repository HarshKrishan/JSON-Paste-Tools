import { useRef } from "react";
import {
  downloadJsonText,
  downloadSettingsExport,
  readSettingsFile,
  readTextFile
} from "@/shared/settingsTransfer";
import type { JsonToolsSettings } from "@/shared/types";

interface ImportExportPanelProps {
  editorText: string;
  settings: JsonToolsSettings;
  onEditorText: (text: string) => void;
  onSettings: (settings: JsonToolsSettings) => void;
  onStatus: (kind: "ok" | "err" | "info", text: string) => void;
}

export function ImportExportPanel({
  editorText,
  settings,
  onEditorText,
  onSettings,
  onStatus
}: ImportExportPanelProps) {
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const settingsFileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    if (!editorText.trim()) {
      onStatus("err", "Editor is empty — nothing to export");
      return;
    }
    try {
      downloadJsonText(editorText);
      onStatus("ok", "JSON file downloaded");
    } catch (err) {
      onStatus("err", err instanceof Error ? err.message : "Export failed");
    }
  };

  const exportSettings = () => {
    try {
      downloadSettingsExport(settings);
      onStatus("ok", "Settings exported — share the JSON with teammates");
    } catch (err) {
      onStatus("err", err instanceof Error ? err.message : "Export failed");
    }
  };

  const onJsonFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readTextFile(file);
      onEditorText(text);
      onStatus("ok", `Imported ${file.name} into editor`);
    } catch (err) {
      onStatus("err", err instanceof Error ? err.message : "Import failed");
    }
  };

  const onSettingsFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = await readSettingsFile(file);
      onSettings(imported);
      onStatus("ok", "Settings imported and saved");
    } catch (err) {
      onStatus("err", err instanceof Error ? err.message : "Import failed");
    }
  };

  return (
    <section className="panel">
      <h2>Import / Export</h2>
      <p className="hint">
        Import a <code>.json</code> file into the editor, export the editor
        contents, or share preferences with teammates.
      </p>
      <div className="row">
        <button type="button" onClick={() => jsonFileRef.current?.click()}>
          Import JSON file
        </button>
        <button type="button" onClick={exportJson}>
          Export JSON file
        </button>
      </div>
      <div className="row">
        <button type="button" onClick={exportSettings}>
          Export settings
        </button>
        <button type="button" onClick={() => settingsFileRef.current?.click()}>
          Import settings
        </button>
      </div>
      <input
        ref={jsonFileRef}
        type="file"
        accept="application/json,.json,.txt"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onJsonFile(file);
        }}
      />
      <input
        ref={settingsFileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onSettingsFile(file);
        }}
      />
    </section>
  );
}
