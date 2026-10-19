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

async function sendOffscreen<T>(
  message: Record<string, unknown>,
  attempts = 8
): Promise<T> {
  await ensureOffscreen();

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = (await chrome.runtime.sendMessage(message)) as T;
      if (response != null) return response;
    } catch (err) {
      lastError = err;
      // Offscreen page may still be booting after createDocument
      await new Promise((r) => setTimeout(r, 50 * (i + 1)));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Offscreen clipboard helper did not respond");
}

/** Fallback: read clipboard in the page (works when invocation has a user gesture). */
async function readClipboardViaTab(
  tabId: number
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        try {
          const text = await navigator.clipboard.readText();
          return { ok: true as const, text };
        } catch (err) {
          return {
            ok: false as const,
            error:
              err instanceof Error
                ? err.message
                : "Page could not read clipboard"
          };
        }
      }
    });
    const result = results[0]?.result;
    if (!result) return { ok: false, error: "No clipboard result from page" };
    return result;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Tab clipboard read failed"
    };
  }
}

/** Read clipboard — offscreen first, then active tab as fallback. */
export async function readClipboardText(
  tabId?: number
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const response = await sendOffscreen<{
      ok: boolean;
      text?: string;
      error?: string;
    }>({ type: "OFFSCREEN_READ_CLIPBOARD" });

    if (response?.ok) {
      return { ok: true, text: response.text ?? "" };
    }

    // Fall through to tab if offscreen returned an error
    if (tabId != null) {
      const viaTab = await readClipboardViaTab(tabId);
      if (viaTab.ok) return viaTab;
      return {
        ok: false,
        error:
          response?.error ||
          viaTab.error ||
          "Could not read clipboard. Copy JSON first, then try again."
      };
    }

    return {
      ok: false,
      error:
        response?.error ||
        "Could not read clipboard. Copy JSON first, then try again."
    };
  } catch (err) {
    if (tabId != null) {
      const viaTab = await readClipboardViaTab(tabId);
      if (viaTab.ok) return viaTab;
    }
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
    const response = await sendOffscreen<{ ok: boolean; error?: string }>({
      type: "OFFSCREEN_WRITE_CLIPBOARD",
      text
    });

    if (response?.ok) return { ok: true };
    return {
      ok: false,
      error: response?.error || "Could not write clipboard"
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not write clipboard"
    };
  }
}
