// src/panel/tabs/search/view.ts
import type { Dom } from "../../app/dom";
import type { SearchResultItem } from "./model";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function buildBadges(chat: { isArchived?: boolean; updateTime?: string; createTime?: string }) {
  const bits: string[] = [];

  if (chat.isArchived === true) bits.push(`<span class="badge badge--arch" title="Archived">A</span>`);

  const u = fmtDate(chat.updateTime);
  if (u) bits.push(`<span class="badge badge--date" title="Updated">u:${esc(u)}</span>`);

  const c = fmtDate(chat.createTime);
  if (c) bits.push(`<span class="badge badge--date" title="Created">c:${esc(c)}</span>`);

  return bits.length ? `<span class="searchBadges">${bits.join("")}</span>` : "";
}

export type RenderArgs = {
  loaded: {
    singleChats: number;
    projects: number;
    projectChats: number;
    totalChats: number;
  };
  limits: {
    singleLimit?: number;
    projectsLimit?: number;
    projectsChatsLimit?: number;
  };
  query: string;
  results: SearchResultItem[];
};

export function createSearchView(dom: Dom) {
  function setStatus(text: string) {
    dom.searchStatusEl.textContent = text;
  }

  function setCounts(args: RenderArgs) {
    const { loaded, limits } = args;

    // ✅ Info box numbers (the only ones that exist in your HTML)
    dom.searchInfoLoadedSinglesEl.textContent = String(loaded.singleChats);
    dom.searchInfoLoadedProjectsEl.textContent = String(loaded.projects);
    dom.searchInfoLoadedProjectChatsEl.textContent = String(loaded.projectChats);

    const bits: string[] = [];
    if (typeof limits.singleLimit === "number") bits.push(`single limit ${limits.singleLimit}`);
    if (typeof limits.projectsLimit === "number") bits.push(`projects limit ${limits.projectsLimit}`);
    if (typeof limits.projectsChatsLimit === "number") bits.push(`chats/project limit ${limits.projectsChatsLimit}`);

    dom.searchInfoLimitsEl.textContent = bits.length ? `Limits: ${bits.join(" · ")}` : "";
  }

  function renderResults(items: SearchResultItem[]) {
    const out: string[] = [];

    for (const it of items) {
      const title = esc(it.chat.title || "(untitled)");
      const href = esc(it.chat.href);

      const snippet = it.chat.snippet ? `<div class="searchSnippet">${esc(it.chat.snippet)}</div>` : "";
      const badges = buildBadges(it.chat);

      if (it.kind === "single") {
        out.push(
          `<li class="item searchItem">` +
            `<div class="searchLine">` +
              `<a class="searchTitle" href="${href}" target="_blank" rel="noopener noreferrer">${title}</a>` +
              badges +
            `</div>` +
            snippet +
          `</li>`
        );
      } else {
        const pTitle = esc(it.project.title || it.project.gizmoId);

        out.push(
          `<li class="item searchItem">` +
            `<div class="searchLine">` +
              `<a class="searchTitle" href="${href}" target="_blank" rel="noopener noreferrer">${title}</a>` +
              `<span class="searchProject">(${pTitle})</span>` +
              badges +
            `</div>` +
            snippet +
          `</li>`
        );
      }
    }

    dom.searchResultsEl.innerHTML = out.join("");
  }

  function render(args: RenderArgs) {
    setCounts(args);

    if (!args.loaded.totalChats) {
      setStatus("No data loaded yet. Use the Info section to list Single/Projects, then search here.");
      dom.searchResultsEl.innerHTML = "";
      return;
    }

    if (!args.query.trim()) {
      setStatus("Showing all loaded chats (limited). Type to filter.");
      renderResults(args.results);
      return;
    }

    setStatus(`Results: ${args.results.length}`);
    renderResults(args.results);
  }

  return {
    setStatus,
    render,
    renderResults,
  };
}
