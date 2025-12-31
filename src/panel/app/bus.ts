// src/panel/app/bus.ts
import type { AnyEvent } from "../../shared/messages";

type Handler = (msg: AnyEvent) => void;

export function createBus() {
  const handlers = new Set<Handler>();

  function on(handler: Handler) {
    handlers.add(handler);
    return () => handlers.delete(handler);
  }

  function start() {
    chrome.runtime.onMessage.addListener((msg: AnyEvent) => {
      for (const h of handlers) h(msg);
    });
  }

  return { on, start };
}
