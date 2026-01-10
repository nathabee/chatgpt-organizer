// demo/src/mocks/storage.ts
export type StorageChange = { oldValue?: any; newValue?: any };
export type StorageChanges = Record<string, StorageChange>;
export type StorageChangedHandler = (changes: StorageChanges, areaName: string) => void;


console.log("[cgo-demo] mock storage loaded");


const mem = new Map<string, any>();
const changed = new Set<StorageChangedHandler>();

function notify(changes: StorageChanges) {
  for (const h of changed) h(changes, "local");
}

export async function storageGet<T = any>(
  keys: string | string[] | Record<string, any>
): Promise<T> {
  if (typeof keys === "string") {
    return { [keys]: mem.get(keys) } as any;
  }
  if (Array.isArray(keys)) {
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = mem.get(k);
    return out as any;
  }
  // object shape => defaults
  const out: Record<string, any> = {};
  for (const [k, def] of Object.entries(keys)) out[k] = mem.has(k) ? mem.get(k) : def;
  return out as any;
}

export async function storageSet(items: Record<string, any>): Promise<void> {
  const changes: StorageChanges = {};
  for (const [k, v] of Object.entries(items)) {
    const oldValue = mem.get(k);
    mem.set(k, v);
    changes[k] = { oldValue, newValue: v };
  }
  notify(changes);
}

export async function storageRemove(keys: string | string[]): Promise<void> {
  const ks = Array.isArray(keys) ? keys : [keys];
  const changes: StorageChanges = {};
  for (const k of ks) {
    const oldValue = mem.get(k);
    mem.delete(k);
    changes[k] = { oldValue, newValue: undefined };
  }
  notify(changes);
}

export function storageOnChangedAdd(handler: StorageChangedHandler): void {
  changed.add(handler);
}

export function storageOnChangedRemove(handler: StorageChangedHandler): void {
  changed.delete(handler);
}
