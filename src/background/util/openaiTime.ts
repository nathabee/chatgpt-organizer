// src/background/util/openaiTime.ts
//
// Helpers to normalize OpenAI/ChatGPT API time fields into ms epoch.
// We keep this separate from util/time.ts because it depends on API field shapes.

export function parseTimeToMs(v: unknown): number | undefined {
  if (v == null) return undefined;

  if (typeof v === "number" && Number.isFinite(v)) {
    // heuristics: values might be seconds or milliseconds
    if (v > 1e12) return Math.floor(v);        // ms
    if (v > 1e10) return Math.floor(v);        // ms-ish
    return Math.floor(v * 1000);               // seconds -> ms
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;

    const n = Number(s);
    if (Number.isFinite(n)) return parseTimeToMs(n);

    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;
    return undefined;
  }

  return undefined;
}

/** Uses update_time first, then create_time. */
export function rowUpdatedMs(row: any): number | undefined {
  return parseTimeToMs(row?.update_time) ?? parseTimeToMs(row?.create_time);
}
