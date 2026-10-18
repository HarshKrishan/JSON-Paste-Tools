const OFFSCREEN_PATH = "src/offscreen/offscreen.html";

async function hasOffscreenDocument(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]
  });
  return contexts.length > 0;
}

async function ensureOffscreen(): Promise<void> {
  if (await hasOffscreenDocument()) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Read/write clipboard JSON for paste minify/format"
  });
}

/** Read clipboard from extension offscreen context (not the web page). */
export async function readClipboardText(): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  try {
    await ensureOffscreen();
    const response = (await chrome.runtime.sendMessage({
      type: "OFFSCREEN_READ_CLIPBOARD"
    })) as { ok: boolean; text?: string; error?: string } | undefined;

    if (!response?.ok) {
      return {
        ok: false,
        error:
          response?.error ||
          "Could not read clipboard. Copy JSON first, then try again."
      };
    }
    return { ok: true, text: response.text ?? "" };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not read clipboard. Copy JSON first, then try again."
    };
  }
}

export async function writeClipboardText(
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensureOffscreen();
    const response = (await chrome.runtime.sendMessage({
      type: "OFFSCREEN_WRITE_CLIPBOARD",
      text
    })) as { ok: boolean; error?: string } | undefined;

    if (!response?.ok) {
      return {
        ok: false,
        error: response?.error || "Could not write clipboard"
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not write clipboard"
    };
  }
}
