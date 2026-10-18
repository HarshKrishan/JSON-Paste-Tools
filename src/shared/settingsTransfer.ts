import { cloneDefaults } from "./defaults";
import type { JsonToolsSettings } from "./types";

export const SETTINGS_EXPORT_FORMAT = "json-paste-tools";
export const SETTINGS_EXPORT_VERSION = 1;

export interface SettingsExportFile {
  format: typeof SETTINGS_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  settings: JsonToolsSettings;
}

function normalizeSettings(raw: unknown): JsonToolsSettings {
  if (!raw || typeof raw !== "object") {
    throw new Error("Import file is missing settings");
  }
  const incoming = raw as Partial<JsonToolsSettings>;
  const defaults = cloneDefaults();
  const indent = incoming.indent === 4 ? 4 : incoming.indent === 2 ? 2 : defaults.indent;

  return {
    indent,
    trailingNewline:
      typeof incoming.trailingNewline === "boolean"
        ? incoming.trailingNewline
        : defaults.trailingNewline,
    sortKeys:
      typeof incoming.sortKeys === "boolean" ? incoming.sortKeys : defaults.sortKeys
  };
}

export function buildSettingsExport(
  settings: JsonToolsSettings
): SettingsExportFile {
  return {
    format: SETTINGS_EXPORT_FORMAT,
    version: SETTINGS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: structuredClone(settings)
  };
}

export function parseSettingsImport(jsonText: string): JsonToolsSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("File is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Import file has an invalid shape");
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.format === SETTINGS_EXPORT_FORMAT || obj.settings) {
    if (obj.format && obj.format !== SETTINGS_EXPORT_FORMAT) {
      throw new Error(
        `Unrecognized format "${String(obj.format)}". Expected "${SETTINGS_EXPORT_FORMAT}".`
      );
    }
    return normalizeSettings(obj.settings);
  }

  if ("indent" in obj || "sortKeys" in obj || "trailingNewline" in obj) {
    return normalizeSettings(obj);
  }

  throw new Error(
    "Unrecognized file. Export from this extension, or provide a settings JSON object."
  );
}

export function downloadSettingsExport(settings: JsonToolsSettings): void {
  const payload = buildSettingsExport(settings);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `jpt-settings-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readSettingsFile(file: File): Promise<JsonToolsSettings> {
  return parseSettingsImport(await file.text());
}

export function downloadJsonText(text: string, filename?: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || `json-export-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readTextFile(file: File): Promise<string> {
  return file.text();
}
