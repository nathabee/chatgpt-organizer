// src/shared/messages.ts
// src/shared/messages.ts
import type { ConversationItem, ProjectItem } from "./types";

export const MSG = {
  PING: "CGO_PING",

  // Backend listing (v0.0.12+)
  LIST_ALL_CHATS: "CGO_LIST_ALL_CHATS",
  LIST_ALL_CHATS_PROGRESS: "CGO_LIST_ALL_CHATS_PROGRESS",
  LIST_ALL_CHATS_DONE: "CGO_LIST_ALL_CHATS_DONE",

  LIST_GIZMO_PROJECTS: "CGO_LIST_GIZMO_PROJECTS",
  LIST_GIZMO_PROJECTS_PROGRESS: "CGO_LIST_GIZMO_PROJECTS_PROGRESS",
  LIST_GIZMO_PROJECTS_DONE: "CGO_LIST_GIZMO_PROJECTS_DONE",

  // Execute delete conversations
  EXECUTE_DELETE: "CGO_EXECUTE_DELETE",
  EXECUTE_DELETE_PROGRESS: "CGO_EXECUTE_DELETE_PROGRESS",
  EXECUTE_DELETE_DONE: "CGO_EXECUTE_DELETE_DONE",

  // NEW: delete projects (DELETE /backend-api/gizmos/<gizmoId>)
  DELETE_PROJECTS: "CGO_DELETE_PROJECTS",
    // Project delete progress (v0.0.15)
  DELETE_PROJECTS_PROGRESS: "CGO_DELETE_PROJECTS_PROGRESS",
  DELETE_PROJECTS_DONE: "CGO_DELETE_PROJECTS_DONE",

} as const;

/* PING */
export type PingRequest = { type: typeof MSG.PING };
export type PingResponse = { ok: true };

/* LIST ALL CHATS */
export type ListAllChatsRequest = {
  type: typeof MSG.LIST_ALL_CHATS;
  limit?: number;    // default 50
  pageSize?: number; // default 50 (max 100)
};

export type ListAllChatsResponse =
  | { ok: true; conversations: ConversationItem[]; total?: number }
  | { ok: false; error: string };

export type ListAllChatsProgressEvent = {
  type: typeof MSG.LIST_ALL_CHATS_PROGRESS;
  found: number;
  offset: number;
};

export type ListAllChatsDoneEvent = {
  type: typeof MSG.LIST_ALL_CHATS_DONE;
  total: number;
  elapsedMs: number;
};

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

/* EXECUTE DELETE (conversations) */
export type ExecuteDeleteRequest = {
  type: typeof MSG.EXECUTE_DELETE;
  ids: string[];
  throttleMs?: number;
};

export type ExecuteDeleteResponse =
  | {
      ok: true;
      loggedIn: boolean;
      meHint?: string;
      note: string;
      throttleMs: number;
      results: Array<{
        id: string;
        ok: boolean;
        status?: number;
        error?: string;
      }>;
    }
  | { ok: false; error: string };

export type ExecuteDeleteProgressEvent = {
  type: typeof MSG.EXECUTE_DELETE_PROGRESS;
  runId: string;
  i: number;
  total: number;
  id: string;
  ok: boolean;
  status?: number;
  error?: string;
  attempt: number;
  elapsedMs: number;
  lastOpMs: number;
};

export type ExecuteDeleteDoneEvent = {
  type: typeof MSG.EXECUTE_DELETE_DONE;
  runId: string;
  total: number;
  okCount: number;
  failCount: number;
  elapsedMs: number;
  throttleMs: number;
};

/* DELETE PROJECTS */
export type DeleteProjectsRequest = {
  type: typeof MSG.DELETE_PROJECTS;
  gizmoIds: string[];
};

export type DeleteProjectsResponse =
  | {
      ok: true;
      results: Array<{
        gizmoId: string;
        ok: boolean;
        status?: number;
        error?: string;
      }>;
    }
  | { ok: false; error: string };


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

/* Unions */
export type AnyRequest =
  | PingRequest
  | ListAllChatsRequest
  | ListGizmoProjectsRequest
  | ExecuteDeleteRequest
  | DeleteProjectsRequest;

export type AnyResponse =
  | PingResponse
  | ListAllChatsResponse
  | ListGizmoProjectsResponse
  | ExecuteDeleteResponse
  | DeleteProjectsResponse;

export type AnyEvent =
  | ListAllChatsProgressEvent
  | ListAllChatsDoneEvent
  | ListGizmoProjectsProgressEvent
  | ListGizmoProjectsDoneEvent
  | ExecuteDeleteProgressEvent
  | ExecuteDeleteDoneEvent
  | DeleteProjectsProgressEvent
  | DeleteProjectsDoneEvent;

