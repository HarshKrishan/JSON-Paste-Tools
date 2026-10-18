const MENU_PARENT = "jpt-parent";
const MENU_MINIFY = "jpt-paste-minify";
const MENU_FORMAT = "jpt-paste-format";

export function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PARENT,
      title: "JSON Paste Tools",
      contexts: ["editable"]
    });
    chrome.contextMenus.create({
      id: MENU_MINIFY,
      parentId: MENU_PARENT,
      title: "Paste JSON minified",
      contexts: ["editable"]
    });
    chrome.contextMenus.create({
      id: MENU_FORMAT,
      parentId: MENU_PARENT,
      title: "Paste JSON formatted",
      contexts: ["editable"]
    });
  });
}

export function modeFromMenuId(
  menuItemId: string | number
): "minify" | "format" | null {
  if (menuItemId === MENU_MINIFY) return "minify";
  if (menuItemId === MENU_FORMAT) return "format";
  return null;
}
