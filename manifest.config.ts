import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "JSON Paste Tools",
  version: "1.0.0",
  description:
    "Paste clipboard JSON minified or formatted. Validate, pretty-print, and minify from the popup.",
  permissions: [
    "storage",
    "contextMenus",
    "clipboardRead",
    "clipboardWrite",
    "activeTab",
    "scripting",
    "offscreen"
  ],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/focusTracker.ts"],
      run_at: "document_idle"
    }
  ],
  action: {
    default_popup: "src/popup/index.html",
    default_title: "JSON Paste Tools",
    default_icon: {
      "16": "public/icons/icon16.png",
      "32": "public/icons/icon32.png",
      "48": "public/icons/icon48.png"
    }
  },
  commands: {
    "paste-json-minified": {
      suggested_key: {
        default: "Ctrl+Shift+M",
        mac: "Command+Shift+M"
      },
      description: "Paste clipboard JSON minified"
    },
    "paste-json-formatted": {
      suggested_key: {
        default: "Ctrl+Shift+U",
        mac: "Command+Shift+U"
      },
      description: "Paste clipboard JSON formatted (pretty)"
    },
    "open-json-tools": {
      description: "Open JSON Paste Tools popup"
    }
  },
  icons: {
    "16": "public/icons/icon16.png",
    "32": "public/icons/icon32.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
});
