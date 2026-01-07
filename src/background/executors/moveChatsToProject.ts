// src/background/executors/moveChatsToProject.ts

import { MSG } from "../../shared/messages";
import { nowMs, randInt, sleep } from "../util/time";
import { logTrace, logWarn, logError } from "../util/log";
import { moveConversationToProjectApi } from "../api/projectsApi";

export async function executeMoveChatsToProject(args: {
  accessToken: string;
  ids: string[];
  gizmoId: string;
  throttleMs: number;
}): Promise<{ okCount: number; failCount: number; elapsedMs: number; runId: string }> {
  const accessToken = args.accessToken;
  const ids = Array.isArray(args.ids) ? args.ids.filter(Boolean) : [];
  const gizmoId = String(args.gizmoId || "").trim();
  const throttleMs = Math.max(150, Math.min(5000, Number(args.throttleMs ?? 400)));

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = nowMs();

  if (!ids.length) {
    logWarn("EXECUTE_MOVE_CHATS_TO_PROJECT: no ids", { runId });
    chrome.runtime.sendMessage({
      type: MSG.MOVE_CHATS_TO_PROJECT_DONE,
      runId,
      total: 0,
      okCount: 0,
      failCount: 0,
      elapsedMs: 0,
      gizmoId,
    } as any);
    return { okCount: 0, failCount: 0, elapsedMs: 0, runId };
  }

  if (!gizmoId) {
    logWarn("EXECUTE_MOVE_CHATS_TO_PROJECT: missing gizmoId", { runId, count: ids.length });
    chrome.runtime.sendMessage({
      type: MSG.MOVE_CHATS_TO_PROJECT_DONE,
      runId,
      total: ids.length,
      okCount: 0,
      failCount: ids.length,
      elapsedMs: nowMs() - startedAt,
      gizmoId,
    } as any);
    return { okCount: 0, failCount: ids.length, elapsedMs: nowMs() - startedAt, runId };
  }

  logTrace("EXECUTE_MOVE_CHATS_TO_PROJECT start", { runId, count: ids.length, gizmoId, throttleMs });

  let okCount = 0;
  let failCount = 0;

  try {
    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];

      if (idx > 0) {
        const jitter = randInt(0, 250);
        await sleep(throttleMs + jitter);
      }

      const t0 = nowMs();
      const r = await moveConversationToProjectApi(accessToken, { conversationId: id, gizmoId });
      const lastOpMs = nowMs() - t0;

      if (r.ok) okCount++;
      else failCount++;

      // Expected failures: keep them visible (warn), but don't crash the run.
      if (!r.ok) {
        logWarn("EXECUTE_MOVE_CHATS_TO_PROJECT item failed", {
          runId,
          id,
          gizmoId,
          status: r.status,
          error: r.error,
          i: idx + 1,
          total: ids.length,
        });
      }


      const status = r.status;
      const error = r.ok ? undefined : r.error;

      chrome.runtime.sendMessage({
        type: MSG.MOVE_CHATS_TO_PROJECT_PROGRESS,
        runId,
        i: idx + 1,
        total: ids.length,
        id,
        gizmoId,
        ok: r.ok,
        status,
        error,
        elapsedMs: nowMs() - startedAt,
        lastOpMs,
      } as any);

    }

    chrome.runtime.sendMessage({
      type: MSG.MOVE_CHATS_TO_PROJECT_DONE,
      runId,
      total: ids.length,
      okCount,
      failCount,
      elapsedMs: nowMs() - startedAt,
      gizmoId,
    } as any);

    logTrace("EXECUTE_MOVE_CHATS_TO_PROJECT done", {
      runId,
      total: ids.length,
      okCount,
      failCount,
      elapsedMs: nowMs() - startedAt,
    });

    return { okCount, failCount, elapsedMs: nowMs() - startedAt, runId };
  } catch (e: any) {
    // Unexpected crash (should be rare)
    logError("EXECUTE_MOVE_CHATS_TO_PROJECT crashed", {
      runId,
      gizmoId,
      error: e?.message || String(e),
    });

    // Best-effort DONE so UI unlocks
    try {
      chrome.runtime.sendMessage({
        type: MSG.MOVE_CHATS_TO_PROJECT_DONE,
        runId,
        total: ids.length,
        okCount,
        failCount: failCount + (ids.length - (okCount + failCount)), // conservative
        elapsedMs: nowMs() - startedAt,
        gizmoId,
      } as any);
    } catch {
      // ignore
    }

    return { okCount, failCount, elapsedMs: nowMs() - startedAt, runId };
  }
}
