// src/panel/app/refreshAll.ts

export function requestRefreshAll() {
  // Your panel.ts already listens to this:
  // window.addEventListener("cgo:refreshAll", ...)
  window.dispatchEvent(new Event("cgo:refreshAll"));
}
