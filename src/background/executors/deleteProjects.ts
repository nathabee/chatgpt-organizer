// src/background/executors/deleteProjects.ts

import { MSG } from "../../shared/messages";
import { nowMs, randInt, sleep } from "../util/time";
import { deleteProjectApi } from "../api/projectsApi";
import { logTrace, logWarn } from "../util/log";

export async function executeDeleteProjects(args: {
  accessToken: string;
  gizmoIds: string[];
}): Promise<{ okCount: number; failCount: number; elapsedMs: number; runId: string }> {
  const { accessToken, gizmoIds } = args;

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = nowMs();

  logTrace("EXECUTE_DELETE_PROJECTS start", { runId, total: gizmoIds.length });

  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < gizmoIds.length; i++) {
    const gizmoId = String(gizmoIds[i] || "").trim();
    if (!gizmoId) continue;

    if (i > 0) await sleep(250 + randInt(0, 250));

    const t0 = nowMs();
    const r = await deleteProjectApi(accessToken, gizmoId);
    const lastOpMs = nowMs() - t0;

    if (r.ok) okCount++;
    else failCount++;

    const status = r.status;
    const error = r.ok ? undefined : r.error;

    if (!r.ok) {
      // apiClient already logged the HTTP failure; this is just high-level context
      logWarn("EXECUTE_DELETE_PROJECTS item failed", {
        runId,
        i: i + 1,
        total: gizmoIds.length,
        gizmoId,
        status,
        error,
      });
    }

    chrome.runtime.sendMessage({
      type: MSG.DELETE_PROJECTS_PROGRESS,
      runId,
      i: i + 1,
      total: gizmoIds.length,
      gizmoId,
      ok: r.ok,
      status,
      error,
      elapsedMs: nowMs() - startedAt,
      lastOpMs,
    } as any);
  }

  chrome.runtime.sendMessage({
    type: MSG.DELETE_PROJECTS_DONE,
    runId,
    total: gizmoIds.length,
    okCount,
    failCount,
    elapsedMs: nowMs() - startedAt,
  } as any);

  logTrace("EXECUTE_DELETE_PROJECTS done", { runId, okCount, failCount, elapsedMs: nowMs() - startedAt });

  return { okCount, failCount, elapsedMs: nowMs() - startedAt, runId };
}
