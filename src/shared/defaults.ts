import type { JsonToolsSettings } from "./types";

export const DEFAULT_SETTINGS: JsonToolsSettings = {
  indent: 2,
  trailingNewline: false,
  sortKeys: false
};

export function cloneDefaults(): JsonToolsSettings {
  return structuredClone(DEFAULT_SETTINGS);
}
