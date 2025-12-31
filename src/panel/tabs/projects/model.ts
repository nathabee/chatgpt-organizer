// src/panel/tabs/projects/model.ts
import type { ProjectItem } from "../../../shared/types";

export function createProjectsModel() {
  let projects: ProjectItem[] = [];

  // selection model
  const selectedProjectIds = new Set<string>();
  const selectedProjectChatIds = new Set<string>();

  function setProjects(next: ProjectItem[]) {
    projects = next;

    // prune selections
    const projectIds = new Set(projects.map((p) => p.gizmoId));
    for (const pid of Array.from(selectedProjectIds)) {
      if (!projectIds.has(pid)) selectedProjectIds.delete(pid);
    }

    const chatIds = new Set(projects.flatMap((p) => (p.conversations || []).map((c) => c.id)));
    for (const cid of Array.from(selectedProjectChatIds)) {
      if (!chatIds.has(cid)) selectedProjectChatIds.delete(cid);
    }
  }

  function projectAllChatIds(p: ProjectItem): string[] {
    return (p.conversations || []).map((c) => c.id);
  }

  function toggleProjectSelection(p: ProjectItem, checked: boolean) {
    if (checked) {
      selectedProjectIds.add(p.gizmoId);
      for (const cid of projectAllChatIds(p)) selectedProjectChatIds.add(cid);
    } else {
      selectedProjectIds.delete(p.gizmoId);
      for (const cid of projectAllChatIds(p)) selectedProjectChatIds.delete(cid);
    }
  }

  function toggleChatSelection(cid: string, checked: boolean) {
    if (checked) selectedProjectChatIds.add(cid);
    else selectedProjectChatIds.delete(cid);
  }

  function removeChatEverywhere(id: string) {
    selectedProjectChatIds.delete(id);
    for (const p of projects) {
      p.conversations = (p.conversations || []).filter((c) => c.id !== id);
    }
  }

  function removeProject(gizmoId: string) {
    selectedProjectIds.delete(gizmoId);
    projects = projects.filter((p) => p.gizmoId !== gizmoId);
  }

  function getTotalChats(): number {
    return projects.reduce((sum, p) => sum + ((p.conversations || []).length), 0);
  }

  return {
    get projects() {
      return projects;
    },
    selectedProjectIds,
    selectedProjectChatIds,
    setProjects,
    toggleProjectSelection,
    toggleChatSelection,
    removeChatEverywhere,
    removeProject,
    getTotalChats,
  };
}
