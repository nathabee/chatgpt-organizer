// src/background/api/conversations.ts

import { MSG } from "../../shared/messages";
import type { ConversationItem } from "../../shared/types";
import { fetchJsonAuthed } from "../http/fetchJsonAuthed";
import { nowMs, randInt, sleep } from "../util/time";
import { normalizeChatHref } from "../util/urls";

export function convoFromApiRow(row: any, gizmoId: string | null): ConversationItem | null {
  const id = String(row?.id || "");
  if (!id) return null;

  const title = String(row?.title || "").trim() || "Untitled";
  const createTime = row?.create_time ? String(row.create_time) : undefined;
  const updateTime = row?.update_time ? String(row.update_time) : undefined;

  return {
    id,
    title,
    href: normalizeChatHref(id),
    gizmoId,
    createTime,
    updateTime,
  };
}

export async function listAllChatsBackend(args: {
  accessToken: string;
  limit: number;
  pageSize: number;
}): Promise<{ conversations: ConversationItem[]; total?: number }> {
  const { accessToken, limit, pageSize } = args;

  const collected = new Map<string, ConversationItem>();
  let offset = 0;
  let total: number | undefined;

  const t0 = nowMs();
  let safety = 0;

  while (collected.size < limit && safety < 200) {
    safety++;

    const pageLimit = Math.max(1, Math.min(100, pageSize));
    const url =
      `https://chatgpt.com/backend-api/conversations` +
      `?offset=${offset}` +
      `&limit=${pageLimit}` +
      `&order=updated` +
      `&is_archived=false` +
      `&is_starred=false`;

    const data = await fetchJsonAuthed<any>(url, accessToken);

    if (typeof data?.total === "number") total = data.total;

    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) break;

    for (const row of items) {
      const it = convoFromApiRow(row, null);
      if (!it) continue;
      collected.set(it.id, it);
      if (collected.size >= limit) break;
    }

    offset += items.length;

    chrome.runtime.sendMessage({
      type: MSG.LIST_ALL_CHATS_PROGRESS,
      found: collected.size,
      offset,
    });

    if (items.length < pageLimit) break;

    await sleep(90 + randInt(0, 120));
  }

  chrome.runtime.sendMessage({
    type: MSG.LIST_ALL_CHATS_DONE,
    total: collected.size,
    elapsedMs: nowMs() - t0,
  });

  return { conversations: Array.from(collected.values()), total };
}

export async function deleteConversation(
  accessToken: string,
  id: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const resp = await fetch(`https://chatgpt.com/backend-api/conversation/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ is_visible: false }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, error: txt || `HTTP ${resp.status}` };
    }

    return { ok: true, status: resp.status };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function deleteWithRetry(
  accessToken: string,
  id: string,
  throttleMs: number
): Promise<{ ok: boolean; status?: number; error?: string; attempt: number; lastOpMs: number }> {
  const maxAttempts = 3;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    const t0 = nowMs();
    const r = await deleteConversation(accessToken, id);
    const lastOpMs = nowMs() - t0;

    if (r.ok) return { ...r, attempt, lastOpMs };

    const status = r.status;
    const is429 = status === 429;
    const is5xx = typeof status === "number" && status >= 500 && status <= 599;
    const isNetworkish = !status && !!r.error;

    const canRetry =
      (is429 && attempt < maxAttempts) ||
      (is5xx && attempt < 2) ||
      (isNetworkish && attempt < 2);

    if (!canRetry) return { ...r, attempt, lastOpMs };

    let backoffMs = throttleMs;
    if (is429) backoffMs = randInt(5000, 15000);
    else if (is5xx) backoffMs = randInt(2000, 5000);
    else if (isNetworkish) backoffMs = randInt(1000, 3000);

    backoffMs += randInt(0, 400);

    await sleep(backoffMs);
    attempt++;
  }

  return { ok: false, error: "Retry loop exhausted", attempt: maxAttempts, lastOpMs: 0 };
}
