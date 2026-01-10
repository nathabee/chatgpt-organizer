// src/panel/app/bus.ts 
import type { AnyEvent } from "../../shared/messages";
import { runtimeOnMessageAdd, runtimeOnMessageRemove } from "../platform/runtime";

type Handler = (msg: AnyEvent) => void;

export function createBus() {
  const handlers = new Set<Handler>();

  function on(handler: Handler) {
    handlers.add(handler);
    return () => handlers.delete(handler);
  }

  function start() {
    const listener = (msg: AnyEvent) => {
      for (const h of handlers) h(msg);
    };

    runtimeOnMessageAdd(listener);

    // optional: expose cleanup if you ever need it
    // return () => runtimeOnMessageRemove(listener);
  }

  return { on, start };
}
