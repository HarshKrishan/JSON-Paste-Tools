import { injectInsertText, type InjectResult } from "@/shared/inject";
import { transformJson } from "@/shared/json";
import { loadSettings } from "@/shared/settings";
import type { JsonTransformMode } from "@/shared/types";
import { readClipboardText, writeClipboardText } from "./clipboard";

async function resolveTabId(tabId?: number): Promise<number | undefined> {
  if (tabId != null) return tabId;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function insertIntoTab(
  tabId: number,
  text: string
): Promise<InjectResult> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectInsertText,
      args: [text]
    });
    return (
      (results[0]?.result as InjectResult | undefined) ?? {
        ok: false,
        error: "No result from page script"
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("Cannot access") ||
      message.includes("chrome://") ||
      message.includes("Restricted")
    ) {
      return {
        ok: false,
        error:
          "Cannot paste on this page (browser internal pages are blocked). Use a normal website or textarea."
      };
    }
    return { ok: false, error: message };
  }
}

/**
 * Transform clipboard JSON and insert into the active tab.
 * @param clipboardText - If provided (e.g. from popup), skip clipboard read.
 */
export async function transformAndPasteIntoActiveTab(
  mode: JsonTransformMode,
  tabId?: number,
  clipboardText?: string
): Promise<InjectResult> {
  const settings = await loadSettings();
  const targetTabId = await resolveTabId(tabId);

  if (targetTabId == null) {
    return { ok: false, error: "No active tab" };
  }

  let raw = clipboardText;
  if (raw == null) {
    const clip = await readClipboardText();
    if (!clip.ok) return { ok: false, error: clip.error };
    raw = clip.text;
  }

  const transformed = transformJson(raw, mode, settings);
  if (!transformed.ok) {
    return { ok: false, error: transformed.error };
  }

  const output = transformed.output ?? "";
  const inserted = await insertIntoTab(targetTabId, output);

  if (inserted.ok && inserted.inserted) return inserted;

  const written = await writeClipboardText(output);
  if (written.ok) {
    return {
      ok: true,
      inserted: false,
      copiedToClipboard: true
    };
  }

  return {
    ok: false,
    error:
      inserted.error ||
      written.error ||
      "Could not insert into the page or update the clipboard."
  };
}

export async function notifyResult(result: InjectResult): Promise<void> {
  if (result.ok && result.inserted) {
    await chrome.action.setBadgeText({ text: "OK" });
  } else if (result.ok && result.copiedToClipboard) {
    await chrome.action.setBadgeText({ text: "CPY" });
  } else {
    await chrome.action.setBadgeText({ text: "ERR" });
  }
  await chrome.action.setBadgeBackgroundColor({
    color: result.ok ? "#16a34a" : "#dc2626"
  });
  setTimeout(() => {
    void chrome.action.setBadgeText({ text: "" });
  }, 1800);
}
