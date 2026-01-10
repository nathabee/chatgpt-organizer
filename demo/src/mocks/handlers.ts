// demo/src/mocks/handlers.ts
import { MSG } from "../../../src/shared/messages";
import type { AnyRequest } from "../../../src/shared/messages/requests";
import { DEMO } from "./data";
import { emitEvent } from "./runtime";
import type { ConversationItem, ProjectItem } from "../../../src/shared/types";

console.log("[cgo-demo] mock handlers loaded");

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

      // simulate work
      await sleep(150);

      const totalProjects = DEMO.projects.length;
      const totalConversations = DEMO.projects.reduce((acc, p) => acc + (p.conversations?.length || 0), 0);

      emitEvent({
        type: MSG.LIST_GIZMO_PROJECTS_DONE,
        totalProjects,
        totalConversations,
        elapsedMs: now() - t0,
      } as any);

      return { ok: true, projects: DEMO.projects };
    }

    case MSG.LIST_ALL_CHATS: {
      const t0 = now();

      emitEvent({ type: MSG.LIST_ALL_CHATS_PROGRESS, found: 0 } as any);
      await sleep(120);

      emitEvent({
        type: MSG.LIST_ALL_CHATS_DONE,
        total: DEMO.singles.length,
        elapsedMs: now() - t0,
      } as any);

      return { ok: true, conversations: DEMO.singles };
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
      return {
        ok: true,
        gizmoId: `g-${now()}`,
        title: (req as any).name || "New Project",
        href: "#",
      };
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
 

export function makeMockAllChatsResponse(_req: any) {
  const conversations: ConversationItem[] = [
    { id: "c1", title: "Demo chat 1", updatedAt: Date.now(), gizmoId: "" },
    { id: "c2", title: "Demo chat 2", updatedAt: Date.now() - 86400000, gizmoId: "" },
  ];
  return { ok: true as const, conversations };
}

export function makeMockProjectsResponse(_req: any) {
  const projects: ProjectItem[] = [
    {
      gizmoId: "p1",
      title: "Demo Project A",
      description: "Mock project",
      conversations: [
        { id: "pc1", title: "Project chat 1", updatedAt: Date.now(), gizmoId: "p1" } as any,
      ],
    } as any,
  ];
  return { ok: true as const, projects };
}
