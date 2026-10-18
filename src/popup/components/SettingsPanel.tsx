import type { JsonToolsSettings } from "@/shared/types";

interface SettingsPanelProps {
  settings: JsonToolsSettings;
  onChange: (next: JsonToolsSettings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <section className="settings">
      <h2>Preferences</h2>
      <label className="label">
        <span>Indent</span>
        <select
          value={settings.indent}
          onChange={(e) =>
            onChange({
              ...settings,
              indent: Number(e.target.value) as 2 | 4
            })
          }
        >
          <option value={2}>2 spaces</option>
          <option value={4}>4 spaces</option>
        </select>
      </label>
      <label className="label">
        <span>Sort object keys</span>
        <input
          type="checkbox"
          checked={settings.sortKeys}
          onChange={(e) =>
            onChange({ ...settings, sortKeys: e.target.checked })
          }
        />
      </label>
      <label className="label">
        <span>Trailing newline</span>
        <input
          type="checkbox"
          checked={settings.trailingNewline}
          onChange={(e) =>
            onChange({ ...settings, trailingNewline: e.target.checked })
          }
        />
      </label>
      <p className="hint">Shortcuts (editable in chrome://extensions/shortcuts):</p>
      <ul className="shortcuts">
        <li>
          <strong>Minify paste:</strong> Ctrl/⌘ + Shift + M
        </li>
        <li>
          <strong>Format paste:</strong> Ctrl/⌘ + Shift + U
        </li>
      </ul>
    </section>
  );
}
