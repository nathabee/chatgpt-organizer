// src/shared/messages/projects.ts
import type { ProjectItem } from "../types";
import { MSG } from "./msg";

/* LIST PROJECTS */
export type ListGizmoProjectsRequest = {
  type: typeof MSG.LIST_GIZMO_PROJECTS;
  limit?: number; // default 50
  conversationsPerGizmo?: number; // default 5
};

export type ListGizmoProjectsResponse =
  | { ok: true; projects: ProjectItem[] }
  | { ok: false; error: string };

export type ListGizmoProjectsProgressEvent = {
  type: typeof MSG.LIST_GIZMO_PROJECTS_PROGRESS;
  foundProjects: number;
  foundConversations: number;
};

export type ListGizmoProjectsDoneEvent = {
  type: typeof MSG.LIST_GIZMO_PROJECTS_DONE;
  totalProjects: number;
  totalConversations: number;
  elapsedMs: number;
};

/* DELETE PROJECTS */
export type DeleteProjectsRequest = {
  type: typeof MSG.DELETE_PROJECTS;
  gizmoIds: string[];
};

// NOTE: your current runtime code responds `{ ok: true }` immediately (no results array).
// So keep this aligned with reality:
export type DeleteProjectsResponse = { ok: true } | { ok: false; error: string };

/* DELETE PROJECTS progress events (v0.0.15) */
export type DeleteProjectsProgressEvent = {
  type: typeof MSG.DELETE_PROJECTS_PROGRESS;
  runId: string;
  i: number;
  total: number;
  gizmoId: string;
  ok: boolean;
  status?: number;
  error?: string;
  elapsedMs: number;
  lastOpMs: number;
};

export type DeleteProjectsDoneEvent = {
  type: typeof MSG.DELETE_PROJECTS_DONE;
  runId: string;
  total: number;
  okCount: number;
  failCount: number;
  elapsedMs: number;
};


export type MoveChatsToProjectRequest = {
  type: typeof MSG.MOVE_CHATS_TO_PROJECT;
  ids: string[];
  gizmoId: string;
  throttleMs?: number;
};

export type CreateProjectRequest = {
  type: typeof MSG.CREATE_PROJECT;
  name: string;
  description?: string;
  prompt_starters?: string[]; // default []
};

export type CreateProjectProgressEvent = {
  type: typeof MSG.CREATE_PROJECT_PROGRESS;
  runId: string;
  phase: "starting" | "sending" | "parsing" | "done";
};

export type CreateProjectResponse =
  | {
      ok: true;
      gizmoId: string;
      title: string;
      href: string;
      shortUrl?: string;
    }
  | { ok: false; error: string; status?: number };

export type CreateProjectDoneEvent = {
  type: typeof MSG.CREATE_PROJECT_DONE;
  runId: string;
  ok: boolean;
  status?: number;
  gizmoId?: string;
  elapsedMs: number;
  error?: string;
};


