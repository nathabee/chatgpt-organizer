// src/background/api/gizmos.ts

// fetch projects

import { MSG } from "../../shared/messages";
import type { ConversationItem, ProjectItem } from "../../shared/types";
import { fetchJsonAuthed } from "../http/fetchJsonAuthed";
import { nowMs, randInt, sleep } from "../util/time";
import { convoFromApiRow } from "./conversations";
import * as debugTrace from "../../shared/debugTrace";

/**
 * Parse OpenAI time fields that may be:
 * - number (seconds or ms)
 * - numeric string
 * - ISO string
 */
function parseTimeToMs(v: any): number | undefined {
  if (v == null) return undefined;

  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 1e12) return Math.floor(v);
    if (v > 1e10) return Math.floor(v);
    if (v > 1e9) return Math.floor(v * 1000);
    return Math.floor(v * 1000);
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;

    const n = Number(s);
    if (Number.isFinite(n)) return parseTimeToMs(n);

    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;

    return undefined;
  }

  return undefined;
}

function rowUpdatedMs(row: any): number | undefined {
  return parseTimeToMs(row?.update_time) ?? parseTimeToMs(row?.create_time);
}

export async function deleteProject(
  accessToken: string,
  gizmoId: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const resp = await fetch(`https://chatgpt.com/backend-api/gizmos/${encodeURIComponent(gizmoId)}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
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

async function fetchGizmosSnorlaxSidebarPaged(args: {
  accessToken: string;
  limitProjects: number;
  conversationsPerGizmo: number;
  ownedOnly: boolean;
}): Promise<Array<{ gizmoId: string; title: string; href: string }>> {
  const { accessToken, limitProjects, conversationsPerGizmo, ownedOnly } = args;

  const out: Array<{ gizmoId: string; title: string; href: string }> = [];
  let cursor: string | null = null;
  let safety = 0;

  while (out.length < limitProjects && safety < 80) {
    safety++;

    const url =
      `https://chatgpt.com/backend-api/gizmos/snorlax/sidebar` +
      `?conversations_per_gizmo=${encodeURIComponent(String(conversationsPerGizmo))}` +
      `&owned_only=${ownedOnly ? "true" : "false"}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");

    const data = await fetchJsonAuthed<any>(url, accessToken);

    // auto debug while ON (one entry per sidebar paging run)
    if (safety === 1) {
      const enabled = await debugTrace.isEnabled().catch(() => false);
      if (enabled) {
        const first = Array.isArray(data?.items) ? data.items[0] : undefined;
        const keys = first && typeof first === "object" ? Object.keys(first) : [];

        // keep shallow
        const preview =
          first && typeof first === "object"
            ? {
                // these exist in your structure: item.gizmo.gizmo + wrapper keys
                hasGizmo: !!(first as any)?.gizmo,
                gizmoId: (first as any)?.gizmo?.gizmo?.id ?? null,
                name: (first as any)?.gizmo?.gizmo?.display?.name ?? null,
                short_url: (first as any)?.gizmo?.gizmo?.short_url ?? null,
              }
            : null;

        await debugTrace
          .append([
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: /gizmos/snorlax/sidebar first item keys (${keys.length})`,
              ok: true,
              meta: { keys },
            },
            {
              scope: "background",
              kind: "debug",
              message: "Auto debug: /gizmos/snorlax/sidebar first item (shallow preview)",
              ok: true,
              meta: { item: preview },
            },
          ])
          .catch(() => {});
      }
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    for (const it of items) {
      const gizmo = it?.gizmo?.gizmo;
      const gizmoId = String(gizmo?.id || "");
      if (!gizmoId) continue;

      const title = String(gizmo?.display?.name || gizmo?.short_url || gizmoId).trim() || "Untitled";

      const shortUrl = String(gizmo?.short_url || "").trim();
      const href = shortUrl ? `https://chatgpt.com/g/${shortUrl}` : `https://chatgpt.com/`;

      out.push({ gizmoId, title, href });
      if (out.length >= limitProjects) break;
    }

    const nextCursor = typeof data?.cursor === "string" ? data.cursor : null;
    if (!nextCursor) break;
    cursor = nextCursor;
  }

  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.gizmoId) ? false : (seen.add(p.gizmoId), true)));
}

async function fetchGizmoConversationsPaged(args: {
  accessToken: string;
  gizmoId: string;
  limitConversations: number;
  /** Optional cutoff: stop paging when conversations are older than this (ms epoch). */
  sinceUpdatedMs?: number;
}): Promise<ConversationItem[]> {
  const { accessToken, gizmoId, limitConversations, sinceUpdatedMs } = args;

  const convos = new Map<string, ConversationItem>();
  let cursor: string | null = null;
  let safety = 0;

  let reachedScopeEnd = false;

  while (convos.size < limitConversations && safety < 120 && !reachedScopeEnd) {
    safety++;

    const url =
      `https://chatgpt.com/backend-api/gizmos/${encodeURIComponent(gizmoId)}/conversations` +
      (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");

    const data = await fetchJsonAuthed<any>(url, accessToken);

    // auto debug while ON (one entry per gizmo conversations paging run, first page only)
    if (safety === 1) {
      const enabled = await debugTrace.isEnabled().catch(() => false);
      if (enabled) {
        const first = Array.isArray(data?.items) ? data.items[0] : undefined;
        const keys = first && typeof first === "object" ? Object.keys(first) : [];

        const preview =
          first && typeof first === "object"
            ? {
                id: (first as any)?.id ?? null,
                title: (first as any)?.title ?? null,
                create_time: (first as any)?.create_time ?? null,
                update_time: (first as any)?.update_time ?? null,
                gizmo_id: (first as any)?.gizmo_id ?? null,
              }
            : null;

        await debugTrace
          .append([
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: /gizmos/${gizmoId}/conversations first item keys (${keys.length})`,
              ok: true,
              meta: { keys, gizmoId },
            },
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: /gizmos/${gizmoId}/conversations first item (shallow preview)`,
              ok: true,
              meta: { item: preview, gizmoId },
            },
          ])
          .catch(() => {});
      }
    }

    const items = Array.isArray(data?.items) ? data.items : [];

    for (const row of items) {
      // Scope cutoff (assumes items are returned newest-first)
      if (typeof sinceUpdatedMs === "number") {
        const u = rowUpdatedMs(row);
        if (typeof u === "number" && u < sinceUpdatedMs) {
          reachedScopeEnd = true;
          break;
        }
      }

      const it = convoFromApiRow(row, gizmoId);
      if (!it) continue;
      convos.set(it.id, it);
      if (convos.size >= limitConversations) break;
    }

    const next = typeof data?.cursor === "string" ? data.cursor : null;
    if (reachedScopeEnd) break;
    if (!next || next === cursor) break;
    cursor = next;

    if (!items.length) break;

    await sleep(90 + randInt(0, 120));
  }

  return Array.from(convos.values());
}

export async function listGizmoProjectsWithConversations(args: {
  accessToken: string;
  limitProjects: number;
  conversationsPerGizmo: number;
  perProjectLimit: number;
  /** Optional cutoff: stop paging when conversations are older than this (ms epoch). */
  sinceUpdatedMs?: number;
}): Promise<ProjectItem[]> {
  const { accessToken, limitProjects, conversationsPerGizmo, perProjectLimit, sinceUpdatedMs } = args;

  const gizmos = await fetchGizmosSnorlaxSidebarPaged({
    accessToken,
    limitProjects,
    conversationsPerGizmo,
    ownedOnly: true,
  });

  const projects: ProjectItem[] = [];
  let totalConversations = 0;
  const t0 = nowMs();

  for (let i = 0; i < gizmos.length; i++) {
    const g = gizmos[i];

    const conversations = await fetchGizmoConversationsPaged({
      accessToken,
      gizmoId: g.gizmoId,
      limitConversations: perProjectLimit,
      sinceUpdatedMs,
    });

    totalConversations += conversations.length;

    projects.push({
      gizmoId: g.gizmoId,
      title: g.title,
      href: g.href,
      conversations,
    });

    chrome.runtime.sendMessage({
      type: MSG.LIST_GIZMO_PROJECTS_PROGRESS,
      foundProjects: i + 1,
      totalProjects: gizmos.length,
      foundConversations: totalConversations,
    });

    await sleep(120 + randInt(0, 180));
  }

  chrome.runtime.sendMessage({
    type: MSG.LIST_GIZMO_PROJECTS_DONE,
    totalProjects: projects.length,
    totalConversations,
    elapsedMs: nowMs() - t0,
  });

  return projects;
}
