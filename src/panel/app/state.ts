// src/panel/app/state.ts
import type { Dom } from "./dom";

let isBusy = false;

export function getBusy() {
  return isBusy;
}

export function setBusy(dom: Dom, next: boolean) {
  isBusy = next;

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

  Array.from(document.querySelectorAll<HTMLInputElement>("input[type='checkbox']")).forEach((cb) => {
    cb.disabled = next;
  });
}
