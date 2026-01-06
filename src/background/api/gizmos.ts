// src/background/api/gizmos.ts
//
// -----------------------------------------------------------------------------
// ALGORITHM (v0.1.6+ behavior) — Scope-first, time-first, cache-clean
// -----------------------------------------------------------------------------
// Assumption (until proven otherwise):
//   A conversation can be updated without any reliable "project updated" timestamp
//   changing in the project container (gizmo).
//
// Consequences:
//   - We MUST NOT rely on a project-level updated date for filtering.
//   - The only trustworthy scope signal is conversation update_time/create_time.
//   - The server API does not accept a "since" parameter, so we cannot filter
//     server-side. We can only stop early client-side.
//
// Goals:
//   1) Do not wait too long: stop early whenever scope makes data irrelevant.
//   2) Do not pollute cache: only keep projects that have at least one
//      conversation within scope.
//   3) Limits remain guardrails: prevent "fetch forever" for large scopes.
//
// Behavior:
//   - Fetch project list from /gizmos/snorlax/sidebar (no scope filtering).
//   - For EACH project (up to limitProjects):
//       A) Fetch page 1 of /gizmos/{id}/conversations.
//       B) If scope is set AND the newest conversation is older than scope,
//          SKIP this project immediately (fast exit: 1 request).
//       C) Otherwise, page conversations newest-first until:
//            - we encounter the first conversation older than scope (stop),
//            - we reach perProjectLimit (guardrail),
//            - or safety/empty/cursor stops.
//       D) Keep only conversations within scope.
//       E) If scope is set and we kept 0 conversations => do NOT include project.
//
// Notes:
//   - We assume API returns items newest-first. If that changes, scope cutoffs
//     become less effective, but limits still prevent runaway.
//   - If a row has no parseable update_time/create_time and scope is set,
//     we treat it as "out of scope" and stop paging. This is conservative and
//     optimizes for speed + cache cleanliness. If this ever drops useful data,
//     we can relax it after observing real payloads.
//
// Progress semantics:
//   - "processedProjects" counts how many projects we have scanned.
//   - "foundProjects" counts how many projects we KEEP (in scope).
//   - "foundConversations" counts total conversations kept across kept projects.
// -----------------------------------------------------------------------------


import { MSG } from "../../shared/messages";
import type { ConversationItem, ProjectItem } from "../../shared/types";
import { fetchJsonAuthed } from "../http/fetchJsonAuthed";
import { nowMs, randInt, sleep } from "../util/time";
import { convoFromApiRow } from "./conversations";
import * as debugTrace from "../../shared/debugTrace";
import { rowUpdatedMs } from "../util/openaiTime";

import { ensureDevConfigLoaded, getDevConfigSnapshot } from "../util/devConfig";
import { apiGizmosSidebarUrl, apiGizmoConversationsUrl, uiGizmoHref } from "../util/apiUrls";
import { tracedFetch, safePathFromUrl } from "../util/fetch";

import { apiUrl } from "../util/apiUrls";
import { getApiConfigSnapshot } from "../util/apiConfig";
import { ensureApiConfigLoaded } from "../util/apiConfig";
  

function traceEndpointLabel(path: string): string {
  // Keep traces stable and readable: show only the path, not full origin
  // but include origin separately in the meta.
  return path;
}

function traceMetaBase(extra?: any) {
  const cfg = getApiConfigSnapshot();
  return {
    origin: cfg.origin,
    ...extra,
  };
}



function fmtMs(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  try {
    return new Date(ms).toISOString();
  } catch {
    return String(ms);
  }
}

function unitHint(ms: number | undefined): string {
  if (typeof ms !== "number") return "unset";
  if (ms > 1e12) return "ms";
  if (ms > 1e9) return "sec?";
  return "tiny?";
}



export async function deleteProject(
  accessToken: string,
  gizmoId: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    await ensureApiConfigLoaded();
    const { pathGizmosRoot } = getApiConfigSnapshot();
    const url = apiUrl(`${pathGizmosRoot}/${encodeURIComponent(gizmoId)}`);
    const resp = await tracedFetch(
      url,
      {
        method: "DELETE",
        credentials: "include",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

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

    const url = apiGizmosSidebarUrl({
      conversations_per_gizmo: conversationsPerGizmo,
      owned_only: ownedOnly ? "true" : "false",
      cursor: cursor ?? undefined,
    });



    const data = await fetchJsonAuthed<any>(url, accessToken);

    // auto debug while ON (one entry per sidebar paging run)
    if (safety === 1) {
      const enabled = await debugTrace.isEnabled().catch(() => false);
      if (enabled) {
        const first = Array.isArray(data?.items) ? data.items[0] : undefined;
        const keys = first && typeof first === "object" ? Object.keys(first) : [];

        const preview =
          first && typeof first === "object"
            ? {
              hasGizmo: !!(first as any)?.gizmo,
              gizmoId: (first as any)?.gizmo?.gizmo?.id ?? null,
              name: (first as any)?.gizmo?.gizmo?.display?.name ?? null,
              short_url: (first as any)?.gizmo?.gizmo?.short_url ?? null,
            }
            : null;

        const { pathGizmosSidebar } = getApiConfigSnapshot();
        const label = traceEndpointLabel(pathGizmosSidebar);
        const urlPath = safePathFromUrl(url);

        await debugTrace
          .append([
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: ${label} first item keys (${keys.length})`,
              ok: true,
              meta: traceMetaBase({ keys, urlPath }),
            },
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: ${label} first item (shallow preview)`,
              ok: true,
              meta: traceMetaBase({ item: preview, urlPath }),
            },
          ])
          .catch(() => { });
      }
    }


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
}): Promise<{ conversations: ConversationItem[]; outOfScope: boolean }> {
  const { accessToken, gizmoId, limitConversations, sinceUpdatedMs } = args;

  const convos = new Map<string, ConversationItem>();
  let cursor: string | null = null;
  let safety = 0;

  let reachedScopeEnd = false;
  let firstPageChecked = false;

  // True ONLY when page-1 newest is older than scope.
  // This is used by the outer loop "stopAfterOutOfScopeProjects".
  let outOfScope = false;

  while (convos.size < limitConversations && safety < 120 && !reachedScopeEnd) {
    safety++;

    const url = apiGizmoConversationsUrl(gizmoId, cursor);


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

        const { pathGizmoConversations } = getApiConfigSnapshot();
        const label = traceEndpointLabel(pathGizmoConversations);
        const urlPath = safePathFromUrl(url);

        await debugTrace
          .append([
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: ${label} first item keys (${keys.length})`,
              ok: true,
              meta: traceMetaBase({ keys, gizmoId, urlPath }),
            },
            {
              scope: "background",
              kind: "debug",
              message: `Auto debug: ${label} first item (shallow preview)`,
              ok: true,
              meta: traceMetaBase({ item: preview, gizmoId, urlPath }),
            },
          ])
          .catch(() => { });
      }
    }

    const items = Array.isArray(data?.items) ? data.items : [];

    // First page fast decision:
    // - If newest < scope => definitely out-of-scope project (outOfScope=true).
    // - If newest timestamp missing => unknown; stop project (outOfScope stays false).
    if (!firstPageChecked) {
      firstPageChecked = true;

      if (typeof sinceUpdatedMs === "number") {
        const newestMs = items.length > 0 ? rowUpdatedMs(items[0]) : undefined;

        // Missing timestamp => unknown; stop conservatively, but NOT outOfScope
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

        // Missing timestamp under scope => unknown; stop conservatively (NOT outOfScope)
        if (typeof u !== "number") {
          reachedScopeEnd = true;
          break;
        }

        // We reached older-than-scope region; stop paging this project.
        // IMPORTANT: do NOT mark outOfScope here (project may still have newer items).
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

    await sleep(90 + randInt(0, 120));
  }

  return { conversations: Array.from(convos.values()), outOfScope };
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

  // Load dev config once, then use sync snapshot.
  await ensureDevConfigLoaded();
  await ensureApiConfigLoaded();

  const { traceScope, stopAfterOutOfScopeProjects } = getDevConfigSnapshot();
  let consecutiveOutOfScope = 0;

  if (traceScope) {
    const { origin } = getApiConfigSnapshot();
    console.log("[CGO][scope] listGizmoProjectsWithConversations args", {
      origin,
      sinceUpdatedMs,
      unit: unitHint(sinceUpdatedMs),
      sinceIso: fmtMs(sinceUpdatedMs),
      limitProjects,
      conversationsPerGizmo,
      perProjectLimit,
      stopAfterOutOfScopeProjects,
    });
  }

  const gizmos = await fetchGizmosSnorlaxSidebarPaged({
    accessToken,
    limitProjects,
    conversationsPerGizmo,
    ownedOnly: true,
  });

  const projects: ProjectItem[] = [];
  let totalConversations = 0;
  const t0 = nowMs();

  let processedProjects = 0;
  let keptProjects = 0;

  for (let i = 0; i < gizmos.length; i++) {
    const g = gizmos[i];
    processedProjects++;

    const { conversations, outOfScope } = await fetchGizmoConversationsPaged({
      accessToken,
      gizmoId: g.gizmoId,
      limitConversations: perProjectLimit,
      sinceUpdatedMs,
    });

    // Early stop rule: only counts "definitely out-of-scope" projects (newest older than scope)
    if (typeof sinceUpdatedMs === "number") {
      if (outOfScope) consecutiveOutOfScope++;
      else consecutiveOutOfScope = 0;

      if (stopAfterOutOfScopeProjects > 0 && consecutiveOutOfScope >= stopAfterOutOfScopeProjects) {
        if (traceScope) {
          const { origin } = getApiConfigSnapshot();
          console.log("[CGO][scope] stopping early: too many out-of-scope projects", {
            origin,
            consecutiveOutOfScope,
            stopAfterOutOfScopeProjects,
          });
        }
        break;
      }
    }

    // If scope is set and nothing in scope, do not include this project.
    if (typeof sinceUpdatedMs === "number" && conversations.length === 0) {
      chrome.runtime.sendMessage({
        type: MSG.LIST_GIZMO_PROJECTS_PROGRESS,
        foundProjects: keptProjects,
        totalProjects: gizmos.length,
        foundConversations: totalConversations,
        processedProjects,
        keptProjects,
      } as any);

      await sleep(120 + randInt(0, 180));
      continue;
    }

    totalConversations += conversations.length;

    projects.push({
      gizmoId: g.gizmoId,
      title: g.title,
      href: g.href,
      conversations,
    });

    keptProjects++;

    chrome.runtime.sendMessage({
      type: MSG.LIST_GIZMO_PROJECTS_PROGRESS,
      foundProjects: keptProjects,
      totalProjects: gizmos.length,
      foundConversations: totalConversations,
      processedProjects,
      keptProjects,
    } as any);

    await sleep(120 + randInt(0, 180));
  }

  chrome.runtime.sendMessage({
    type: MSG.LIST_GIZMO_PROJECTS_DONE,
    totalProjects: projects.length,
    totalConversations,
    elapsedMs: nowMs() - t0,
    processedProjects,
    keptProjects,
  } as any);

  return projects;
}
