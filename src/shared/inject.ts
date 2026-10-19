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
  function isEditable(el: Element | null): el is HTMLElement {
    if (!el) return false;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      return true;
    }
    return el instanceof HTMLElement && el.isContentEditable;
  }

  function resolveTarget(): Element | null {
    const active = document.activeElement;
    if (isEditable(active)) return active;

    const tracked = (globalThis as unknown as { __jptLastEditable?: Element })
      .__jptLastEditable;
    if (tracked && isEditable(tracked)) return tracked;

    // Monaco / VS Code web often uses a hidden textarea.inputarea
    const monaco = document.querySelector(
      "textarea.inputarea"
    ) as HTMLTextAreaElement | null;
    if (monaco) return monaco;

    // CodeMirror 6 contenteditable
    const cm = document.querySelector(
      ".cm-content[contenteditable='true']"
    ) as HTMLElement | null;
    if (cm) return cm;

    // Generic contenteditable in view
    const anyEditable = document.querySelector(
      "[contenteditable='true']"
    ) as HTMLElement | null;
    if (anyEditable) return anyEditable;

    return null;
  }

  const el = resolveTarget();
  if (!el) {
    return {
      ok: false,
      error:
        "No text field found. Click into a normal input/textarea (some code editors need Cmd/Ctrl+V after CPY).",
      needsClipboardFallback: true
    };
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    const selStart = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? 0;
    const hasSelection = selStart !== selEnd;

    const start = hasSelection ? selStart : 0;
    const end = hasSelection ? selEnd : el.value.length;

    try {
      el.setRangeText(text, start, end, "end");
    } catch {
      // Some editors mark the textarea read-only visually but still allow value set
      el.value = hasSelection
        ? el.value.slice(0, start) + text + el.value.slice(end)
        : text;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    // Monaco listens to these
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    return { ok: true, inserted: true };
  }

  if (el instanceof HTMLElement && el.isContentEditable) {
    el.focus();
    const sel = window.getSelection();
    const hasSelection =
      !!sel && !sel.isCollapsed && el.contains(sel.anchorNode);

    if (!hasSelection) {
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
