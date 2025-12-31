// src/shared/messages/logs.ts
import type { ConversationItem } from "../types";
import { MSG } from "./msg";

/* PING */
export type PingRequest = { type: typeof MSG.PING };
export type PingResponse = { ok: true };

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
