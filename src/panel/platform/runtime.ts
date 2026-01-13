// src/panel/platform/runtime.ts
import type { AnyEvent } from "../../shared/messages";
import type { AnyRequest } from "../../shared/messages/requests";


// console.log("[cgo-demo] original runtime loaded");

/**
 * Panel runtime wrapper.
 * - runtimeSend: panel -> background requests (AnyRequest)
 * - runtimeOnMessage*: background -> panel events (AnyEvent)
 */

export type RuntimeMessageHandler = (msg: AnyEvent) => void;

export function runtimeSend<T = any>(msg: AnyRequest): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}

// Keep a stable mapping so remove() works even if we wrap handlers.
const handlerMap = new Map<RuntimeMessageHandler, (...args: any[]) => any>();

export function runtimeOnMessageAdd(handler: RuntimeMessageHandler): void {
  const wrapped = (msg: AnyEvent, _sender: any, _sendResponse: any) => handler(msg);
  handlerMap.set(handler, wrapped);
  chrome.runtime.onMessage.addListener(wrapped);
}

export function runtimeOnMessageRemove(handler: RuntimeMessageHandler): void {
  const wrapped = handlerMap.get(handler);
  if (!wrapped) return;
  chrome.runtime.onMessage.removeListener(wrapped);
  handlerMap.delete(handler);
}
