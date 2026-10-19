import { injectInsertText, type InjectResult } from "@/shared/inject";
import { transformJson } from "@/shared/json";
import { loadSettings } from "@/shared/settings";
import type { JsonTransformMode } from "@/shared/types";
import { readClipboardText, writeClipboardText } from "./clipboard";
import { saveLastResult } from "./lastResult";

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
    const clip = await readClipboardText(targetTabId);
    if (!clip.ok) return { ok: false, error: clip.error };
    raw = clip.text;
  }

  if (!raw.trim()) {
    return {
      ok: false,
      error: "Clipboard is empty. Copy some JSON first, then try again."
    };
  }

  const transformed = transformJson(raw, mode, settings);
  if (!transformed.ok) {
    return {
      ok: false,
      error: `Clipboard is not valid JSON: ${transformed.error}`
    };
  }

  const output = transformed.output ?? "";
  const inserted = await insertIntoTab(targetTabId, output);

  if (inserted.ok && inserted.inserted) return inserted;

  const written = await writeClipboardText(output);
  if (written.ok) {
    return {
      ok: true,
      inserted: false,
      copiedToClipboard: true,
      error:
        inserted.error ||
        "Could not insert into this editor — transformed JSON copied to clipboard. Press Cmd/Ctrl+V."
    };
  }

  return {
    ok: false,
    error:
      inserted.error ||
      written.error ||
      "Could not insert into the page or update the clipboard. Try a normal <textarea>, or use the popup."
  };
}

export async function notifyResult(result: InjectResult): Promise<void> {
  const message = result.ok
    ? result.inserted
      ? "Pasted successfully"
      : result.error ||
        "Transformed JSON copied to clipboard — press Cmd/Ctrl+V to paste"
    : result.error || "Something went wrong";

  await saveLastResult(result.ok, message);

  // Hover the extension icon to read this
  await chrome.action.setTitle({
    title: result.ok
      ? `JSON Paste Tools — ${message}`
      : `JSON Paste Tools — Error: ${message}`
  });

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
    void chrome.action.setTitle({ title: "JSON Paste Tools" });
  }, 8000);
}
