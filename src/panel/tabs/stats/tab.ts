// src/panel/tabs/stats/tab.ts
import type { Dom } from "../../app/dom";
import type { PanelCache } from "../../app/cache";
import type { createBus } from "../../app/bus";

import { createStatsModel } from "./model";
import { createStatsView } from "./view";
import { STATS_KEY, getStats } from "../../app/statsStore";

import type { StorageChanges } from "../../../shared/platform/storage";
import { storageOnChangedAdd, storageOnChangedRemove } from "../../../shared/platform/storage";

type Bus = ReturnType<typeof createBus>;

export function createStatsTab(dom: Dom, _bus: Bus, cache: PanelCache) {
  const model = createStatsModel();
  const view = createStatsView(dom);

  let unsubCache: (() => void) | null = null;
  let offStorage: (() => void) | null = null;

  async function pullDeletesFromStorage() {
    const s = await getStats();
    model.setDeletes({
      deletedChats: s.deletedChats,
      deletedProjects: s.deletedProjects,
    });
  }

  async function recalcFromCache(reason: string) {
    const snap = cache.getSnapshot();
    const report = model.compute(snap);
    view.render(report);
    view.setStatus(reason);
  }

  function bindStorageListener() {
    const handler = (changes: StorageChanges, area: string) => {
      if (area !== "local") return;
      if (!changes[STATS_KEY]) return;

      pullDeletesFromStorage()
        .then(() => recalcFromCache("Updated (storage)"))
        .catch(() => view.setStatus("Stats storage update failed"));
    };

    storageOnChangedAdd(handler);
    return () => storageOnChangedRemove(handler);
  }

  function bind() {
    dom.btnStatsRecalc.addEventListener("click", () => {
      recalcFromCache("Recalculated").catch(() => view.setStatus("Recalc failed"));
    });
  }

  return {
    id: "stats" as const,

    async mount() {
      view.setStatus("Loading…");

      // initial load of persistent counters
      await pullDeletesFromStorage().catch(() => {});

      // live storage updates (delete counters)
      if (!offStorage) offStorage = bindStorageListener();

      // live cache updates
      if (!unsubCache) {
        unsubCache = cache.subscribe(() => {
          recalcFromCache("Updated from cache").catch(() => view.setStatus("Update failed"));
        });
      }

      await recalcFromCache("Ready");
    },

    unmount() {
      // keep UI
    },

    bind,

    dispose() {
      if (unsubCache) unsubCache();
      unsubCache = null;

      if (offStorage) offStorage();
      offStorage = null;
    },
  };
}
