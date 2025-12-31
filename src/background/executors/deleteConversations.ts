// src/background/executors/deleteConversations.ts

import { MSG } from "../../shared/messages";
import { nowMs, randInt, sleep } from "../util/time";
import { deleteWithRetry } from "../api/conversations";

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

  const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];
  let okCount = 0;
  let failCount = 0;

  for (let idx = 0; idx < ids.length; idx++) {
    const id = ids[idx];

    if (idx > 0) {
      const jitter = randInt(0, 300);
      await sleep(throttleMs + jitter);
    }

    const r = await deleteWithRetry(accessToken, id, throttleMs);
    results.push({ id, ok: r.ok, status: r.status, error: r.error });

    if (r.ok) okCount++;
    else failCount++;

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
    });
  }

  chrome.runtime.sendMessage({
    type: MSG.EXECUTE_DELETE_DONE,
    runId,
    total: ids.length,
    okCount,
    failCount,
    elapsedMs: nowMs() - startedAt,
    throttleMs,
  });

  return {
    okCount,
    failCount,
    results,
    elapsedMs: nowMs() - startedAt,
    runId,
  };
}
