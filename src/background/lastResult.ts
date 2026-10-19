const KEY = "lastPasteResult";

export interface LastPasteResult {
  ok: boolean;
  message: string;
  at: number;
}

export async function saveLastResult(
  ok: boolean,
  message: string
): Promise<void> {
  const payload: LastPasteResult = { ok, message, at: Date.now() };
  await chrome.storage.session.set({ [KEY]: payload });
}

export async function loadLastResult(): Promise<LastPasteResult | null> {
  const data = await chrome.storage.session.get(KEY);
  return (data[KEY] as LastPasteResult) || null;
}
