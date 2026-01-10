// demo/src/mocks/runtime.ts
import type { AnyEvent } from "../../../src/shared/messages";
import type { AnyRequest } from "../../../src/shared/messages/requests";
import { handleRequest } from "./handlers";

type RuntimeMessageHandler = (msg: AnyEvent) => void;

// Single source of truth
const listeners = new Set<RuntimeMessageHandler>();

console.log("[CGO DEMO] mock runtime loaded");

// Keep this export because other demo code may use it
export function emitEvent(ev: AnyEvent) {
  console.log("[CGO DEMO] emitEvent", ev);
  for (const h of listeners) h(ev);
}

export function runtimeOnMessageAdd(handler: RuntimeMessageHandler): void {
  console.log("[CGO DEMO] runtimeOnMessageAdd");
  listeners.add(handler);
}

export function runtimeOnMessageRemove(handler: RuntimeMessageHandler): void {
  console.log("[CGO DEMO] runtimeOnMessageRemove");
  listeners.delete(handler);
}

/**
 * Mock for chrome.runtime.sendMessage
 * IMPORTANT: must return the response shape the panel expects.
 */
export async function runtimeSend<T = any>(msg: AnyRequest): Promise<T> {
  console.log("[CGO DEMO] runtimeSend IN", msg);

  // handleRequest can be sync or async; support both
  const res = await Promise.resolve(handleRequest(msg, { emitEvent }));

  console.log("[CGO DEMO] runtimeSend OUT", res);
  return res as T;
}
