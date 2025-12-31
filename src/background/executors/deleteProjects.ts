// src/background/executors/deleteProjects.ts


import { MSG } from "../../shared/messages";
import { nowMs, randInt, sleep } from "../util/time";
import { deleteProject } from "../api/gizmos";

export async function executeDeleteProjects(args: {
  accessToken: string;
  gizmoIds: string[];
}): Promise<{ okCount: number; failCount: number; elapsedMs: number; runId: string }> {
  const { accessToken, gizmoIds } = args;

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = nowMs();

  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < gizmoIds.length; i++) {
    const gizmoId = gizmoIds[i];

    if (i > 0) await sleep(250 + randInt(0, 250));

    const t0 = nowMs();
    const r = await deleteProject(accessToken, gizmoId);
    const lastOpMs = nowMs() - t0;

    if (r.ok) okCount++;
    else failCount++;

    chrome.runtime.sendMessage({
      type: MSG.DELETE_PROJECTS_PROGRESS,
      runId,
      i: i + 1,
      total: gizmoIds.length,
      gizmoId,
      ok: r.ok,
      status: r.status,
      error: r.error,
      elapsedMs: nowMs() - startedAt,
      lastOpMs,
    });
  }

  chrome.runtime.sendMessage({
    type: MSG.DELETE_PROJECTS_DONE,
    runId,
    total: gizmoIds.length,
    okCount,
    failCount,
    elapsedMs: nowMs() - startedAt,
  });

  return { okCount, failCount, elapsedMs: nowMs() - startedAt, runId };
}
