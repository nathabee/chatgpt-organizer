// demo/src/mocks/handlers.ts
import { MSG } from "../../../src/shared/messages";
import type { AnyRequest } from "../../../src/shared/messages/requests";
import { DEMO } from "./data";
import { emitEvent } from "./runtime";
import type { ConversationItem, ProjectItem } from "../../../src/shared/types";

// console.log("[cgo-demo] mock handlers loaded");
function scopeToTs(scopeYmd: string | undefined): number {
  if (!scopeYmd) return -Infinity;
  // Interpret YYYY-MM-DD as UTC midnight (stable across machines)
  return Date.parse(`${scopeYmd}T00:00:00.000Z`);
}

function convTs(c: any): number {
  const t = c?.updateTime || c?.createTime;
  const ms = typeof t === "string" ? Date.parse(t) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}


function now() {
  return Date.now();
}

export async function handleRequest(req: AnyRequest): Promise<any> {
  switch (req.type) {
    case MSG.LIST_GIZMO_PROJECTS: {
      const t0 = now();

      emitEvent({
        type: MSG.LIST_GIZMO_PROJECTS_PROGRESS,
        foundProjects: 0,
        foundConversations: 0,
      } as any);

      await sleep(150);

      const scopeYmd = (req as any).scopeYmd as string | undefined;
      const limitProjects = Number((req as any).limit ?? (req as any).limitProjects ?? 50);
      const perProjectLimit = Number((req as any).perProjectLimit ?? 50);

      const since = scopeToTs(scopeYmd);

      // Filter conversations inside projects by scope
      const projects = (DEMO.projects as any[])
        .map((p) => {
          const convs = (p.conversations ?? [])
            .filter((c: any) => convTs(c) >= since)
            .sort((a: any, b: any) => convTs(b) - convTs(a))
            .slice(0, perProjectLimit);

          return { ...p, conversations: convs };
        }) 
        .slice(0, limitProjects);

      const totalProjects = projects.length;
      const totalConversations = projects.reduce((acc, p) => acc + (p.conversations?.length || 0), 0);

      emitEvent({
        type: MSG.LIST_GIZMO_PROJECTS_DONE,
        totalProjects,
        totalConversations,
        elapsedMs: now() - t0,
      } as any);

      return { ok: true, projects };
    }


    case MSG.LIST_ALL_CHATS: {
      const t0 = now();

      emitEvent({ type: MSG.LIST_ALL_CHATS_PROGRESS, found: 0 } as any);
      await sleep(120);

      const scopeYmd = (req as any).scopeYmd as string | undefined;
      const pageSize = Number((req as any).pageSize ?? 50);
      const limit = Number((req as any).limit ?? pageSize);

      const since = scopeToTs(scopeYmd);

      const filtered = (DEMO.singles as any[])
        .filter((c) => convTs(c) >= since)
        .sort((a, b) => convTs(b) - convTs(a))
        .slice(0, limit);

      emitEvent({
        type: MSG.LIST_ALL_CHATS_DONE,
        total: filtered.length,
        elapsedMs: now() - t0,
      } as any);

      return { ok: true, conversations: filtered };
    }


    case MSG.EXECUTE_DELETE: {
      const ids = (req as any).ids as string[];
      const runId = `run-${now()}`;

      // Fire progress events (the UI expects them)
      let i = 0;
      for (const id of ids) {
        i++;
        await sleep(80);

        emitEvent({
          type: MSG.EXECUTE_DELETE_PROGRESS,
          runId,
          i,
          total: ids.length,
          id,
          ok: true,
          status: 200,
          attempt: 1,
          elapsedMs: 0,
          lastOpMs: 80,
        } as any);
      }

      emitEvent({
        type: MSG.EXECUTE_DELETE_DONE,
        runId,
        total: ids.length,
        okCount: ids.length,
        failCount: 0,
        elapsedMs: 0,
      } as any);

      return { ok: true };
    }

    case MSG.MOVE_CHATS_TO_PROJECT: {
      const ids = (req as any).ids as string[];
      const runId = `run-${now()}`;

      let i = 0;
      for (const id of ids) {
        i++;
        await sleep(90);

        emitEvent({
          type: MSG.MOVE_CHATS_TO_PROJECT_PROGRESS,
          runId,
          i,
          total: ids.length,
          id,
          ok: true,
          status: 200,
          elapsedMs: 0,
          lastOpMs: 90,
        } as any);
      }

      emitEvent({
        type: MSG.MOVE_CHATS_TO_PROJECT_DONE,
        runId,
        total: ids.length,
        okCount: ids.length,
        failCount: 0,
        elapsedMs: 0,
      } as any);

      return { ok: true };
    }

    case MSG.CREATE_PROJECT: {
      emitEvent({ type: MSG.CREATE_PROJECT_PROGRESS, status: "creating" } as any);
      await sleep(120);

      const gizmoId = `g-${Math.random().toString(16).slice(2, 10)}`;

      const name = String((req as any).name ?? "").trim();
      const title = name || "Untitled project";

      const href = `https://chatgpt.com/g/${gizmoId}`;

      // Persist into demo in-memory store so manual refresh will include it.
      // NOTE: LIST_GIZMO_PROJECTS currently filters out projects with 0 conversations.
      // So we add a single demo conversation so it will show up immediately.
      const demoConvId = `pc-${Math.random().toString(16).slice(2, 10)}`;

      const newProject: ProjectItem = {
        gizmoId,
        title,
        href,
        conversations: [
          {
            id: demoConvId,
            title: `Welcome to ${title}`,
            href: `https://chatgpt.com/c/${demoConvId}`,
            gizmoId,
            // satisfy convTs() filter
            updateTime: new Date().toISOString(),
            createTime: new Date().toISOString(),
          } as any,
        ],
      };

      // Insert at top
      (DEMO.projects as any[]).unshift(newProject as any);

      emitEvent({ type: MSG.CREATE_PROJECT_DONE, ok: true, gizmoId, title, href } as any);

      // Return response (NO refresh, NO list)
      return { ok: true, gizmoId, title, href };
    }



    case MSG.DELETE_PROJECTS: {
      const gizmoIds = (req as any).gizmoIds as string[];
      const runId = `run-${now()}`;

      let i = 0;
      for (const gizmoId of gizmoIds) {
        i++;
        await sleep(100);

        emitEvent({
          type: MSG.DELETE_PROJECTS_PROGRESS,
          runId,
          i,
          total: gizmoIds.length,
          gizmoId,
          ok: true,
          status: 200,
          elapsedMs: 0,
          lastOpMs: 100,
        } as any);
      }

      emitEvent({
        type: MSG.DELETE_PROJECTS_DONE,
        runId,
        total: gizmoIds.length,
        okCount: gizmoIds.length,
        failCount: 0,
        elapsedMs: 0,
      } as any);

      return { ok: true };
    }

    default:
      return { ok: false, error: `Demo handler not implemented for: ${(req as any)?.type}` };
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}



/*
export function makeMockAllChatsResponse(_req: any) {
  const conversations: ConversationItem[] = [
    {
      id: "c1",
      title: "Demo chat 1",
      href: "https://chatgpt.com/c/c1",
      gizmoId: null,
      updateTime: new Date().toISOString(),
    },
    {
      id: "c2",
      title: "Demo chat 2",
      href: "https://chatgpt.com/c/c2",
      gizmoId: null,
      updateTime: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
  return { ok: true as const, conversations };
}

export function makeMockProjectsResponse(_req: any) {
  const projects: ProjectItem[] = [
    {
      gizmoId: "g-p-1",
      title: "Demo Project A",
      href: "#",
      conversations: [
        {
          id: "pc1",
          title: "Project chat 1",
          href: "https://chatgpt.com/c/pc1",
          gizmoId: "g-p-1",
          updateTime: new Date().toISOString(),
        },
      ],
    },
  ];
  return { ok: true as const, projects };
}

*/

