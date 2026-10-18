/**
 * Self-contained page scripts for chrome.scripting.executeScript.
 * Helpers must live inside each function — Chrome only serializes `func`.
 */

export interface InjectResult {
  ok: boolean;
  error?: string;
  inserted?: boolean;
  /** Transformed text was written to clipboard as a fallback. */
  copiedToClipboard?: boolean;
  needsClipboardFallback?: boolean;
}

/**
 * Insert already-transformed text into the focused (or last-focused) field.
 * Does NOT read the clipboard — that must happen in the extension context.
 *
 * If nothing is selected, replaces the **entire** field so site placeholder /
 * hint text (e.g. "Paste the JSON code here…") is not left in place.
 * If the user selected a range, only that selection is replaced.
 */
export function injectInsertText(text: string): InjectResult {
  function resolveTarget(): Element | null {
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    ) {
      return active;
    }

    const tracked = (globalThis as unknown as { __jptLastEditable?: Element })
      .__jptLastEditable;
    if (
      tracked instanceof HTMLInputElement ||
      tracked instanceof HTMLTextAreaElement ||
      (tracked instanceof HTMLElement && tracked.isContentEditable)
    ) {
      return tracked;
    }

    return null;
  }

  const el = resolveTarget();
  if (!el) {
    return {
      ok: false,
      error:
        "No text field focused. Click into an input/textarea first, then try again.",
      needsClipboardFallback: true
    };
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    const selStart = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? 0;
    const hasSelection = selStart !== selEnd;

    // No selection → replace whole value (clears placeholder/hint text in the field)
    const start = hasSelection ? selStart : 0;
    const end = hasSelection ? selEnd : el.value.length;

    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true, inserted: true };
  }

  if (el instanceof HTMLElement && el.isContentEditable) {
    el.focus();
    const sel = window.getSelection();
    const hasSelection =
      !!sel && !sel.isCollapsed && el.contains(sel.anchorNode);

    if (!hasSelection) {
      // Replace all content in the editable
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    if (document.execCommand("insertText", false, text)) {
      return { ok: true, inserted: true };
    }

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      return { ok: true, inserted: true };
    }

    el.textContent = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return { ok: true, inserted: true };
  }

  return {
    ok: false,
    error: "Could not insert into the focused field.",
    needsClipboardFallback: true
  };
}
