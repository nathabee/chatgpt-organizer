import type { ConversationItem, ProjectItem } from "../../../shared/types";

export type OrganizeSourceMode = "all" | "single" | "projects";

export type SourceChat = ConversationItem & {
  origin: "single" | "project";
  projectId?: string;
  projectTitle?: string;
};

export function createOrganizeModel() {
  let singleChats: ConversationItem[] = [];
  let projects: ProjectItem[] = [];

  let sourceMode: OrganizeSourceMode = "all";
  let filter = "";
  let projectFilter = "";

  const selectedChatIds = new Set<string>();
  let targetProjectId: string | null = null;

  function setFromCache(args: { singleChats: ConversationItem[]; projects: ProjectItem[] }) {
    singleChats = args.singleChats || [];
    projects = args.projects || [];

    const allChatIds = new Set<string>();
    for (const c of singleChats) allChatIds.add(c.id);
    for (const p of projects) for (const c of p.conversations || []) allChatIds.add(c.id);

    for (const id of Array.from(selectedChatIds)) {
      if (!allChatIds.has(id)) selectedChatIds.delete(id);
    }

    if (targetProjectId) {
      const ok = projects.some((p) => p.gizmoId === targetProjectId);
      if (!ok) targetProjectId = null;
    }
  }

  function setSourceMode(next: OrganizeSourceMode) {
    sourceMode = next;
  }

  function setFilter(next: string) {
    filter = next || "";
  }

  function setProjectFilter(next: string) {
    projectFilter = next || "";
  }

  function toggleChat(id: string, checked: boolean) {
    if (checked) selectedChatIds.add(id);
    else selectedChatIds.delete(id);
  }

  function setTargetProject(id: string | null) {
    targetProjectId = id;
  }

  function clearTargetProject() {
    targetProjectId = null;
  }

  function getTargetProject(): ProjectItem | null {
    if (!targetProjectId) return null;
    return projects.find((p) => p.gizmoId === targetProjectId) || null;
  }

  function buildSourceChats(): SourceChat[] {
    const out: SourceChat[] = [];

    if (sourceMode === "all" || sourceMode === "single") {
      for (const c of singleChats) out.push({ ...c, origin: "single" });
    }

    if (sourceMode === "all" || sourceMode === "projects") {
      for (const p of projects) {
        for (const c of p.conversations || []) {
          out.push({ ...c, origin: "project", projectId: p.gizmoId, projectTitle: p.title });
        }
      }
    }

    const q = filter.trim().toLowerCase();
    if (!q) return out;

    return out.filter((c) => {
      const t = (c.title || "").toLowerCase();
      const h = (c.href || "").toLowerCase();
      const proj = (c.projectTitle || "").toLowerCase();
      return t.includes(q) || h.includes(q) || proj.includes(q);
    });
  }

  function buildProjects(): ProjectItem[] {
    const q = projectFilter.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.title || "").toLowerCase().includes(q));
  }

  return {
    setFromCache,

    get sourceMode() {
      return sourceMode;
    },
    setSourceMode,

    setFilter,
    setProjectFilter,

    selectedChatIds,
    toggleChat,

    get targetProjectId() {
      return targetProjectId;
    },
    setTargetProject,
    clearTargetProject,
    getTargetProject,

    buildSourceChats,
    buildProjects,
  };
}
