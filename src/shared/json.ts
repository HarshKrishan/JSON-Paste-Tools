import type { JsonToolsSettings, JsonTransformMode } from "./types";

export interface JsonSuccess {
  ok: true;
  value: unknown;
  text: string;
}

export interface JsonFailure {
  ok: false;
  error: string;
  /** Best-effort line/column if parse error message includes position. */
  position?: string;
}

export type JsonParseResult = JsonSuccess | JsonFailure;

export function tryParseJson(raw: string): JsonParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Clipboard / input is empty" };
  }

  try {
    const value = JSON.parse(trimmed);
    return { ok: true, value, text: trimmed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    return { ok: false, error: message };
  }
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b)
    );
    const out: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      out[key] = sortValue(val);
    }
    return out;
  }
  return value;
}

export function transformJson(
  raw: string,
  mode: JsonTransformMode,
  settings: JsonToolsSettings
): JsonParseResult & { output?: string } {
  const parsed = tryParseJson(raw);
  if (!parsed.ok) return parsed;

  let value = parsed.value;
  if (settings.sortKeys) {
    value = sortValue(value);
  }

  const space = mode === "format" ? settings.indent : undefined;
  let output = JSON.stringify(value, null, space);
  if (settings.trailingNewline && !output.endsWith("\n")) {
    output += "\n";
  }

  return { ...parsed, output };
}

export function validateJson(raw: string): JsonParseResult {
  return tryParseJson(raw);
}
