export interface TimestampSuccess {
  ok: true;
  /** Primary converted value as string. */
  output: string;
  details: {
    iso: string;
    unixSeconds: number;
    unixMilliseconds: number;
    local: string;
    utc: string;
  };
}

export interface TimestampFailure {
  ok: false;
  error: string;
}

export type TimestampResult = TimestampSuccess | TimestampFailure;

function isLikelyMs(n: number): boolean {
  // Seconds since ~2001..2100 are ~1e9..4e9; ms are ~1e12..4e12
  return Math.abs(n) >= 1e11;
}

function fromDate(date: Date): TimestampResult {
  const ms = date.getTime();
  if (Number.isNaN(ms)) {
    return { ok: false, error: "Invalid date" };
  }
  const iso = date.toISOString();
  return {
    ok: true,
    output: iso,
    details: {
      iso,
      unixSeconds: Math.floor(ms / 1000),
      unixMilliseconds: ms,
      local: date.toString(),
      utc: date.toUTCString()
    }
  };
}

/**
 * Parse a timestamp input:
 * - Unix seconds or milliseconds (number / numeric string)
 * - ISO 8601 / Date-parseable strings
 */
export function parseTimestampInput(raw: string): TimestampResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a timestamp or ISO date" };
  }

  if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      return { ok: false, error: "Not a valid number" };
    }
    const ms = isLikelyMs(n) ? n : n * 1000;
    return fromDate(new Date(ms));
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      error:
        "Could not parse. Use unix (s/ms) or an ISO date like 2026-10-18T12:00:00.000Z"
    };
  }
  return fromDate(date);
}

/** Convert input → ISO UTC string. */
export function toIsoUtc(raw: string): TimestampResult {
  const parsed = parseTimestampInput(raw);
  if (!parsed.ok) return parsed;
  return { ...parsed, output: parsed.details.iso };
}

/** Convert input → unix milliseconds (string). */
export function toUnixMilliseconds(raw: string): TimestampResult {
  const parsed = parseTimestampInput(raw);
  if (!parsed.ok) return parsed;
  return { ...parsed, output: String(parsed.details.unixMilliseconds) };
}

/** Convert input → unix seconds (string). */
export function toUnixSeconds(raw: string): TimestampResult {
  const parsed = parseTimestampInput(raw);
  if (!parsed.ok) return parsed;
  return { ...parsed, output: String(parsed.details.unixSeconds) };
}
