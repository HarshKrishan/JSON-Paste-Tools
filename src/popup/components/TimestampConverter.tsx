import { useState } from "react";
import {
  toIsoUtc,
  toUnixMilliseconds,
  toUnixSeconds,
  type TimestampResult
} from "@/shared/timestamps";

interface TimestampConverterProps {
  onStatus: (kind: "ok" | "err" | "info", text: string) => void;
  onUseInEditor?: (text: string) => void;
}

export function TimestampConverter({
  onStatus,
  onUseInEditor
}: TimestampConverterProps) {
  const [input, setInput] = useState("");
  const [last, setLast] = useState<TimestampResult | null>(null);

  const apply = (result: TimestampResult, label: string) => {
    setLast(result);
    if (!result.ok) {
      onStatus("err", result.error);
      return;
    }
    setInput(result.output);
    onStatus("ok", label);
  };

  const copyOutput = async () => {
    if (!last?.ok) {
      onStatus("err", "Convert something first");
      return;
    }
    try {
      await navigator.clipboard.writeText(last.output);
      onStatus("ok", "Converted value copied");
    } catch {
      onStatus("err", "Could not write clipboard");
    }
  };

  return (
    <section className="panel">
      <h2>Timestamp</h2>
      <p className="hint">
        Unix seconds/ms ↔ ISO UTC. Numbers ≥ 1e11 are treated as milliseconds.
      </p>
      <input
        className="text-input"
        value={input}
        placeholder="1710000000 or 2026-10-18T12:00:00.000Z"
        spellCheck={false}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="row">
        <button
          type="button"
          className="primary"
          onClick={() => apply(toIsoUtc(input), "Converted to ISO UTC")}
        >
          → ISO UTC
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => apply(toUnixSeconds(input), "Converted to unix seconds")}
        >
          → Unix (s)
        </button>
        <button
          type="button"
          onClick={() =>
            apply(toUnixMilliseconds(input), "Converted to unix milliseconds")
          }
        >
          → Unix (ms)
        </button>
        <button type="button" onClick={() => void copyOutput()}>
          Copy result
        </button>
        {onUseInEditor ? (
          <button
            type="button"
            onClick={() => {
              if (!last?.ok) {
                onStatus("err", "Convert something first");
                return;
              }
              onUseInEditor(JSON.stringify(last.output));
              onStatus("ok", "Inserted into JSON editor");
            }}
          >
            Use in editor
          </button>
        ) : null}
      </div>
      {last?.ok ? (
        <dl className="ts-details">
          <div>
            <dt>ISO</dt>
            <dd>{last.details.iso}</dd>
          </div>
          <div>
            <dt>Unix (s)</dt>
            <dd>{last.details.unixSeconds}</dd>
          </div>
          <div>
            <dt>Unix (ms)</dt>
            <dd>{last.details.unixMilliseconds}</dd>
          </div>
          <div>
            <dt>UTC</dt>
            <dd>{last.details.utc}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
