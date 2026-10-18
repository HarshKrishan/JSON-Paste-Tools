chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OFFSCREEN_READ_CLIPBOARD") {
    void navigator.clipboard
      .readText()
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err: unknown) =>
        sendResponse({
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Could not read clipboard from offscreen document"
        })
      );
    return true;
  }

  if (message?.type === "OFFSCREEN_WRITE_CLIPBOARD") {
    void navigator.clipboard
      .writeText(String(message.text ?? ""))
      .then(() => sendResponse({ ok: true }))
      .catch((err: unknown) =>
        sendResponse({
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Could not write clipboard from offscreen document"
        })
      );
    return true;
  }

  return undefined;
});
