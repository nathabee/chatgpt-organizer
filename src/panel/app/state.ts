// src/panel/app/state.ts
import type { Dom } from "./dom";

let isBusy = false;

export function getBusy() {
  return isBusy;
}

export function setBusy(dom: Dom, next: boolean) {
  isBusy = next;

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



  // ✅ add: Search tab “trigger list” buttons must follow busy too
  dom.btnSearchListSingle.disabled = next;
  dom.btnSearchListProjects.disabled = next;

  // (optional) also disable reset/clear to prevent UI confusion mid-run
  dom.btnSearchResetFilters.disabled = next;
  dom.btnSearchClear.disabled = next;
  dom.searchQueryEl.disabled = next;

  Array.from(document.querySelectorAll<HTMLInputElement>("input[type='checkbox']")).forEach((cb) => {
    cb.disabled = next;
  });
}
