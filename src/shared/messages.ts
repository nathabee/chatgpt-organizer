// src/shared/messages.ts

import type { ConversationItem } from "./types";

export const MSG = {
  PING: "CGO_PING",
  LIST_CONVERSATIONS: "CGO_LIST_CONVERSATIONS",

  // Kept (even if UI hidden in v0.0.6)
  DRY_RUN_DELETE: "CGO_DRY_RUN_DELETE",

  // NEW v0.0.6: real execute
  EXECUTE_DELETE: "CGO_EXECUTE_DELETE",

  // NEW v0.0.6: deep scan (auto-scroll)
  DEEP_SCAN_START: "CGO_DEEP_SCAN_START",
  DEEP_SCAN_CANCEL: "CGO_DEEP_SCAN_CANCEL",
  DEEP_SCAN_PROGRESS: "CGO_DEEP_SCAN_PROGRESS",
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
 * DEEP SCAN — NEW v0.0.6
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

export type DeepScanCancelRequest = {
  type: typeof MSG.DEEP_SCAN_CANCEL;
};

export type DeepScanCancelResponse = { ok: true };

// Progress is emitted from content script while deep scan is running.
// Panel listens via chrome.runtime.onMessage.
// No sendResponse expected.
export type DeepScanProgressEvent = {
  type: typeof MSG.DEEP_SCAN_PROGRESS;
  found: number;
  step: number;
};

/* -----------------------------------------------------------
 * DRY RUN (kept for later)
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

/* -----------------------------------------------------------
 * Unions
 * ----------------------------------------------------------- */

export type AnyRequest =
  | PingRequest
  | ListConversationsRequest
  | DeepScanStartRequest
  | DeepScanCancelRequest
  | DryRunDeleteRequest
  | ExecuteDeleteRequest;

export type AnyResponse =
  | PingResponse
  | ListConversationsResponse
  | DeepScanStartResponse
  | DeepScanCancelResponse
  | DryRunDeleteResponse
  | ExecuteDeleteResponse;
