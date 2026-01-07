// src/background/controllers/listGizmoProjects.ts
//
// Controller: orchestrates API calls + emits progress/done events.
// - Uses projectsApi.ts (pure API)
// - Emits chrome.runtime.sendMessage here (NOT in API)

import { MSG } from "../../shared/messages";
import type { ProjectItem } from "../../shared/types";

import { nowMs, randInt, sleep } from "../util/time";
import { ensureDevConfigLoaded, getDevConfigSnapshot } from "../util/devConfig";

import {
  listGizmoSidebarProjectsApi,
  listGizmoConversationsApi,
} from "../api/projectsApi";

import { logTrace, logWarn, logError } from "../util/log";

export async function listGizmoProjectsWithConversations(args: {
  accessToken: string;
  limitProjects: number;
  conversationsPerGizmo: number;
  perProjectLimit: number;
  sinceUpdatedMs?: number;
}): Promise<ProjectItem[]> {
  const { accessToken, limitProjects, conversationsPerGizmo, perProjectLimit, sinceUpdatedMs } = args;

  await ensureDevConfigLoaded();
  const { stopAfterOutOfScopeProjects } = getDevConfigSnapshot();

  const t0 = nowMs();

  logTrace("controller listGizmoProjectsWithConversations start", {
    limitProjects,
    conversationsPerGizmo,
    perProjectLimit,
    sinceUpdatedMs,
    stopAfterOutOfScopeProjects,
  });

  // 1) Load sidebar list (paged inside API)
  const gizmos = await listGizmoSidebarProjectsApi({
    accessToken,
    limitProjects,
    conversationsPerGizmo,
    ownedOnly: true,
  });

  const projects: ProjectItem[] = [];
  let totalConversations = 0;

  let processedProjects = 0;
  let keptProjects = 0;

  // Early stop rule (same behavior as before)
  let consecutiveOutOfScope = 0;

  for (let i = 0; i < gizmos.length; i++) {
    const g = gizmos[i];
    processedProjects++;

    let conversations: ProjectItem["conversations"] = [];
    let outOfScope = false;

    try {
      const r = await listGizmoConversationsApi({
        accessToken,
        gizmoId: g.gizmoId,
        limitConversations: perProjectLimit,
        sinceUpdatedMs,
      });
      conversations = r.conversations;
      outOfScope = r.outOfScope;
    } catch (e: any) {
      // API client already logs HTTP failures; this is controller-level context.
      logWarn("controller listGizmoConversations failed", {
        gizmoId: g.gizmoId,
        error: e?.message || String(e),
      });

      // Progress update anyway (so UI doesn't look stuck)
      chrome.runtime.sendMessage({
        type: MSG.LIST_GIZMO_PROJECTS_PROGRESS,
        foundProjects: keptProjects,
        totalProjects: gizmos.length,
        foundConversations: totalConversations,
        processedProjects,
        keptProjects,
        // optional extra context
        lastError: e?.message || "Failed to fetch conversations",
        lastGizmoId: g.gizmoId,
      } as any);

      await sleep(120 + randInt(0, 180));
      continue;
    }

    // Early stop rule: only counts "definitely out-of-scope" projects
    if (typeof sinceUpdatedMs === "number") {
      if (outOfScope) consecutiveOutOfScope++;
      else consecutiveOutOfScope = 0;

      if (stopAfterOutOfScopeProjects > 0 && consecutiveOutOfScope >= stopAfterOutOfScopeProjects) {
        logTrace("controller early stop: too many out-of-scope projects", {
          consecutiveOutOfScope,
          stopAfterOutOfScopeProjects,
        });
        break;
      }
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

  logTrace("controller listGizmoProjectsWithConversations done", {
    totalProjects: projects.length,
    totalConversations,
    elapsedMs: nowMs() - t0,
    processedProjects,
    keptProjects,
  });

  return projects;
}
