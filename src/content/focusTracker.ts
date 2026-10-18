/**
 * Remembers the last focused editable so popup actions can still paste
 * after the popup steals focus from the page.
 */
const g = globalThis as unknown as { __jptLastEditable?: Element };

function track(target: EventTarget | null) {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    g.__jptLastEditable = target;
  }
}

document.addEventListener("focusin", (e) => track(e.target), true);

// Capture current focus if already in a field when the script loads
track(document.activeElement);
