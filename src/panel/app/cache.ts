// src/panel/app/cache.ts
import type { ConversationItem, ProjectItem } from "../../shared/types";

export type CacheSource = "single" | "projects";

export type CacheMeta = {
  // current global scope used for fetch (YYYY-MM-DD)
  scopeUpdatedSince?: string;

  // when the cache was last refreshed (per section)
  singleUpdatedTs?: number;
  projectsUpdatedTs?: number;

  // the UI limits used when fetching (useful to explain “search is limited”)
  singleLimit?: number;

  projectsLimit?: number;
  projectsChatsLimit?: number;
};

export type CacheSnapshot = {
  singleChats: ConversationItem[];
  projects: ProjectItem[];

  // derived counts
  counts: {
    singleChats: number;
    projects: number;
    projectChats: number;
    totalChats: number;
  };

  meta: CacheMeta;
};

type Listener = (snap: CacheSnapshot) => void;



function countProjectChats(projects: ProjectItem[]): number {
  let n = 0;
  for (const p of projects) n += (p.conversations?.length || 0);
  return n;
}

function makeSnapshot(state: {
  singleChats: ConversationItem[];
  projects: ProjectItem[];
  meta: CacheMeta;
}): CacheSnapshot {
  const projectChats = countProjectChats(state.projects);
  const singleChats = state.singleChats.length;
  const projects = state.projects.length;

  return {
    singleChats: state.singleChats,
    projects: state.projects,
    counts: {
      singleChats,
      projects,
      projectChats,
      totalChats: singleChats + projectChats,
    },
    meta: state.meta,
  };
}

export function createPanelCache() {
  // Internal mutable state (per panel instance)
  const state = {
    singleChats: [] as ConversationItem[],
    projects: [] as ProjectItem[],
    meta: {} as CacheMeta,
  };

  const listeners = new Set<Listener>();

  function emit() {
    const snap = makeSnapshot(state);
    for (const fn of listeners) {
      try {
        fn(snap);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  function setScopeUpdatedSince(isoDay: string) {
    state.meta.scopeUpdatedSince = isoDay;
    emit();
  }

  function getScopeUpdatedSince(): string {
    return String(state.meta.scopeUpdatedSince || "");
  }

  function getSnapshot(): CacheSnapshot {
    return makeSnapshot(state);
  }

  function subscribe(fn: Listener): () => void {
    listeners.add(fn);
    try {
      fn(getSnapshot());
    } catch {
      // ignore
    }
    return () => listeners.delete(fn);
  }

  function clearAll() {
    state.singleChats = [];
    state.projects = [];
    state.meta = {};
    emit();
  }

  function setSingleChats(chats: ConversationItem[], opts?: { limit?: number }) {
    state.singleChats = chats.slice();
    state.meta.singleUpdatedTs = Date.now();
    if (typeof opts?.limit === "number") state.meta.singleLimit = opts.limit;
    emit();
  }

  function setProjects(
    projects: ProjectItem[],
    opts?: { limitProjects?: number; chatsPerProject?: number }
  ) {
    state.projects = projects.slice();
    state.meta.projectsUpdatedTs = Date.now();
    if (typeof opts?.limitProjects === "number") state.meta.projectsLimit = opts.limitProjects;
    if (typeof opts?.chatsPerProject === "number") state.meta.projectsChatsLimit = opts.chatsPerProject;
    emit();
  }

  function removeChat(chatId: string) {
    const beforeSingles = state.singleChats.length;
    state.singleChats = state.singleChats.filter((c) => c.id !== chatId);

    let changedProjects = false;
    const nextProjects: ProjectItem[] = [];

    for (const p of state.projects) {
      const before = p.conversations?.length || 0;
      const nextConvos = (p.conversations || []).filter((c) => c.id !== chatId);
      if (nextConvos.length !== before) changedProjects = true;

      nextProjects.push(before === nextConvos.length ? p : { ...p, conversations: nextConvos });
    }

    if (state.singleChats.length !== beforeSingles || changedProjects) {
      state.projects = nextProjects;
      emit();
    }
  }

  function removeProject(gizmoId: string) {
    const before = state.projects.length;
    state.projects = state.projects.filter((p) => p.gizmoId !== gizmoId);
    if (state.projects.length !== before) emit();
  }

  function insertProject(p: ProjectItem, opts?: { limitProjects?: number; chatsPerProject?: number }) {
    // Avoid duplicates
    const exists = state.projects.some((x) => x.gizmoId === p.gizmoId);
    const next = exists ? state.projects : [p, ...state.projects];

    // Reuse setProjects so meta stays consistent
    setProjects(next, opts ?? {
      limitProjects: state.meta.projectsLimit,
      chatsPerProject: state.meta.projectsChatsLimit,
    });
  }

  function moveChatsToProject(args: {
    ids: string[];
    targetProjectId: string;
    metaById?: Map<string, { title?: string; href?: string }>;
  }) {
    const { ids, targetProjectId, metaById } = args;
    const idSet = new Set(ids);

    // 1) singles: remove
    const nextSingles = state.singleChats.filter((c) => !idSet.has(c.id));

    // 2) projects: remove everywhere + add to target
    const nextProjects = state.projects.map((p) => ({
      ...p,
      conversations: (p.conversations || []).filter((c) => !idSet.has(c.id)),
    }));

    const target = nextProjects.find((p) => p.gizmoId === targetProjectId);
    if (target) {
      const existing = new Set((target.conversations || []).map((c) => c.id));
      const convos = target.conversations || [];

      for (const id of ids) {
        if (existing.has(id)) continue;
        const meta = metaById?.get(id);

        convos.push({
          id,
          gizmoId: targetProjectId,
          title: meta?.title || "Untitled",
          href: meta?.href || "#",
        } as any);
      }

      target.conversations = convos;

      // Optional: keep under UI cap if you want
      const cap = state.meta.projectsChatsLimit;
      if (typeof cap === "number" && cap > 0) {
        target.conversations = target.conversations.slice(0, cap);
      }
    }

    // 3) commit via existing setters (keeps meta + emits once each)
    setProjects(nextProjects, { limitProjects: state.meta.projectsLimit, chatsPerProject: state.meta.projectsChatsLimit });
    setSingleChats(nextSingles, { limit: state.meta.singleLimit });
  }


  return {
    // read
    getSnapshot,
    subscribe,
    getScopeUpdatedSince,

    // write
    clearAll,
    setSingleChats,
    setProjects,
    removeChat,
    removeProject,
    setScopeUpdatedSince,
    insertProject,
    moveChatsToProject,
  };
}


// ✅ IMPORTANT: this is what your tabs import as a type
export type PanelCache = ReturnType<typeof createPanelCache>;
