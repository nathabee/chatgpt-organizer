import type { Dom } from "../../app/dom";
import type { createBus } from "../../app/bus";

type Bus = ReturnType<typeof createBus>;

export function createSearchTab(_dom: Dom, _bus: Bus) {
  function bind() {
    // no-op for now
  }

  return {
    id: "search" as const,
    mount() {},
    unmount() {},
    bind,
    dispose() {},
  };
}
