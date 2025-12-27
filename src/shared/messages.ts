// src/shared/messages.ts

import type { ConversationItem } from "./types";

export const MSG = {
  PING: "CGO_PING",
  LIST_CONVERSATIONS: "CGO_LIST_CONVERSATIONS",
  DRY_RUN_DELETE: "CGO_DRY_RUN_DELETE",
  EXECUTE_DELETE: "CGO_EXECUTE_DELETE",
} as const;

export type PingRequest = { type: typeof MSG.PING };
export type PingResponse = { ok: true };

export type ListConversationsRequest = { type: typeof MSG.LIST_CONVERSATIONS };

export type ListConversationsResponse =
  | { ok: true; conversations: ConversationItem[] }
  | { ok: false; error: string };

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

export type ExecuteDeleteRequest = {
  type: typeof MSG.EXECUTE_DELETE;
  ids: string[];
  throttleMs?: number; // optional override
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

export type AnyRequest =
  | PingRequest
  | ListConversationsRequest
  | DryRunDeleteRequest
  | ExecuteDeleteRequest;

export type AnyResponse =
  | PingResponse
  | ListConversationsResponse
  | DryRunDeleteResponse
  | ExecuteDeleteResponse;
