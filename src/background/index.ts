import { loadSettings, saveSettings } from "@/shared/settings";
import type { RuntimeMessage } from "@/shared/types";
import { loadLastResult } from "./lastResult";
import { modeFromMenuId, registerContextMenus } from "./menus";
import { notifyResult, transformAndPasteIntoActiveTab } from "./paste";

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  registerContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const mode = modeFromMenuId(info.menuItemId);
  if (!mode) return;
  void (async () => {
    const result = await transformAndPasteIntoActiveTab(mode, tab?.id);
    await notifyResult(result);
  })();
});

chrome.commands.onCommand.addListener((command) => {
  void (async () => {
    if (command === "paste-json-minified") {
      const result = await transformAndPasteIntoActiveTab("minify");
      await notifyResult(result);
      return;
    }
    if (command === "paste-json-formatted") {
      const result = await transformAndPasteIntoActiveTab("format");
      await notifyResult(result);
    }
  })();
});

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage | { type: string }, _sender, sendResponse) => {
    // Offscreen clipboard messages are handled only by the offscreen page.
    if (
      message?.type === "OFFSCREEN_READ_CLIPBOARD" ||
      message?.type === "OFFSCREEN_WRITE_CLIPBOARD"
    ) {
      return false;
    }

    const msg = message as RuntimeMessage;

    void (async () => {
      if (msg.type === "GET_SETTINGS") {
        sendResponse({ settings: await loadSettings() });
        return;
      }
      if (msg.type === "SAVE_SETTINGS") {
        await saveSettings(msg.settings);
        sendResponse({ ok: true });
        return;
      }
      if (msg.type === "TRANSFORM_AND_PASTE") {
        const result = await transformAndPasteIntoActiveTab(
          msg.mode,
          undefined,
          msg.clipboardText
        );
        await notifyResult(result);
        sendResponse(result);
        return;
      }
      if (msg.type === "GET_LAST_RESULT") {
        sendResponse({ result: await loadLastResult() });
      }
    })();
    return true;
  }
);
