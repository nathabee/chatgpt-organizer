// src/panel/app/refreshAll.ts

export type RefreshAllReason = "user" | "auto" | "create" | "unknown";

export function requestRefreshAll(reason: RefreshAllReason = "auto") {
  // Default is now "auto" so it is blocked by the panel.ts guard.
  window.dispatchEvent(new CustomEvent("cgo:refreshAll", { detail: { reason } }));
}
