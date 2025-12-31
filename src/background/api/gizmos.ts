// src/background/api/gizmos.ts


import { MSG } from "../../shared/messages";
import type { ConversationItem, ProjectItem } from "../../shared/types";
import { fetchJsonAuthed } from "../http/fetchJsonAuthed";
import { nowMs, randInt, sleep } from "../util/time";
import { convoFromApiRow } from "./conversations";

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

    const items = Array.isArray(data?.items) ? data.items : [];
    for (const it of items) {
      const gizmo = it?.gizmo?.gizmo;
      const gizmoId = String(gizmo?.id || "");
      if (!gizmoId) continue;

      const title =
        String(gizmo?.display?.name || gizmo?.short_url || gizmoId).trim() || "Untitled";

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
}): Promise<ConversationItem[]> {
  const { accessToken, gizmoId, limitConversations } = args;

  const convos = new Map<string, ConversationItem>();
  let cursor: string | null = null;
  let safety = 0;

  while (convos.size < limitConversations && safety < 120) {
    safety++;

    const url =
      `https://chatgpt.com/backend-api/gizmos/${encodeURIComponent(gizmoId)}/conversations` +
      (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");

    const data = await fetchJsonAuthed<any>(url, accessToken);

    const items = Array.isArray(data?.items) ? data.items : [];
    for (const row of items) {
      const it = convoFromApiRow(row, gizmoId);
      if (!it) continue;
      convos.set(it.id, it);
      if (convos.size >= limitConversations) break;
    }

    const next = typeof data?.cursor === "string" ? data.cursor : null;
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
}): Promise<ProjectItem[]> {
  const { accessToken, limitProjects, conversationsPerGizmo, perProjectLimit } = args;

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
