// src/background/api/conversationsApi.ts
// Pure API calls + parsing.
// No chrome.runtime.sendMessage here.
// No MSG imports here.

import type { ConversationItem } from "../../shared/types";
import * as debugTrace from "../../shared/debugTrace";

import { apiFetch, apiJson, ApiError } from "../http/apiClient";
import { randInt, sleep } from "../util/time";
import { ensureApiConfigLoaded, getApiConfigSnapshot } from "../util/apiConfig";
import { apiConversationsUrl, apiConversationUrl, uiConversationHref } from "../util/apiUrls";
import { rowUpdatedMs } from "../util/openaiTime";
import { safePathFromUrl } from "../util/urls";

export function convoFromApiRow(row: any, gizmoId: string | null): ConversationItem | null {
  const id = String(row?.id || "");
  if (!id) return null;

  const title = String(row?.title || "").trim() || "Untitled";
  const createTime = row?.create_time ? String(row.create_time) : undefined;
  const updateTime = row?.update_time ? String(row.update_time) : undefined;

  return {
    id,
    title,
    href: uiConversationHref(id),
    gizmoId,
    createTime,
    updateTime,
  };
}

export type ListChatsPageResult = {
  items: ConversationItem[];
  total?: number;
  reachedScopeEnd: boolean;
  pageCount: number;
};

export async function listChatsPageApi(args: {
  accessToken: string;
  offset: number;
  limit: number;
  sinceUpdatedMs?: number;
  debugFirstPage?: boolean;
}): Promise<ListChatsPageResult> {
  const { accessToken, offset, limit, sinceUpdatedMs, debugFirstPage } = args;

  await ensureApiConfigLoaded();

  const url = apiConversationsUrl({
    offset,
    limit,
    order: "updated",
    is_archived: false,
    is_starred: false,
  });

  const data = await apiJson<any>({ url, method: "GET", accessToken });

  // optional persisted debug trace (first page only, shallow)
  if (debugFirstPage) {
    const enabled = await debugTrace.isEnabled().catch(() => false);
    if (enabled) {
      const first = Array.isArray(data?.items) ? data.items[0] : undefined;
      const keys = first && typeof first === "object" ? Object.keys(first) : [];

      const preview =
        first && typeof first === "object"
          ? {
              id: (first as any).id ?? null,
              title: (first as any).title ?? null,
              create_time: (first as any).create_time ?? null,
              update_time: (first as any).update_time ?? null,
              gizmo_id: (first as any).gizmo_id ?? null,
              is_archived: (first as any).is_archived ?? null,
              is_starred: (first as any).is_starred ?? null,
              snippet: (first as any).snippet ?? null,
            }
          : null;

      const cfg = getApiConfigSnapshot();
      const urlPath = safePathFromUrl(url);

      await debugTrace
        .append([
          {
            scope: "background",
            kind: "debug",
            message: `Auto debug: ${urlPath} first item keys (${keys.length})`,
            ok: true,
            meta: { origin: cfg.origin, keys, urlPath },
          },
          {
            scope: "background",
            kind: "debug",
            message: `Auto debug: ${urlPath} first item (shallow preview)`,
            ok: true,
            meta: { origin: cfg.origin, item: preview, urlPath },
          },
        ])
        .catch(() => {});
    }
  }

  const itemsRaw = Array.isArray(data?.items) ? data.items : [];
  const items: ConversationItem[] = [];

  let reachedScopeEnd = false;

  for (const row of itemsRaw) {
    if (typeof sinceUpdatedMs === "number") {
      const u = rowUpdatedMs(row);
      if (typeof u !== "number") {
        reachedScopeEnd = true;
        break;
      }
      if (u < sinceUpdatedMs) {
        reachedScopeEnd = true;
        break;
      }
    }

    const it = convoFromApiRow(row, null);
    if (it) items.push(it);
  }

  return {
    items,
    total: typeof data?.total === "number" ? data.total : undefined,
    reachedScopeEnd,
    pageCount: itemsRaw.length,
  };
}

export async function deleteConversationApi(
  accessToken: string,
  id: string
): Promise<{ ok: true; status: number } | { ok: false; status?: number; error: string }> {
  const cid = String(id || "").trim();
  if (!cid) return { ok: false, error: "Missing conversation id" };

  try {
    const url = apiConversationUrl(cid);
    const resp = await apiFetch({
      url,
      method: "PATCH",
      accessToken,
      json: { is_visible: false },
    });
    return { ok: true, status: resp.status };
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : e?.status;
    return { ok: false, status, error: e?.message || "Network error" };
  }
}

// keep retry logic in API layer (pure), no logging here
export async function deleteWithRetryApi(
  accessToken: string,
  id: string,
  throttleMs: number
): Promise<{ ok: boolean; status?: number; error?: string; attempt: number; lastOpMs: number }> {
  const maxAttempts = 3;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    const t0 = Date.now();

    const r = await deleteConversationApi(accessToken, id);
    const lastOpMs = Date.now() - t0;

    if (r.ok) return { ok: true, status: r.status, attempt, lastOpMs };

    const status = r.status;
    const is429 = status === 429;
    const is5xx = typeof status === "number" && status >= 500 && status <= 599;
    const isNetworkish = !status && !!(r as any).error;

    const canRetry =
      (is429 && attempt < maxAttempts) ||
      (is5xx && attempt < 2) ||
      (isNetworkish && attempt < 2);

    if (!canRetry) return { ok: false, status, error: (r as any).error, attempt, lastOpMs };

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
