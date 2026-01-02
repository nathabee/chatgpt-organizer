// src/shared/actionLog.ts
export type ActionLogKind =
  | "delete_chat"
  | "delete_project"
  | "move_chat"
  | "run"
  | "info"
  | "error"
  | "debug";

export type ActionLogScope =
  | "single"
  | "projects"
  | "organize"
  | "search"
  | "stats"
  | "logs"
  | "background";

export type ActionLogEntry = {
  id: string;          // unique id
  ts: number;          // Date.now()
  kind: ActionLogKind;
  scope: ActionLogScope;

  message: string;

  ok?: boolean;
  status?: number;
  error?: string;

  chatId?: string;
  chatTitle?: string;

  projectId?: string;
  projectTitle?: string;

  meta?: Record<string, unknown>;
};

const STORAGE_KEY = "cgo.actionLog";
const DEBUG_KEY = "cgo.debugEnabled";
const DEFAULT_MAX = 5000;

function ensureChromeStorage() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    throw new Error("chrome.storage.local is not available in this context.");
  }
}

function makeId(): string {
  // stable enough: timestamp + random
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toArray<T>(x: T | T[]): T[] {
  return Array.isArray(x) ? x : [x];
}

async function getRaw(): Promise<ActionLogEntry[]> {
  ensureChromeStorage();
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const v = (res as any)?.[STORAGE_KEY];
  if (!Array.isArray(v)) return [];
  return v as ActionLogEntry[];
}

async function setRaw(entries: ActionLogEntry[]): Promise<void> {
  ensureChromeStorage();
  await chrome.storage.local.set({ [STORAGE_KEY]: entries });
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/** Debug toggle (stored in chrome.storage.local) */
export async function getDebugEnabled(): Promise<boolean> {
  ensureChromeStorage();
  const res = await chrome.storage.local.get(DEBUG_KEY);
  return !!(res as any)?.[DEBUG_KEY];
}

export async function setDebugEnabled(next: boolean): Promise<void> {
  ensureChromeStorage();
  await chrome.storage.local.set({ [DEBUG_KEY]: !!next });
}

export type ListOptions = {
  limit?: number;         // default 200
  offset?: number;        // default 0
  reverse?: boolean;      // default true (newest first)
  kind?: ActionLogKind;
  scope?: ActionLogScope;
  sinceTs?: number;
  untilTs?: number;
};

export type ListResult = {
  total: number;
  items: ActionLogEntry[];
};

export async function append(
  entryOrEntries: Omit<ActionLogEntry, "id" | "ts"> | Omit<ActionLogEntry, "id" | "ts">[],
  opts?: { max?: number }
): Promise<{ total: number }> {
  const max = clampInt(opts?.max ?? DEFAULT_MAX, 100, 50000);

  // If debug is OFF, ignore debug entries.
  // (run/error/info/etc still go through)
  const dbg = await getDebugEnabled().catch(() => false);

  const incomingAll = toArray(entryOrEntries);

  const incoming = incomingAll
    .filter((e) => (e.kind === "debug" ? dbg : true))
    .map((e) => ({
      ...e,
      id: makeId(),
      ts: Date.now(),
    }));

  if (!incoming.length) {
    // no-op (e.g. debug entry while debug disabled)
    const current = await getRaw();
    return { total: current.length };
  }

  const current = await getRaw();
  const merged = current.concat(incoming);

  // hard cap: keep last N (newest)
  const capped = merged.length > max ? merged.slice(merged.length - max) : merged;

  await setRaw(capped);
  return { total: capped.length };
}

export async function list(opts?: ListOptions): Promise<ListResult> {
  const limit = clampInt(opts?.limit ?? 200, 1, 50000);
  const offset = clampInt(opts?.offset ?? 0, 0, 1_000_000);
  const reverse = opts?.reverse ?? true;

  const all = await getRaw();

  let filtered = all;

  if (opts?.kind) filtered = filtered.filter((x) => x.kind === opts.kind);
  if (opts?.scope) filtered = filtered.filter((x) => x.scope === opts.scope);
  if (typeof opts?.sinceTs === "number") filtered = filtered.filter((x) => x.ts >= opts.sinceTs!);
  if (typeof opts?.untilTs === "number") filtered = filtered.filter((x) => x.ts <= opts.untilTs!);

  const total = filtered.length;

  if (reverse) filtered = filtered.slice().reverse();

  const items = filtered.slice(offset, offset + limit);
  return { total, items };
}

export async function trim(opts: { keepLast?: number; beforeTs?: number }): Promise<{ total: number }> {
  const all = await getRaw();

  let next = all;

  if (typeof opts.beforeTs === "number") {
    next = next.filter((x) => x.ts >= opts.beforeTs!);
  }

  if (typeof opts.keepLast === "number") {
    const keep = clampInt(opts.keepLast, 0, 50000);
    if (keep === 0) next = [];
    else if (next.length > keep) next = next.slice(next.length - keep);
  }

  await setRaw(next);
  return { total: next.length };
}

export async function clear(): Promise<void> {
  ensureChromeStorage();
  await chrome.storage.local.remove(STORAGE_KEY);
}

export async function exportJson(opts?: { pretty?: boolean }): Promise<string> {
  const all = await getRaw();
  return JSON.stringify(all, null, opts?.pretty ? 2 : 0);
}
