// src/background/executors/moveChatsToProject.ts
// 

import { MSG } from "../../shared/messages";
import { nowMs, randInt, sleep } from "../util/time";
import { moveConversationToProject } from "../api/conversationsMove";

export async function executeMoveChatsToProject(args: {
  accessToken: string;
  ids: string[];
  gizmoId: string;
  throttleMs: number;
}): Promise<{ okCount: number; failCount: number; elapsedMs: number; runId: string }> {
  const { accessToken, ids, gizmoId, throttleMs } = args;

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startedAt = nowMs();

  let okCount = 0;
  let failCount = 0;

  for (let idx = 0; idx < ids.length; idx++) {
    const id = ids[idx];

    if (idx > 0) {
      const jitter = randInt(0, 250);
      await sleep(throttleMs + jitter);
    }

    const t0 = nowMs();
    const r = await moveConversationToProject(accessToken, { conversationId: id, gizmoId });
    const lastOpMs = nowMs() - t0;

    if (r.ok) okCount++;
    else failCount++;

    chrome.runtime.sendMessage({
      type: MSG.MOVE_CHATS_TO_PROJECT_PROGRESS,
      runId,
      i: idx + 1,
      total: ids.length,
      id,
      gizmoId,
      ok: r.ok,
      status: r.status,
      error: r.error,
      elapsedMs: nowMs() - startedAt,
      lastOpMs,
      // extra tracing context (super useful while endpoint is unknown)
      meta: r.meta,
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

  return { okCount, failCount, elapsedMs: nowMs() - startedAt, runId };
}
