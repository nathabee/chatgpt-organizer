// src/shared/messages.ts

import type { ConversationItem, ProjectItem } from "./types";

export const MSG = {
  PING: "CGO_PING",
  LIST_CONVERSATIONS: "CGO_LIST_CONVERSATIONS",

  // Kept (UI hidden in v0.0.6+)
  DRY_RUN_DELETE: "CGO_DRY_RUN_DELETE",

  // Execute delete
  EXECUTE_DELETE: "CGO_EXECUTE_DELETE",

  // Deep scan (v0.0.6)
  DEEP_SCAN_START: "CGO_DEEP_SCAN_START",
  DEEP_SCAN_CANCEL: "CGO_DEEP_SCAN_CANCEL",
  DEEP_SCAN_PROGRESS: "CGO_DEEP_SCAN_PROGRESS",

  // NEW v0.0.7: execute progress events
  EXECUTE_DELETE_PROGRESS: "CGO_EXECUTE_DELETE_PROGRESS",
  EXECUTE_DELETE_DONE: "CGO_EXECUTE_DELETE_DONE",


  // NEW v0.0.9
  LIST_PROJECTS: "CGO_LIST_PROJECTS",

} as const;

/* -----------------------------------------------------------
 * PING
 * ----------------------------------------------------------- */

export type PingRequest = { type: typeof MSG.PING };
export type PingResponse = { ok: true };

/* -----------------------------------------------------------
 * LIST (quick scan)
 * ----------------------------------------------------------- */

export type ListConversationsRequest = { type: typeof MSG.LIST_CONVERSATIONS };

export type ListConversationsResponse =
  | { ok: true; conversations: ConversationItem[] }
  | { ok: false; error: string };

/* -----------------------------------------------------------
 * DEEP SCAN
 * ----------------------------------------------------------- */

export type DeepScanStartRequest = {
  type: typeof MSG.DEEP_SCAN_START;
  options?: {
    maxSteps?: number;
    stepDelayMs?: number;
    noNewLimit?: number;
  };
};

export type DeepScanStartResponse =
  | { ok: true; conversations: ConversationItem[] }
  | { ok: false; error: string };

export type DeepScanCancelRequest = { type: typeof MSG.DEEP_SCAN_CANCEL };
export type DeepScanCancelResponse = { ok: true };

export type DeepScanProgressEvent = {
  type: typeof MSG.DEEP_SCAN_PROGRESS;
  found: number;
  step: number;
};

/* -----------------------------------------------------------
 * DRY RUN
 * ----------------------------------------------------------- */

export type DryRunDeleteRequest = {
  type: typeof MSG.DRY_RUN_DELETE;
  ids: string[];
};

export type DryRunDeleteResponse =
  | {
      ok: true;
      loggedIn: boolean;
      meHint?: string;
      note: string;
      requests: Array<{
        method: "PATCH";
        url: string;
        headers: Record<string, string>;
        body: unknown;
      }>;
    }
  | { ok: false; error: string };

/* -----------------------------------------------------------
 * EXECUTE DELETE
 * ----------------------------------------------------------- */

export type ExecuteDeleteRequest = {
  type: typeof MSG.EXECUTE_DELETE;
  ids: string[];
  throttleMs?: number; // base delay (backend may enforce slower)
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

/* -----------------------------------------------------------
 * NEW v0.0.7: Execute delete progress events (fire-and-forget)
 * ----------------------------------------------------------- */

export type ExecuteDeleteProgressEvent = {
  type: typeof MSG.EXECUTE_DELETE_PROGRESS;
  runId: string;
  i: number; // 1-based index
  total: number;
  id: string;
  ok: boolean;
  status?: number;
  error?: string;
  attempt: number;
  elapsedMs: number; // total run elapsed
  lastOpMs: number;  // duration of this PATCH attempt (best effort)
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


// NEW v0.0.9
export type ListProjectsRequest = {
  type: typeof MSG.LIST_PROJECTS;
  openAll?: boolean; // auto-open "See more" / full projects overlay
};

export type ListProjectsResponse =
  | { ok: true; projects: ProjectItem[]; note?: string }
  | { ok: false; error: string };

 
/* -----------------------------------------------------------
 * Unions
 * ----------------------------------------------------------- */

export type AnyRequest =
  | PingRequest
  | ListConversationsRequest
  | DeepScanStartRequest
  | DeepScanCancelRequest
  | DryRunDeleteRequest
  | ExecuteDeleteRequest
  // NEW v0.0.9
  | ListProjectsRequest;
;

export type AnyResponse =
  | PingResponse
  | ListConversationsResponse
  | DeepScanStartResponse
  | DeepScanCancelResponse
  | DryRunDeleteResponse
  | ExecuteDeleteResponse
  // NEW v0.0.9
  | ListProjectsResponse;
;

// Convenience union for panel listeners (events)
export type AnyEvent =
  | DeepScanProgressEvent
  | ExecuteDeleteProgressEvent
  | ExecuteDeleteDoneEvent;
