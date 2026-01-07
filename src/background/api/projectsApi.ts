// src/background/api/projectsApi.ts
//
// Pure API calls + parsing.
// No chrome.runtime.sendMessage here.
// No console logging here.
// No MSG imports here.

import type { ConversationItem, ProjectItem } from "../../shared/types";

import { apiFetch, apiJson, ApiError } from "../http/apiClient";
import { randInt, sleep } from "../util/time";
import { rowUpdatedMs } from "../util/openaiTime";
import { ensureApiConfigLoaded, getApiConfigSnapshot } from "../util/apiConfig";
import {
  apiConversationUrl,
  apiGizmosSidebarUrl,
  apiGizmoConversationsUrl,
  apiUrl,
  uiGizmoHref,
} from "../util/apiUrls";
import { convoFromApiRow } from "./conversationsApi";

/* -----------------------------
   MOVE CONVERSATION INTO PROJECT
-------------------------------- */

export type MoveResult = { ok: true; status: number } | { ok: false; status?: number; error: string };

export async function moveConversationToProjectApi(
  accessToken: string,
  args: { conversationId: string; gizmoId: string }
): Promise<MoveResult> {
  const conversationId = String(args.conversationId || "").trim();
  const gizmoId = String(args.gizmoId || "").trim();

  if (!conversationId) return { ok: false, error: "Missing conversationId" };
  if (!gizmoId) return { ok: false, error: "Missing gizmoId" };

  await ensureApiConfigLoaded();

  try {
    const url = apiConversationUrl(conversationId);
    const resp = await apiFetch({
      url,
      method: "PATCH",
      accessToken,
      json: { gizmo_id: gizmoId },
    });
    return { ok: true, status: resp.status };
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : e?.status;
    return { ok: false, status, error: e?.message || "Network error" };
  }
}

/* -----------------------------
   DELETE PROJECT
-------------------------------- */

export type DeleteProjectResult =
  | { ok: true; status: number }
  | { ok: false; status?: number; error: string };

export async function deleteProjectApi(accessToken: string, gizmoId: string): Promise<DeleteProjectResult> {
  const id = String(gizmoId || "").trim();
  if (!id) return { ok: false, error: "Missing gizmoId" };

  await ensureApiConfigLoaded();

  try {
    const { pathGizmosRoot } = getApiConfigSnapshot();
    const url = apiUrl(`${pathGizmosRoot}/${encodeURIComponent(id)}`);

    // DELETE often returns empty body (204). Use apiFetch, not apiJson.
    const resp = await apiFetch({
      url,
      method: "DELETE",
      accessToken,
    });

    return { ok: true, status: resp.status };
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : e?.status;
    return { ok: false, status, error: e?.message || "Network error" };
  }
}

/* -----------------------------
   CREATE PROJECT
-------------------------------- */

export type CreateProjectResult =
  | { ok: true; status: number; gizmoId: string; title: string; href: string; shortUrl?: string }
  | { ok: false; status?: number; error: string };

export async function createProjectApi(
  accessToken: string,
  args: { name: string; description?: string; prompt_starters?: string[] }
): Promise<CreateProjectResult> {
  const name = String(args.name || "").trim();
  if (!name) return { ok: false, error: "Project name is required." };

  await ensureApiConfigLoaded();
  const { pathGizmosRoot, origin } = getApiConfigSnapshot();

  try {
    const url = apiUrl(`${pathGizmosRoot}/snorlax/upsert`);

    const payload = {
      instructions: "",
      display: {
        name,
        description: args.description ?? "",
        prompt_starters: Array.isArray(args.prompt_starters) ? args.prompt_starters : [],
      },
      tools: [],
      memory_scope: "unset",
      files: [],
      training_disabled: false,
      sharing: [
        {
          type: "private",
          capabilities: {
            can_read: true,
            can_view_config: false,
            can_write: false,
            can_delete: false,
            can_export: false,
            can_share: false,
          },
        },
      ],
    };


    const data = await apiJson<any>({
      url,
      method: "POST",
      accessToken,
      json: payload,
    });

    const gizmo = data?.resource?.gizmo;
    const gizmoId = String(gizmo?.id ?? "").trim();
    const title = String(gizmo?.display?.name ?? name).trim() || name;
    const shortUrl = String(gizmo?.short_url ?? "").trim() || undefined;


    const href = shortUrl ? uiGizmoHref(shortUrl) : `${origin}/`;

    if (!gizmoId) {
      return { ok: false, status: 200, error: "Create project succeeded but response had no gizmo id." };
    }

    return { ok: true, status: 200, gizmoId, title, href, shortUrl };
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : e?.status;
    return { ok: false, status, error: e?.message || "Network error" };
  }
}

/* -----------------------------
   LIST PROJECTS (SIDEBAR)
-------------------------------- */

export type GizmoSidebarProject = { gizmoId: string; title: string; href: string };

export async function listGizmoSidebarProjectsApi(args: {
  accessToken: string;
  limitProjects: number;
  conversationsPerGizmo: number;
  ownedOnly: boolean;
}): Promise<GizmoSidebarProject[]> {
  const { accessToken, limitProjects, conversationsPerGizmo, ownedOnly } = args;

  await ensureApiConfigLoaded();

  const out: GizmoSidebarProject[] = [];
  let cursor: string | null = null;
  let safety = 0;

  while (out.length < limitProjects && safety < 80) {
    safety++;

    const url = apiGizmosSidebarUrl({
      conversations_per_gizmo: conversationsPerGizmo,
      owned_only: ownedOnly ? "true" : "false",
      cursor: cursor ?? undefined,
    });

    const data = await apiJson<any>({ url, method: "GET", accessToken });

    const items = Array.isArray(data?.items) ? data.items : [];
    for (const it of items) {
      const gizmo = it?.gizmo?.gizmo;
      const gizmoId = String(gizmo?.id || "");
      if (!gizmoId) continue;

      const title = String(gizmo?.display?.name || gizmo?.short_url || gizmoId).trim() || "Untitled";
      const shortUrl = String(gizmo?.short_url || "").trim();
      const href = shortUrl ? uiGizmoHref(shortUrl) : getApiConfigSnapshot().origin + "/";

      out.push({ gizmoId, title, href });
      if (out.length >= limitProjects) break;
    }

    const nextCursor = typeof data?.cursor === "string" ? data.cursor : null;
    if (!nextCursor) break;
    cursor = nextCursor;

    await sleep(60 + randInt(0, 80));
  }

  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.gizmoId) ? false : (seen.add(p.gizmoId), true)));
}

/* -----------------------------
   LIST CONVERSATIONS PER PROJECT
-------------------------------- */

export async function listGizmoConversationsApi(args: {
  accessToken: string;
  gizmoId: string;
  limitConversations: number;
  sinceUpdatedMs?: number;
}): Promise<{ conversations: ConversationItem[]; outOfScope: boolean }> {
  const { accessToken, gizmoId, limitConversations, sinceUpdatedMs } = args;

  const convos = new Map<string, ConversationItem>();
  let cursor: string | null = null;
  let safety = 0;

  let reachedScopeEnd = false;
  let firstPageChecked = false;
  let outOfScope = false;

  while (convos.size < limitConversations && safety < 120 && !reachedScopeEnd) {
    safety++;

    const url = apiGizmoConversationsUrl(gizmoId, cursor);
    const data = await apiJson<any>({ url, method: "GET", accessToken });

    const items = Array.isArray(data?.items) ? data.items : [];

    if (!firstPageChecked) {
      firstPageChecked = true;

      if (typeof sinceUpdatedMs === "number") {
        const newestMs = items.length > 0 ? rowUpdatedMs(items[0]) : undefined;
        if (typeof newestMs !== "number") {
          reachedScopeEnd = true;
          break;
        }
        if (newestMs < sinceUpdatedMs) {
          outOfScope = true;
          reachedScopeEnd = true;
          break;
        }
      }
    }

    for (const row of items) {
      if (convos.size >= limitConversations) break;

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

      const it = convoFromApiRow(row, gizmoId);
      if (!it) continue;
      convos.set(it.id, it);
    }

    const next = typeof data?.cursor === "string" ? data.cursor : null;
    if (reachedScopeEnd) break;
    if (!next || next === cursor) break;
    cursor = next;

    if (!items.length) break;

    await sleep(80 + randInt(0, 120));
  }

  return { conversations: Array.from(convos.values()), outOfScope };
}

/* -----------------------------
   Convenience: list projects + conversations
-------------------------------- */

export async function listGizmoProjectsWithConversationsApi(args: {
  accessToken: string;
  limitProjects: number;
  conversationsPerGizmo: number;
  perProjectLimit: number;
  sinceUpdatedMs?: number;
}): Promise<ProjectItem[]> {
  const { accessToken, limitProjects, conversationsPerGizmo, perProjectLimit, sinceUpdatedMs } = args;

  const gizmos = await listGizmoSidebarProjectsApi({
    accessToken,
    limitProjects,
    conversationsPerGizmo,
    ownedOnly: true,
  });

  const projects: ProjectItem[] = [];

  for (const g of gizmos) {
    const { conversations } = await listGizmoConversationsApi({
      accessToken,
      gizmoId: g.gizmoId,
      limitConversations: perProjectLimit,
      sinceUpdatedMs,
    });

    if (typeof sinceUpdatedMs === "number" && conversations.length === 0) continue;

    projects.push({ gizmoId: g.gizmoId, title: g.title, href: g.href, conversations });
  }

  return projects;
}
