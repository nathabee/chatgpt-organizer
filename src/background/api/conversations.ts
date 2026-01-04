// src/background/api/conversations.ts

import { MSG } from "../../shared/messages";
import type { ConversationItem } from "../../shared/types";
import * as debugTrace from "../../shared/debugTrace";
import { fetchJsonAuthed } from "../http/fetchJsonAuthed";
import { nowMs, randInt, sleep } from "../util/time";
import { normalizeChatHref } from "../util/urls";

/**
 * Parse OpenAI time fields that may be:
 * - number (seconds or ms)
 * - numeric string
 * - ISO string
 */
function parseTimeToMs(v: any): number | undefined {
  if (v == null) return undefined;

  if (typeof v === "number" && Number.isFinite(v)) {
    // Heuristic: seconds vs ms
    if (v > 1e12) return Math.floor(v); // already ms
    if (v > 1e10) return Math.floor(v); // ms
    if (v > 1e9) return Math.floor(v * 1000); // seconds
    // small numbers: treat as seconds (common for epoch seconds)
    return Math.floor(v * 1000);
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;

    // numeric string?
    const n = Number(s);
    if (Number.isFinite(n)) {
      return parseTimeToMs(n);
    }

    // ISO date string?
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;

    return undefined;
  }

  return undefined;
}

function rowUpdatedMs(row: any): number | undefined {
  // Prefer update_time; fall back to create_time
  return parseTimeToMs(row?.update_time) ?? parseTimeToMs(row?.create_time);
}

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
  /** Optional cutoff: stop paging when chats are older than this (ms epoch). */
  sinceUpdatedMs?: number;
}): Promise<{ conversations: ConversationItem[]; total?: number }> {
  const { accessToken, limit, pageSize, sinceUpdatedMs } = args;

  const collected = new Map<string, ConversationItem>();
  let offset = 0;
  let total: number | undefined;

  const t0 = nowMs();
  let safety = 0;

  let reachedScopeEnd = false;

  while (collected.size < limit && safety < 200 && !reachedScopeEnd) {
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

    // auto debug while ON (one entry per list run)
    if (safety === 1) {
      const enabled = await debugTrace.isEnabled().catch(() => false);
      if (enabled) {
        const first = Array.isArray(data?.items) ? data.items[0] : undefined;
        const keys = first && typeof first === "object" ? Object.keys(first) : [];

        // keep preview shallow to avoid huge storage
        const preview: any =
          first && typeof first === "object"
            ? {
                id: first.id ?? null,
                title: first.title ?? null,
                create_time: first.create_time ?? null,
                update_time: first.update_time ?? null,
                gizmo_id: first.gizmo_id ?? null,
                is_archived: first.is_archived ?? null,
                is_starred: first.is_starred ?? null,
                snippet: first.snippet ?? null,
              }
            : null;

        await debugTrace
          .append([
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: /conversations first item keys (${keys.length})`,
              ok: true,
              meta: { keys },
            },
            {
              scope: "background",
              kind: "debug",
              message: "Auto debug: /conversations first item (shallow preview)",
              ok: true,
              meta: { item: preview },
            },
          ])
          .catch(() => {});
      }
    }

    if (typeof data?.total === "number") total = data.total;

    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) break;

    for (const row of items) {
      // Scope cutoff (assumes API is sorted by updated desc, which it is with order=updated)
      if (typeof sinceUpdatedMs === "number") {
        const u = rowUpdatedMs(row);
        if (typeof u === "number" && u < sinceUpdatedMs) {
          reachedScopeEnd = true;
          break;
        }
      }

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

    if (reachedScopeEnd) break;
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
