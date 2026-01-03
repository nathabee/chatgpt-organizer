// src/panel/app/tabs.ts
import type { Dom } from "./dom";

export type TabId = "single" | "projects" | "organize" | "search" | "logs" | "stats";


export type Tab = {
  id: TabId;
  mount(): void;
  unmount(): void;
};

export function createTabs(dom: Dom, tabs: Record<TabId, Tab>) {
  let active: TabId = "single";

  function setTabUI(next: TabId) {
    const is = (id: TabId) => next === id;

    dom.tabSingle.classList.toggle("is-active", is("single"));
    dom.tabSingle.setAttribute("aria-selected", String(is("single")));
    dom.viewSingle.hidden = !is("single");

    dom.tabProjects.classList.toggle("is-active", is("projects"));
    dom.tabProjects.setAttribute("aria-selected", String(is("projects")));
    dom.viewProjects.hidden = !is("projects");


    dom.tabSearch.classList.toggle("is-active", is("search"));
    dom.tabSearch.setAttribute("aria-selected", String(is("search")));
    dom.viewSearch.hidden = !is("search");


    dom.tabOrganize.classList.toggle("is-active", is("organize"));
    dom.tabOrganize.setAttribute("aria-selected", String(is("organize")));
    dom.viewOrganize.hidden = !is("organize");
    
    dom.tabLogs.classList.toggle("is-active", is("logs"));
    dom.tabLogs.setAttribute("aria-selected", String(is("logs")));
    dom.viewLogs.hidden = !is("logs");

    dom.tabStats.classList.toggle("is-active", is("stats"));
    dom.tabStats.setAttribute("aria-selected", String(is("stats")));
    dom.viewStats.hidden = !is("stats");
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
    dom.tabOrganize.addEventListener("click", () => switchTo("organize"));
    dom.tabSearch.addEventListener("click", () => switchTo("search"));
    dom.tabLogs.addEventListener("click", () => switchTo("logs"));
    dom.tabStats.addEventListener("click", () => switchTo("stats"));
  }


  function boot() {
    setTabUI(active);
    tabs[active].mount();
  }

  return { bind, boot, switchTo };
}
