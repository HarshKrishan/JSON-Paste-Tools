# How we built JSON Paste Tools

This document explains **what we used**, **how the project is structured**, and **how each feature works**. For install / run / Chrome load steps, see the root [README.md](../README.md).

---

## Problem and product goals

Developers often copy JSON that is minified or messy and need to paste it **pretty-printed** or **compressed** into forms, APIs, or editors — without hopping to an external site every time.

We built a Chrome extension that:

1. Pastes clipboard JSON into a focused field as **minified** or **formatted**
2. Offers the same actions via **context menu**, **keyboard shortcuts**, and **popup**
3. Provides a popup toolkit: validate, format/minify, import/export files, timestamps
4. Lets teammates **share preferences** via settings import/export

It is intentionally a **separate** extension from Website Environment Warning (different single purpose for Chrome Web Store and clearer codebase).

---

## What we used (tech stack)

| Layer | Choice | Why |
| --- | --- | --- |
| Extension platform | **Chrome Manifest V3** | Service worker, commands, context menus, offscreen documents |
| UI | **React 19** + **React DOM** | Popup toolkit with modular panels |
| Language | **TypeScript** | Typed settings, messages, transform results |
| Bundler / dev server | **Vite 6** | Fast rebuilds; multi-entry HTML (popup + offscreen) |
| Chrome + Vite glue | **`@crxjs/vite-plugin`** | Manifest-aware build → loadable `dist/` |
| React in Vite | **`@vitejs/plugin-react`** | JSX/TSX transform |
| Package manager | **Yarn Classic (1.22)** | `yarn install` / `yarn dev` / `yarn build` |
| Chrome typings | **`@types/chrome`** | Typed `chrome.*` APIs |
| Persistence | **`chrome.storage.sync`** | Indent / sort-keys / trailing-newline preferences |

### Chrome permissions we declared

| Permission | Used for |
| --- | --- |
| `storage` | Save/load popup preferences |
| `contextMenus` | Right‑click → paste minified / formatted |
| `clipboardRead` / `clipboardWrite` | Read JSON to transform; write fallback when insert fails |
| `activeTab` | Temporary access to the tab the user is working in |
| `scripting` | `executeScript` to insert text into the focused field |
| `offscreen` | Reliable clipboard read/write from the extension (not the web page) |

Content script `matches: <all_urls>` tracks the last focused editable so paste still works after the popup steals focus.

Defined in `manifest.config.ts` (typed via CRXJS `defineManifest`).

---

## How we structured the codebase

Modular by **concern**:

```text
src/
  shared/                 # Pure helpers reused everywhere
    types.ts              # Settings + runtime message types
    defaults.ts           # Default indent / sort / newline
    json.ts               # Parse, validate, minify, format
    timestamps.ts         # Unix ↔ ISO UTC conversion
    settings.ts           # chrome.storage.sync load/save
    settingsTransfer.ts   # Settings + JSON file import/export
    inject.ts             # Self-contained insertText for executeScript

  background/             # Service worker
    index.ts              # Menus, commands, message router
    menus.ts              # Context menu registration
    clipboard.ts          # Offscreen clipboard read/write
    paste.ts              # Transform + insert into active tab

  content/
    focusTracker.ts       # Remembers last focused input/textarea

  offscreen/
    offscreen.html / .ts  # Clipboard access with extension privileges

  popup/                  # React popup
    PopupApp.tsx
    components/
      SettingsPanel.tsx
      ImportExportPanel.tsx
      TimestampConverter.tsx

manifest.config.ts
vite.config.ts            # Also bundles offscreen.html as an entry
```

Path alias: `@/*` → `src/*`.

---

## Build and load pipeline

```text
Source (TS/TSX/HTML/CSS)
        │
        ▼
  yarn dev  /  yarn build
        │
        ▼
  Vite + @crxjs/vite-plugin
        │
        ▼
  dist/   ← load this folder in chrome://extensions
```

- **`yarn dev`** — watch mode; needs the Vite server while testing  
- **`yarn build`** — typecheck + production build; **no server** needed for daily use  

Always **Load unpacked → `dist/`**.

---

## How each feature was built

### 1. Minify / format transform

- **`shared/json.ts`**: `JSON.parse` → optional key sort → `JSON.stringify` with indent or none  
- Shared by popup editor buttons and the paste-into-page pipeline so behavior stays consistent  

### 2. Paste into page (formatted / minified)

Flow:

1. **Read clipboard in the extension** (popup user gesture, or offscreen document for menus/shortcuts)  
2. **Transform** with `transformJson`  
3. **`chrome.scripting.executeScript`** runs `injectInsertText(text)` in the tab  
4. Inserts into focused field, or **last focused** field tracked by `focusTracker.ts`  
5. If no field: write transformed text back to clipboard (badge `CPY`)  

**Why not read clipboard in the page script?**  
A popup button click is not a user gesture for `navigator.clipboard` inside the website. Reading in the page caused *“Could not read clipboard…”*. Extension/offscreen read fixes that.

**Replace vs insert:**  
If nothing is selected, paste **replaces the entire field** so site hint text (e.g. “Paste the JSON code here…”) is not left above the JSON. A user selection is replaced only for that range.

### 3. Context menus

- Registered in `background/menus.ts` on install/startup  
- Contexts: `editable`  
- Click → same `transformAndPasteIntoActiveTab(mode, tabId)` as shortcuts  

### 4. Keyboard shortcuts

- Declared under `commands` in the manifest  
- Defaults: `Ctrl/⌘+Shift+M` (minify), `Ctrl/⌘+Shift+U` (format)  
- Handled in `chrome.commands.onCommand`  
- Users can remap at `chrome://extensions/shortcuts`  

### 5. Popup toolkit

| Panel | Role |
| --- | --- |
| Editor + Format/Minify/Validate/Copy | Local JSON workspace |
| Paste … → page | Reads clipboard in popup, asks background to insert |
| ImportExportPanel | JSON file ↔ editor; settings JSON for teammates |
| TimestampConverter | Unix s/ms ↔ ISO UTC |
| SettingsPanel | Indent, sort keys, trailing newline |

### 6. Import / export

- **Editor:** download/upload raw JSON text  
- **Settings:** versioned file `format: "json-paste-tools"` via `settingsTransfer.ts`  
- Import settings is saved immediately to `chrome.storage.sync`  

### 7. Timestamp conversion

- **`shared/timestamps.ts`**: numeric strings auto-detected as seconds vs ms (`≥ 1e11` → ms)  
- ISO / Date-parseable strings supported  
- UI shows ISO, unix (s), unix (ms), UTC string  

### 8. Offscreen document

- MV3 service workers cannot reliably use the Clipboard API  
- `chrome.offscreen.createDocument` with reason `CLIPBOARD` hosts a tiny page that reads/writes clipboard on message  
- Used by context menus and shortcuts  

---

## Data flow (high level)

```text
┌──────────────────┐     clipboard text      ┌─────────────────────┐
│ Popup (React)    │ ──────────────────────► │ Background SW       │
│ or Offscreen     │                         │ transformJson()     │
└──────────────────┘                         └──────────┬──────────┘
                                                       │ executeScript
                                                       ▼
                                            ┌─────────────────────┐
                                            │ Page: injectInsert  │
                                            │ (+ focusTracker)    │
                                            └─────────────────────┘

Preferences: popup ◄──► chrome.storage.sync ("settings")
```

---

## Design decisions (short)

| Decision | Rationale |
| --- | --- |
| Separate from Environment Warning | Different product purpose; cleaner Store review |
| Transform in extension, insert in page | Clipboard APIs need extension context / gesture |
| Offscreen for menus/shortcuts | Service worker cannot own clipboard reliably |
| Focus tracker content script | Popup steals focus; still paste into last field |
| Replace-all when no selection | Avoid concatenating site placeholder/hint text |
| Self-contained `injectInsertText` | `executeScript` only serializes the function body |
| Yarn + CRXJS | Same workflow as the sibling extension |

---

## What we did *not* use

- No backend — clipboard and settings stay on the device  
- No large UI library — plain CSS in the popup  
- No automatic paste interceptor on every Ctrl+V (kept explicit menus/shortcuts/buttons for clarity and fewer site conflicts)  

---

## Related docs

| Doc | Purpose |
| --- | --- |
| [README.md](../README.md) | Setup, Yarn commands, load in Chrome, features |
| This file | Architecture, stack, and how features were implemented |
| Sibling: `website-environment-warning/docs/HOW_WE_BUILT_THIS.md` | Same stack patterns for the environment banner extension |
