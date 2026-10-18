# JSON Paste Tools

Chrome extension that helps you **paste clipboard JSON minified or formatted**, plus a popup to validate / pretty-print / minify.

Built with **React**, **TypeScript**, **Vite**, **`@crxjs/vite-plugin`**, and **Yarn** (same stack as Website Environment Warning).

For a deeper write-up of the architecture, stack, and how each feature was implemented, see **[docs/HOW_WE_BUILT_THIS.md](docs/HOW_WE_BUILT_THIS.md)**.

## Features (MVP)

- **Context menu** (right‑click in a text field) → *JSON Paste Tools*
  - Paste JSON **minified**
  - Paste JSON **formatted**
- **Keyboard shortcuts**
  - Minify paste: `Ctrl/⌘ + Shift + M`
  - Format paste: `Ctrl/⌘ + Shift + U`  
  (change anytime at `chrome://extensions/shortcuts`)
- **Popup toolkit**
  - Paste from clipboard, Format, Minify, Validate, Copy
  - Paste formatted/minified into the active page field
  - Preferences: indent (2/4), sort keys, trailing newline
- **Import / Export**
  - Import a `.json` file into the editor / export editor contents
  - Export / import preferences (`jpt-settings-*.json`) to share with teammates
- **Timestamp conversion**
  - Unix seconds or milliseconds ↔ ISO UTC
  - Shows ISO, unix (s/ms), and UTC string; copy or insert into the editor

If the focused field can’t accept insert, transformed JSON is **copied to the clipboard** instead (badge shows `CPY`).

## Prerequisites

- Node.js 18+
- Yarn Classic (`yarn -v`)
- Google Chrome

```bash
node -v
yarn -v
```

## Setup

```bash
cd json-paste-tools
yarn install
```

## Run

**Daily use (no server):**

```bash
yarn build
```

Then load **`dist/`** in Chrome (see below). You can close the terminal.

**While developing:**

```bash
yarn dev
```

Keep the terminal running; reload the extension after bigger changes.

> Load **`dist/`**, not the project root.  
> After `yarn build`, prefer that over a stopped `yarn dev` session (dev mode needs the Vite server).

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `json-paste-tools/dist`
4. Pin the extension (optional)

### Quick test

1. Copy some JSON, e.g. `{"b":2,"a":1}`
2. Focus a textarea on any site
3. Right‑click → **JSON Paste Tools** → **Paste JSON formatted**
4. Or open the popup → **From clipboard** → **Format** / **Minify**

## Project structure

```text
json-paste-tools/
├── src/
│   ├── shared/          # JSON transform, timestamps, settings, inject
│   ├── background/      # Context menus, shortcuts, clipboard, paste
│   ├── content/         # Last-focused field tracker
│   ├── offscreen/       # Clipboard read/write helper page
│   └── popup/           # React popup UI
├── docs/
│   └── HOW_WE_BUILT_THIS.md
├── public/icons/
├── dist/                # Load this in Chrome
├── manifest.config.ts
└── README.md
```

## Scripts

| Command | Description |
| --- | --- |
| `yarn install` | Install dependencies |
| `yarn dev` | Watch build → `dist/` (needs server) |
| `yarn build` | Typecheck + production build → `dist/` |

## License

MIT — see [LICENSE](LICENSE).
