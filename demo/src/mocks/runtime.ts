// demo/src/mocks/runtime.ts
import type { AnyEvent } from "../../../src/shared/messages";
import type { AnyRequest } from "../../../src/shared/messages/requests";
import { handleRequest } from "./handlers";
import * as debugTrace from "../../../src/shared/debugTrace";

type RuntimeMessageHandler = (msg: AnyEvent) => void;

// Single source of truth
const listeners = new Set<RuntimeMessageHandler>();

export function emitEvent(ev: AnyEvent) {
  // Copy to avoid edge cases if a handler removes itself while iterating
  for (const h of Array.from(listeners)) h(ev);
}

export function runtimeOnMessageAdd(handler: RuntimeMessageHandler): void {
  listeners.add(handler);
}

export function runtimeOnMessageRemove(handler: RuntimeMessageHandler): void {
  listeners.delete(handler);
}

/**
 * Mock for chrome.runtime.sendMessage
 * IMPORTANT: must return the response shape the panel expects.
 */
export async function runtimeSend<T = any>(msg: AnyRequest): Promise<T> {
  const type = (msg as any)?.type ?? "unknown";
 
  void debugTrace.append({
    scope: "demo",
    kind: "debug",
    message: "runtimeSend:IN",
    meta: {
      type,
      msg,
      stack: String(new Error().stack || "").split("\n").slice(0, 8).join("\n"),
    },
  });

  const res = await Promise.resolve(handleRequest(msg));
 
  void debugTrace.append({
    scope: "demo",
    kind: "debug",
    message: "runtimeSend:OUT",
    meta: { type, res },
  });

  return res as T;
}
