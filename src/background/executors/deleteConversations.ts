// src/background/executors/deleteConversations.ts

import { MSG } from "../../shared/messages";
import { nowMs, randInt, sleep } from "../util/time";
import { deleteWithRetryApi } from "../api/conversationsApi";
import { logTrace, logWarn, logError } from "../util/log";

export async function executeDeleteConversations(args: {
  accessToken: string;
  ids: string[];
  throttleMs: number;
}): Promise<{
  okCount: number;
  failCount: number;
  results: Array<{ id: string; ok: boolean; status?: number; error?: string }>;
  elapsedMs: number;
  runId: string;
}> {
  const { accessToken, ids, throttleMs } = args;

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = nowMs();

  logTrace("executeDeleteConversations start", {
    runId,
    total: ids.length,
    throttleMs,
  });

  const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];
  let okCount = 0;
  let failCount = 0;

  for (let idx = 0; idx < ids.length; idx++) {
    const id = String(ids[idx] || "").trim();
    if (!id) {
      failCount++;
      results.push({ id: "", ok: false, error: "Missing id" });

      logWarn("executeDeleteConversations: missing id", { runId, idx });

      chrome.runtime.sendMessage({
        type: MSG.EXECUTE_DELETE_PROGRESS,
        runId,
        i: idx + 1,
        total: ids.length,
        id: "",
        ok: false,
        error: "Missing id",
        attempt: 0,
        elapsedMs: nowMs() - startedAt,
        lastOpMs: 0,
      } as any);

      continue;
    }

    if (idx > 0) {
      const jitter = randInt(0, 300);
      await sleep(throttleMs + jitter);
    }

    try {
      const r = await deleteWithRetryApi(accessToken, id, throttleMs);

      results.push({ id, ok: r.ok, status: r.status, error: r.error });
      if (r.ok) okCount++;
      else failCount++;

      // failures are worth a warn (ALWAYS logged)
      if (!r.ok) {
        logWarn("executeDeleteConversations: delete failed", {
          runId,
          id,
          status: r.status,
          attempt: r.attempt,
          error: r.error,
        });
      }

      chrome.runtime.sendMessage({
        type: MSG.EXECUTE_DELETE_PROGRESS,
        runId,
        i: idx + 1,
        total: ids.length,
        id,
        ok: r.ok,
        status: r.status,
        error: r.error,
        attempt: r.attempt,
        elapsedMs: nowMs() - startedAt,
        lastOpMs: r.lastOpMs,
      } as any);
    } catch (e: any) {
      // deleteWithRetry should not throw, so this is "unexpected"
      const msg = e?.message || "Unexpected error";
      failCount++;
      results.push({ id, ok: false, error: msg });

      logError("executeDeleteConversations: unexpected exception", {
        runId,
        id,
        error: msg,
      });

      chrome.runtime.sendMessage({
        type: MSG.EXECUTE_DELETE_PROGRESS,
        runId,
        i: idx + 1,
        total: ids.length,
        id,
        ok: false,
        error: msg,
        attempt: 0,
        elapsedMs: nowMs() - startedAt,
        lastOpMs: 0,
      } as any);
    }
  }

  const elapsedMs = nowMs() - startedAt;

  chrome.runtime.sendMessage({
    type: MSG.EXECUTE_DELETE_DONE,
    runId,
    total: ids.length,
    okCount,
    failCount,
    elapsedMs,
    throttleMs,
  } as any);

  logTrace("executeDeleteConversations done", {
    runId,
    total: ids.length,
    okCount,
    failCount,
    elapsedMs,
  });

  return {
    okCount,
    failCount,
    results,
    elapsedMs,
    runId,
  };
}
