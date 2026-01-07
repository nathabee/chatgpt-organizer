// src/background/controllers/listAllChats.ts

// src/background/controllers/listAllChats.ts
import { MSG } from "../../shared/messages";
import type { ConversationItem } from "../../shared/types";
import { nowMs, randInt, sleep } from "../util/time";
import { listChatsPageApi } from "../api/conversationsApi";

export async function listAllChatsBackend(args: {
  accessToken: string;
  limit: number;
  pageSize: number;
  sinceUpdatedMs?: number;
}): Promise<{ conversations: ConversationItem[]; total?: number }> {
  const { accessToken, limit, pageSize, sinceUpdatedMs } = args;

  const collected = new Map<string, ConversationItem>();
  let offset = 0;
  let total: number | undefined;

  const t0 = nowMs();
  let safety = 0;

  while (collected.size < limit && safety < 200) {
    safety++;

    const pageLimit = Math.max(1, Math.min(100, pageSize));

    const page = await listChatsPageApi({
      accessToken,
      offset,
      limit: pageLimit,
      sinceUpdatedMs,
      debugFirstPage: safety === 1,
    });

    if (typeof page.total === "number") total = page.total;

    for (const it of page.items) {
      collected.set(it.id, it);
      if (collected.size >= limit) break;
    }

    offset += page.pageCount;

    chrome.runtime.sendMessage({
      type: MSG.LIST_ALL_CHATS_PROGRESS,
      found: collected.size,
      offset,
    } as any);

    if (page.reachedScopeEnd) break;
    if (page.pageCount < pageLimit) break;

    await sleep(90 + randInt(0, 120));
  }

  chrome.runtime.sendMessage({
    type: MSG.LIST_ALL_CHATS_DONE,
    total: collected.size,
    elapsedMs: nowMs() - t0,
  } as any);

  return { conversations: Array.from(collected.values()), total };
}
