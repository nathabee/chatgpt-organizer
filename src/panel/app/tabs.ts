// src/panel/app/tabs.ts
import type { Dom } from "./dom";

export type TabId = "single" | "projects";

export type Tab = {
  id: TabId;
  mount(): void;
  unmount(): void;
};

export function createTabs(dom: Dom, tabs: Record<TabId, Tab>) {
  let active: TabId = "single";

  function setTabUI(next: TabId) {
    const isSingle = next === "single";

    dom.tabSingle.classList.toggle("is-active", isSingle);
    dom.tabSingle.setAttribute("aria-selected", String(isSingle));

    dom.tabProjects.classList.toggle("is-active", !isSingle);
    dom.tabProjects.setAttribute("aria-selected", String(!isSingle));

    dom.viewSingle.hidden = !isSingle;
    dom.viewProjects.hidden = isSingle;
  }

  function switchTo(next: TabId) {
    if (next === active) return;
    tabs[active].unmount();
    active = next;
    setTabUI(active);
    tabs[active].mount();
  }

  function bind() {
    dom.tabSingle.addEventListener("click", () => switchTo("single"));
    dom.tabProjects.addEventListener("click", () => switchTo("projects"));
  }

  function boot() {
    setTabUI(active);
    tabs[active].mount();
  }

  return { bind, boot, switchTo };
}
