// src/panel/tabs/search/model.ts
import type { ConversationItem, ProjectItem } from "../../../shared/types";
import type { CacheSnapshot } from "../../app/cache";

export type SearchResultItem =
  | { kind: "single"; chat: ConversationItem }
  | { kind: "project"; project: ProjectItem; chat: ConversationItem };

export type SearchResult = {
  query: string;
  totalMatches: number;
  items: SearchResultItem[];
};

export type SearchScope = "all" | "single" | "project";
export type SearchArchived = "exclude" | "include" | "only";
export type Within = "any" | "24h" | "7d" | "30d" | "1y";

export type SearchFilters = {
  scope: SearchScope;
  archived: SearchArchived;

  updatedWithin: Within;
  updatedAfter?: string;  // YYYY-MM-DD
  updatedBefore?: string; // YYYY-MM-DD

  createdWithin: Within;
  createdAfter?: string;
  createdBefore?: string;
};

function norm(s: string): string {
  return (s || "").toLowerCase().trim();
}

function parseIsoTs(iso?: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function dateStartTs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function dateEndTs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function chatTextHaystack(chat: ConversationItem): string {
  // cheap + stable, includes IDs
  const parts = [chat.title, chat.snippet, chat.id, chat.gizmoId];
  return norm(parts.filter(Boolean).join(" \n"));
}

function projectChatHaystack(project: ProjectItem, chat: ConversationItem): string {
  const parts = [project.title, project.gizmoId, chatTextHaystack(chat)];
  return norm(parts.filter(Boolean).join(" \n"));
}

function matchArchived(chat: ConversationItem, mode: SearchArchived): boolean {
  const archived = chat.isArchived === true;
  if (mode === "include") return true;
  if (mode === "exclude") return !archived;
  return archived; // only
}

function withinWindow(ts: number, within: Within, nowTs: number): boolean {
  if (within === "any") return true;
  if (!ts) return false;

  const ms =
    within === "24h" ? 24 * 60 * 60 * 1000 :
    within === "7d"  ? 7  * 24 * 60 * 60 * 1000 :
    within === "30d" ? 30 * 24 * 60 * 60 * 1000 :
                      365 * 24 * 60 * 60 * 1000;

  return ts >= (nowTs - ms);
}

function matchDateRange(ts: number, after?: string, before?: string): boolean {
  if (!after && !before) return true;
  if (!ts) return false;

  if (after) {
    const a = dateStartTs(after);
    if (a && ts < a) return false;
  }
  if (before) {
    const b = dateEndTs(before);
    if (b && ts > b) return false;
  }
  return true;
}

export function createSearchModel(opts?: { maxResults?: number }) {
  const maxResults = Math.max(20, Math.min(opts?.maxResults ?? 300, 5000));

  let snap: CacheSnapshot | null = null;
  let query = "";
  let filters: SearchFilters = {
    scope: "all",
    archived: "include",

    updatedWithin: "any",
    updatedAfter: "",
    updatedBefore: "",

    createdWithin: "any",
    createdAfter: "",
    createdBefore: "",
  };

  function setSnapshot(next: CacheSnapshot) {
    snap = next;
  }

  function setQuery(next: string) {
    query = next;
  }

  function setFilters(next: Partial<SearchFilters>) {
    filters = { ...filters, ...next };
  }

  function getFilters(): SearchFilters {
    return { ...filters };
  }

  function hasData(): boolean {
    if (!snap) return false;
    return snap.singleChats.length > 0 || snap.projects.length > 0;
  }

  function search(): SearchResult {
    if (!snap) return { query, totalMatches: 0, items: [] };

    const q = norm(query);
    const nowTs = Date.now();

    const items: SearchResultItem[] = [];
    let totalMatches = 0;

    const push = (it: SearchResultItem) => {
      totalMatches++;
      if (items.length < maxResults) items.push(it);
    };

    const wantSingle = filters.scope === "all" || filters.scope === "single";
    const wantProject = filters.scope === "all" || filters.scope === "project";

    if (wantSingle) {
      for (const c of snap.singleChats) {
        if (!matchArchived(c, filters.archived)) continue;

        const updateTs = parseIsoTs(c.updateTime);
        if (!withinWindow(updateTs, filters.updatedWithin, nowTs)) continue;
        if (!matchDateRange(updateTs, filters.updatedAfter || undefined, filters.updatedBefore || undefined)) continue;

        const createTs = parseIsoTs(c.createTime);
        if (!withinWindow(createTs, filters.createdWithin, nowTs)) continue;
        if (!matchDateRange(createTs, filters.createdAfter || undefined, filters.createdBefore || undefined)) continue;

        if (!q || chatTextHaystack(c).includes(q)) {
          push({ kind: "single", chat: c });
        }
      }
    }

    if (wantProject) {
      for (const p of snap.projects) {
        for (const c of p.conversations || []) {
          if (!matchArchived(c, filters.archived)) continue;

          const updateTs = parseIsoTs(c.updateTime);
          if (!withinWindow(updateTs, filters.updatedWithin, nowTs)) continue;
          if (!matchDateRange(updateTs, filters.updatedAfter || undefined, filters.updatedBefore || undefined)) continue;

          const createTs = parseIsoTs(c.createTime);
          if (!withinWindow(createTs, filters.createdWithin, nowTs)) continue;
          if (!matchDateRange(createTs, filters.createdAfter || undefined, filters.createdBefore || undefined)) continue;

          const hay = projectChatHaystack(p, c);
          if (!q || hay.includes(q)) {
            push({ kind: "project", project: p, chat: c });
          }
        }
      }
    }

    return { query, totalMatches, items };
  }

  return {
    setSnapshot,
    setQuery,
    setFilters,
    getFilters,
    get query() {
      return query;
    },
    hasData,
    search,
    maxResults,
  };
}
