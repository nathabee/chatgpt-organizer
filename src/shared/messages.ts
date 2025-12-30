// src/shared/messages.ts
import type { ConversationItem, ProjectItem } from "./types";

export const MSG = {
  PING: "CGO_PING",

  // v0.0.12 — list all chats via backend-api/conversations
  LIST_ALL_CHATS: "CGO_LIST_ALL_CHATS",
  LIST_ALL_CHATS_PROGRESS: "CGO_LIST_ALL_CHATS_PROGRESS",
  LIST_ALL_CHATS_DONE: "CGO_LIST_ALL_CHATS_DONE",

  // Execute delete
  EXECUTE_DELETE: "CGO_EXECUTE_DELETE",

  // Execute delete progress events
  EXECUTE_DELETE_PROGRESS: "CGO_EXECUTE_DELETE_PROGRESS",
  EXECUTE_DELETE_DONE: "CGO_EXECUTE_DELETE_DONE",

  // v0.0.12 — projects via gizmos/snorlax backend
  LIST_GIZMO_PROJECTS: "CGO_LIST_GIZMO_PROJECTS",
  LIST_GIZMO_PROJECTS_PROGRESS: "CGO_LIST_GIZMO_PROJECTS_PROGRESS",
  LIST_GIZMO_PROJECTS_DONE: "CGO_LIST_GIZMO_PROJECTS_DONE",
} as const;

/* PING */
export type PingRequest = { type: typeof MSG.PING };
export type PingResponse = { ok: true };

/* v0.0.12 — LIST ALL CHATS */
export type ListAllChatsRequest = {
  type: typeof MSG.LIST_ALL_CHATS;
  limit?: number; // default 50
  pageSize?: number; // default 50
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

/* EXECUTE DELETE */
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

/* v0.0.12 — LIST PROJECTS (GIZMOS) */
export type ListGizmoProjectsRequest = {
  type: typeof MSG.LIST_GIZMO_PROJECTS;
  limit?: number; // default 50
  conversationsPerGizmo?: number; // default 5 (seed)
  ownedOnly?: boolean; // default true
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

/* Unions */
export type AnyRequest =
  | PingRequest
  | ListAllChatsRequest
  | ExecuteDeleteRequest
  | ListGizmoProjectsRequest;

export type AnyResponse =
  | PingResponse
  | ListAllChatsResponse
  | ExecuteDeleteResponse
  | ListGizmoProjectsResponse;

export type AnyEvent =
  | ListAllChatsProgressEvent
  | ListAllChatsDoneEvent
  | ExecuteDeleteProgressEvent
  | ExecuteDeleteDoneEvent
  | ListGizmoProjectsProgressEvent
  | ListGizmoProjectsDoneEvent;
