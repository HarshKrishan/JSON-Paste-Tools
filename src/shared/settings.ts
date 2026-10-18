import { cloneDefaults } from "./defaults";
import type { JsonToolsSettings } from "./types";

const KEY = "settings";

export async function loadSettings(): Promise<JsonToolsSettings> {
  const stored = await chrome.storage.sync.get(KEY);
  if (!stored[KEY]) return cloneDefaults();
  return { ...cloneDefaults(), ...(stored[KEY] as JsonToolsSettings) };
}

export async function saveSettings(settings: JsonToolsSettings): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: settings });
}
