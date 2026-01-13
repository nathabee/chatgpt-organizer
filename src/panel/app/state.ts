// src/panel/app/state.ts
import type { Dom } from "./dom";

let busyCount = 0;

export function getBusy(): boolean {
  return busyCount > 0;
}

/**
 * Nest-safe busy wrapper.
 * Use this for async actions that complete within the same call stack (await chain),
 * e.g. list/fetch operations.
 */
export async function withBusy<T>(dom: Dom, fn: () => Promise<T>): Promise<T> {
  beginBusy(dom);
  try {
    return await fn();
  } finally {
    endBusy(dom);
  }
}

/**
 * Direct busy control for event-driven flows (progress/done messages).
 * - setBusy(true) increments the busy counter (nest-safe)
 * - setBusy(false) clears busy completely (hard reset)
 *
 * This prevents “stuck busy” when an event-driven run finishes.
 */
export function setBusy(dom: Dom, next: boolean): void {
  if (next) {
    beginBusy(dom);
    return;
  }
  // hard reset (event-driven completion)
  busyCount = 0;
  applyBusy(dom, false);
}

function beginBusy(dom: Dom): void {
  busyCount++;
  if (busyCount === 1) applyBusy(dom, true);
}

function endBusy(dom: Dom): void {
  if (busyCount <= 0) {
    busyCount = 0;
    applyBusy(dom, false);
    return;
  }
  busyCount--;
  if (busyCount === 0) applyBusy(dom, false);
}

function applyBusy(dom: Dom, next: boolean): void {
  dom.scopeLoadingEl.classList.toggle("is-busy", next);

  // Global scope controls
  dom.btnScopeChange.disabled = next;
  dom.btnScopeRefresh.disabled = next;
  dom.scopeDateEl.disabled = next;
  dom.btnScopeCancel.disabled = next;
  dom.btnScopeApply.disabled = next;

  // Single tab controls
  dom.btnListSingle.disabled = next;
  dom.singleLimitEl.disabled = next;
  dom.cbSingleToggleAll.disabled = next;
  dom.btnSingleDelete.disabled = next;

  // Projects tab controls
  dom.btnListProjects.disabled = next;
  dom.projectsLimitEl.disabled = next;
  dom.projectsChatsLimitEl.disabled = next;
  dom.btnProjectsDelete.disabled = next;

  // Search tab controls
  dom.btnSearchListSingle.disabled = next;
  dom.btnSearchListProjects.disabled = next;
  dom.btnSearchResetFilters.disabled = next;
  dom.btnSearchClear.disabled = next;
  dom.searchQueryEl.disabled = next;

  // Organize tab controls
  dom.organizeSourceEl.disabled = next;
  dom.organizeFilterEl.disabled = next;
  dom.cbOrganizeToggleAll.disabled = next;

  dom.organizeProjectFilterEl.disabled = next;
  dom.btnOrganizeClearTarget.disabled = next;

  dom.btnOrganizeMove.disabled = next;
  dom.organizeCbConfirmEl.disabled = next;
  dom.organizeBtnConfirmExecute.disabled = next;
  dom.organizeBtnCancelExecute.disabled = next;
}
