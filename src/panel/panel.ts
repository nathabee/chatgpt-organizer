// src/panel/panel.ts

import { getDom } from "./app/dom";
import { createBus } from "./app/bus";
import { createTabs } from "./app/tabs";

import { createPanelCache } from "./app/cache";

import { createSingleTab } from "./tabs/single/tab";
import { createProjectsTab } from "./tabs/projects/tab";
import { createOrganizeTab } from "./tabs/organize/tab";
import { createSearchTab } from "./tabs/search/tab";
import { createLogsTab } from "./tabs/logs/tab";
import { createStatsTab } from "./tabs/stats/tab";
import { storageGet, storageSet } from "../shared/platform/storage";
import { getBusy } from "./app/state";

const SCOPE_KEY = "cgo.scopeUpdatedSince"; // YYYY-MM-DD

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDay(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function minusMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const origDay = d.getDate();

  d.setMonth(d.getMonth() - months);

  // JS month rollovers can jump (e.g. March 31 -> March 3). Clamp back.
  if (d.getDate() !== origDay) {
    d.setDate(0); // last day of previous month
  }
  return d;
}

function isValidIsoDay(s: string): boolean {
  // very light check; <input type="date"> already enforces format
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function waitNotBusy(maxMs = 10 * 60 * 1000) {
  const started = Date.now();
  while (getBusy()) {
    if (Date.now() - started > maxMs) return false;
    await sleep(120);
  }
  return true;
}

(async () => {
  const dom = getDom();

  const bus = createBus();
  bus.start();

  const cache = createPanelCache();

  const singleTab = createSingleTab(dom, bus, cache);
  const projectsTab = createProjectsTab(dom, bus, cache);
  const searchTab = createSearchTab(dom, bus, cache);
  const organizeTab = createOrganizeTab(dom, bus, cache);

  const logsTab = createLogsTab(dom, bus);
  const statsTab = createStatsTab(dom, bus, cache);

  singleTab.bind();
  projectsTab.bind();
  organizeTab.bind();
  searchTab.bind();
  logsTab.bind();
  statsTab.bind();

  const tabs = createTabs(dom, {
    single: singleTab,
    projects: projectsTab,
    organize: organizeTab,
    search: searchTab,
    logs: logsTab,
    stats: statsTab,
  });

  tabs.bind();
  tabs.boot();

  // -----------------------------
  // Global scope controller
  // -----------------------------

  // Make legacy "list" triggers invisible (keep them in DOM to avoid breaking wiring)
  // You can remove them later once the scope refresh is fully adopted everywhere.
  dom.btnListSingle.hidden = true;
  dom.btnListProjects.hidden = true;
  dom.btnSearchListSingle.hidden = true;
  dom.btnSearchListProjects.hidden = true;

  let scopeIso = ""; // YYYY-MM-DD

  function isCacheEmpty() {
    const snap = cache.getSnapshot();
    const total =
      (snap.counts?.singleChats ?? 0) +
      (snap.counts?.projects ?? 0) +
      (snap.counts?.projectChats ?? 0);
    return total === 0;
  }

  function pushScopeToCacheMeta(iso: string) {
    const anyCache = cache as any;
    if (typeof anyCache.setScopeUpdatedSince === "function") {
      anyCache.setScopeUpdatedSince(iso);
    }
  }

  function applyScopeToUI(iso: string) {
    if (isCacheEmpty()) {
      dom.scopeLabelEl.textContent = "No data loaded — set scope & refresh";
      dom.scopeLabelEl.classList.add("is-warn");
    } else {
      dom.scopeLabelEl.textContent = iso ? `Updated since ${iso}` : "Updated since —";
      dom.scopeLabelEl.classList.remove("is-warn");
    }

    // IMPORTANT:
    // scopeDateEl is inside the dialog. Do NOT overwrite it while the dialog is open
    // (otherwise cache updates / refreshes can clobber what the user is typing).
    if (!dom.scopeDialogEl.open) {
      dom.scopeDateEl.value = iso || "";
    }
  }

  async function loadScope(): Promise<string> {
    const res = await storageGet([SCOPE_KEY]).catch(() => ({} as any));
    const raw = (res as any)?.[SCOPE_KEY];
    if (typeof raw === "string" && isValidIsoDay(raw)) return raw;

    // default: today - 3 months
    return toIsoDay(minusMonths(new Date(), 3));
  }


  async function saveScope(iso: string) {
    await storageSet({ [SCOPE_KEY]: iso }).catch(() => null);
  }


  async function refreshAllUsingCurrentScope() {
    if (getBusy()) return;

    singleTab.refresh();
    const ok1 = await waitNotBusy();
    if (!ok1) return;

    projectsTab.refresh();
    await waitNotBusy();
  }

  function openScopeDialog() {
    if (getBusy()) return;

    // prefill with current scope
    dom.scopeDateEl.value = scopeIso || "";

    try {
      dom.scopeDialogEl.showModal();
    } catch {
      // If <dialog> is blocked for some reason, do nothing.
    }
  }

  function closeScopeDialog() {
    try {
      dom.scopeDialogEl.close();
    } catch {
      // ignore
    }
  }

  // boot scope
  scopeIso = await loadScope();
  pushScopeToCacheMeta(scopeIso);
  applyScopeToUI(scopeIso);

  // wire buttons

  window.addEventListener("cgo:refreshAll", () => {
    refreshAllUsingCurrentScope().catch(() => { });
  });


  dom.btnScopeChange.addEventListener("click", () => {
    openScopeDialog();
  });

  dom.btnScopeRefresh.addEventListener("click", () => {
    refreshAllUsingCurrentScope().catch(() => { });
  });

  dom.btnScopeCancel.addEventListener("click", () => {
    // restore previous scope in the input and close
    dom.scopeDateEl.value = scopeIso || "";
    closeScopeDialog();
  });

  dom.btnScopeApply.addEventListener("click", () => {
    const iso = dom.scopeDateEl.value || "";
    if (!isValidIsoDay(iso)) return;

    scopeIso = iso;

    pushScopeToCacheMeta(scopeIso);
    applyScopeToUI(scopeIso);

    saveScope(scopeIso).catch(() => { });
    closeScopeDialog();

    // validating implies refresh
    refreshAllUsingCurrentScope().catch(() => { });
  });

  // Optional: allow Enter to validate quickly when focused inside dialog
  dom.scopeDialogEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.target as HTMLElement)?.tagName === "INPUT") {
      e.preventDefault();
      dom.btnScopeApply.click();
    }
  });

  cache.subscribe(() => {
    const snap = cache.getSnapshot();

    dom.scopeLoadedSinglesEl.textContent = String(snap.counts.singleChats);
    dom.scopeLoadedProjectsEl.textContent = String(snap.counts.projects);
    dom.scopeLoadedProjectChatsEl.textContent = String(snap.counts.projectChats);

    applyScopeToUI(scopeIso);
  });
})();
