import type { Dom } from "../../app/dom";
import type { createBus } from "../../app/bus";

type Bus = ReturnType<typeof createBus>;

export function createStatsTab(_dom: Dom, _bus: Bus) {
  function bind() {
    // no-op for now
  }

  return {
    id: "stats" as const,
    mount() {},
    unmount() {},
    bind,
    dispose() {},
  };
}
