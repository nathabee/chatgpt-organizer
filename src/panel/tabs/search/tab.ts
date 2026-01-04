// src/panel/tabs/search/tab.ts
import type { Dom } from "../../app/dom";
import type { createBus } from "../../app/bus";
import type { PanelCache } from "../../app/cache";

import { createSearchModel } from "./model";
import { createSearchView } from "./view";

type Bus = ReturnType<typeof createBus>;

export function createSearchTab(dom: Dom, _bus: Bus, cache: PanelCache) {
  const model = createSearchModel();
  const view = createSearchView(dom);

  function renderFromSnapshot() {
    const snap = cache.getSnapshot();
    model.setSnapshot(snap);

    const res = model.search();

    // "Results: X"
    dom.searchResultsCountEl.textContent = String(res.totalMatches);

    view.render({
      loaded: snap.counts,
      limits: {
        singleLimit: snap.meta.singleLimit,
        projectsLimit: snap.meta.projectsLimit,
        projectsChatsLimit: snap.meta.projectsChatsLimit,
      },
      query: res.query,
      results: res.items,
    });
  }

  const unsub = cache.subscribe(() => {
    renderFromSnapshot();
  });

  function applyFiltersFromUI() {
    // Your HTML uses <option value="projects">Projects</option>
    // The model uses "project" (singular). Normalize here.
    const rawScope = dom.searchScopeEl.value;
    const scope = (rawScope === "projects" ? "project" : rawScope) as any;

    model.setFilters({
      scope,
      archived: dom.searchArchivedEl.value as any,
      updatedWithin: dom.searchUpdatedWithinEl.value as any,
      updatedAfter: dom.searchUpdatedAfterEl.value || "",
      updatedBefore: dom.searchUpdatedBeforeEl.value || "",
      createdWithin: dom.searchCreatedWithinEl.value as any,
      createdAfter: dom.searchCreatedAfterEl.value || "",
      createdBefore: dom.searchCreatedBeforeEl.value || "",
    });
  }

  function rerender() {
    applyFiltersFromUI();
    model.setQuery(dom.searchQueryEl.value || "");
    renderFromSnapshot();
  }

  function resetFiltersUI() {
    dom.searchScopeEl.value = "all";
    dom.searchArchivedEl.value = "include"; // matches your HTML default
    dom.searchUpdatedWithinEl.value = "any";
    dom.searchUpdatedAfterEl.value = "";
    dom.searchUpdatedBeforeEl.value = "";
    dom.searchCreatedWithinEl.value = "any";
    dom.searchCreatedAfterEl.value = "";
    dom.searchCreatedBeforeEl.value = "";
  }

  function bind() {
    // query
    dom.searchQueryEl.addEventListener("input", () => rerender());

    dom.btnSearchClear.addEventListener("click", () => {
      dom.searchQueryEl.value = "";
      dom.searchQueryEl.focus();
      rerender();
    });

    // filters
    dom.searchScopeEl.addEventListener("change", () => rerender());
    dom.searchArchivedEl.addEventListener("change", () => rerender());
    dom.searchUpdatedWithinEl.addEventListener("change", () => rerender());
    dom.searchUpdatedAfterEl.addEventListener("change", () => rerender());
    dom.searchUpdatedBeforeEl.addEventListener("change", () => rerender());
    dom.searchCreatedWithinEl.addEventListener("change", () => rerender());
    dom.searchCreatedAfterEl.addEventListener("change", () => rerender());
    dom.searchCreatedBeforeEl.addEventListener("change", () => rerender());

    // reset filters button
    dom.btnSearchResetFilters.addEventListener("click", () => {
      resetFiltersUI();
      rerender();
    });

    // Info box actions (trigger the same "list" as Single/Projects tabs)
    // NOTE: this needs bus messages already used in your other tabs.
    // If your Single/Projects tabs already send list actions through bus,
    // wire them here similarly. For now we trigger click on existing buttons.

    //dom.btnSearchListSingle.addEventListener("click", () => {
    // reuse existing Single tab button (already wired)
    //  dom.btnListSingle.click();
    //});

    //dom.btnSearchListProjects.addEventListener("click", () => {
    // reuse existing Projects tab button (already wired)
    // dom.btnListProjects.click();
    //});
  }

  return {
    id: "search" as const,

    mount() {
      const snap = cache.getSnapshot();
      const hasData =
        (snap.counts.singleChats || 0) > 0 ||
        (snap.counts.projects || 0) > 0 ||
        (snap.counts.projectChats || 0) > 0;

      if (!hasData) {
        view.setStatus("No data loaded. Use Scope → Refresh.");
        dom.searchResultsCountEl.textContent = "0";
        return;
      }

      // If you *do* have data, render immediately
      rerender();
    }
    ,


    unmount() { },
    bind,
    dispose() {
      unsub();
    },
  };
}
