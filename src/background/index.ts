// src/background/index.ts
import { MSG, type AnyRequest } from "../shared/messages";

import { fetchSession } from "./session/session";
import { listAllChatsBackend } from "./api/conversations";
import { listGizmoProjectsWithConversations } from "./api/gizmos";
import { executeDeleteConversations } from "./executors/deleteConversations";
import { executeDeleteProjects } from "./executors/deleteProjects";
import { runLocks } from "./guards/runLocks";
import { getActiveChatGPTTab, sendToTab } from "./util/urls";
import { nowMs } from "./util/time";

import { trace, traceWarn, traceError } from "./util/log";

/* -----------------------------------------------------------
 * Helper
 * ----------------------------------------------------------- */
function scopeYmdToSinceMs(scopeYmd: any): number | undefined {
  const s = String(scopeYmd ?? "").trim();
  if (!s) return undefined;

  // Midnight UTC. Stable and predictable.
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) ? t : undefined;
}

/* -----------------------------------------------------------
 * Side panel behavior
 * ----------------------------------------------------------- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});
});

/* -----------------------------------------------------------
 * Message handler
 * ----------------------------------------------------------- */
chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === MSG.PING) {
      sendResponse({ ok: true });
      return;
    }

    // LIST ALL CHATS (backend)
    if (msg?.type === MSG.LIST_ALL_CHATS) {
      if (runLocks.listChatsRunning) {
        sendResponse({ ok: false, error: "A chat listing is already running." } as any);
        return;
      }
      runLocks.listChatsRunning = true;

      try {
        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          sendResponse({ ok: false, error: "Not logged in (no access token)." } as any);
          return;
        }

        const limit = Math.max(1, Math.min(50000, Number((msg as any).limit ?? 50)));
        const pageSize = Math.max(1, Math.min(100, Number((msg as any).pageSize ?? 50)));

        const scopeYmd = (msg as any).scopeYmd;
        const sinceUpdatedMs = scopeYmdToSinceMs(scopeYmd);

        trace("background LIST_ALL_CHATS", { scopeYmd, sinceUpdatedMs, limit, pageSize });

        const { conversations, total } = await listAllChatsBackend({
          accessToken: session.accessToken,
          limit,
          pageSize,
          sinceUpdatedMs,
        });

        sendResponse({ ok: true, conversations, total } as any);
        return;
      } catch (e: any) {
        traceError("background LIST_ALL_CHATS failed", e);
        sendResponse({ ok: false, error: e?.message || "Failed to list chats." } as any);
        return;
      } finally {
        runLocks.listChatsRunning = false;
      }
    }

    // LIST PROJECTS (backend)
    if (msg?.type === MSG.LIST_GIZMO_PROJECTS) {
      if (runLocks.listProjectsRunning) {
        sendResponse({ ok: false, error: "A projects listing is already running." } as any);
        return;
      }
      runLocks.listProjectsRunning = true;

      try {
        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          sendResponse({ ok: false, error: "Not logged in (no access token)." } as any);
          return;
        }

        const limitProjects = Math.max(1, Math.min(5000, Number((msg as any).limit ?? 50)));
        const conversationsPerGizmo = Math.max(
          1,
          Math.min(50, Number((msg as any).conversationsPerGizmo ?? 5))
        );
        const perProjectLimit = Math.max(1, Math.min(50000, Number((msg as any).perProjectLimit ?? 5000)));

        const scopeYmd = (msg as any).scopeYmd;
        const sinceUpdatedMs = scopeYmdToSinceMs(scopeYmd);

        trace("background LIST_GIZMO_PROJECTS", {
          scopeYmd,
          sinceUpdatedMs,
          limitProjects,
          conversationsPerGizmo,
          perProjectLimit,
        });

        const projects = await listGizmoProjectsWithConversations({
          accessToken: session.accessToken,
          limitProjects,
          conversationsPerGizmo,
          perProjectLimit,
          sinceUpdatedMs,
        });

        sendResponse({ ok: true, projects } as any);
        return;
      } catch (e: any) {
        traceError("background LIST_GIZMO_PROJECTS failed", e);
        sendResponse({ ok: false, error: e?.message || "Failed to list projects." } as any);
        return;
      } finally {
        runLocks.listProjectsRunning = false;
      }
    }

    // EXECUTE DELETE (chats)
    if (msg?.type === MSG.EXECUTE_DELETE) {
      const ids: string[] = (msg as any).ids || [];
      const clean = ids.filter(Boolean);

      if (!clean.length) {
        sendResponse({ ok: false, error: "No ids provided." } as any);
        return;
      }

      if (runLocks.executeRunning) {
        sendResponse({ ok: false, error: "An execute delete is already running." } as any);
        return;
      }
      runLocks.executeRunning = true;

      const startedAt = nowMs();

      try {
        const throttleMs = Math.max(150, Math.min(5000, Number((msg as any).throttleMs ?? 600)));

        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          traceWarn("EXECUTE_DELETE: not logged in", { meHint: session.meHint });

          // preserve old behavior: emit DONE event so UI can unlock
          const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          chrome.runtime.sendMessage({
            type: MSG.EXECUTE_DELETE_DONE,
            runId,
            total: clean.length,
            okCount: 0,
            failCount: clean.length,
            elapsedMs: nowMs() - startedAt,
            throttleMs,
          });

          sendResponse({
            ok: true,
            loggedIn: false,
            meHint: session.meHint,
            note: "Not logged in (or access token not available).",
            throttleMs,
            results: clean.map((id: string) => ({ id, ok: false, error: "Not logged in" })),
          } as any);
          return;
        }

        trace("EXECUTE_DELETE start", { count: clean.length, throttleMs });

        const r = await executeDeleteConversations({
          accessToken: session.accessToken,
          ids: clean,
          throttleMs,
        });

        trace("EXECUTE_DELETE done", {
          okCount: r.results.filter((x) => x.ok).length,
          failCount: r.results.filter((x) => !x.ok).length,
          elapsedMs: nowMs() - startedAt,
        });

        sendResponse({
          ok: true,
          loggedIn: true,
          meHint: session.meHint,
          note: "Execute done. These are soft-deletes (visibility off). Refresh ChatGPT to confirm.",
          throttleMs,
          results: r.results,
        } as any);
        return;
      } catch (e: any) {
        traceError("EXECUTE_DELETE failed", e);
        throw e;
      } finally {
        runLocks.executeRunning = false;
      }
    }

    // DELETE PROJECTS
    if (msg?.type === MSG.DELETE_PROJECTS) {
      const gizmoIds: string[] = ((msg as any).gizmoIds || []).filter(Boolean);

      if (!gizmoIds.length) {
        sendResponse({ ok: false, error: "No gizmoIds provided." } as any);
        return;
      }

      try {
        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          sendResponse({ ok: false, error: "Not logged in (no access token)." } as any);
          return;
        }

        trace("DELETE_PROJECTS start", { count: gizmoIds.length });

        // answer immediately; progress comes via runtime messages
        sendResponse({ ok: true } as any);

        await executeDeleteProjects({ accessToken: session.accessToken, gizmoIds });

        trace("DELETE_PROJECTS done", { count: gizmoIds.length });
        return;
      } catch (e: any) {
        traceError("DELETE_PROJECTS failed", e);

        // best-effort: if it crashes, try to still notify UI
        try {
          const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          chrome.runtime.sendMessage({
            type: MSG.DELETE_PROJECTS_DONE,
            runId,
            total: gizmoIds.length,
            okCount: 0,
            failCount: gizmoIds.length,
            elapsedMs: 0,
          });
        } catch {
          // ignore
        }

        try {
          sendResponse({ ok: false, error: e?.message || "Failed to delete projects." } as any);
        } catch {
          // ignore
        }
        return;
      }
    }

    // fallback (optional): route unknown messages to content script
    const tab = await getActiveChatGPTTab();
    if (tab?.id) {
      try {
        const res = await sendToTab(tab.id, msg as any);
        sendResponse(res as any);
        return;
      } catch (e: any) {
        traceWarn("fallback sendToTab failed", e);
        // fallthrough
      }
    }

    sendResponse({ ok: false, error: "Unknown message." } as any);
  })();

  return true;
});
