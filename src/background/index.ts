// src/background/index.ts
import { MSG, type AnyRequest } from "../shared/messages";

import { fetchSession } from "./session/session";
import { listAllChatsBackend } from "./controllers/listAllChats";
import { listGizmoProjectsWithConversations } from "./controllers/listGizmoProjects";

import { executeDeleteConversations } from "./executors/deleteConversations";
import { executeDeleteProjects } from "./executors/deleteProjects";
import { executeMoveChatsToProject } from "./executors/moveChatsToProject";
import { executeCreateProject } from "./executors/createProject";

import { runLocks } from "./guards/runLocks";
import { getActiveTargetTab, sendToTab } from "./util/urls";
import { nowMs } from "./util/time";

import { logTrace, logWarn, logError } from "./util/log";

/* -----------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */

function makeRunId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeSend(sendResponse: (x: any) => void, payload: any) {
  try {
    sendResponse(payload);
  } catch {
    // If sendResponse is already closed (rare but possible), ignore.
  }
}

function scopeYmdToSinceMs(scopeYmd: any): number | undefined {
  const s = String(scopeYmd ?? "").trim();
  if (!s) return undefined;
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
    try {
      if (msg?.type === MSG.PING) {
        safeSend(sendResponse, { ok: true });
        return;
      }

      /* -----------------------------
         LIST ALL CHATS (backend)
      -------------------------------- */
      if (msg?.type === MSG.LIST_ALL_CHATS) {
        if (runLocks.listChatsRunning) {
          safeSend(sendResponse, { ok: false, error: "A chat listing is already running." });
          return;
        }
        runLocks.listChatsRunning = true;

        try {
          const session = await fetchSession();
          if (!session.loggedIn || !session.accessToken) {
            safeSend(sendResponse, { ok: false, error: "Not logged in (no access token)." });
            return;
          }

          const limit = Math.max(1, Math.min(50000, Number((msg as any).limit ?? 50)));
          const pageSize = Math.max(1, Math.min(100, Number((msg as any).pageSize ?? 50)));

          const scopeYmd = (msg as any).scopeYmd;
          const sinceUpdatedMs = scopeYmdToSinceMs(scopeYmd);

          logTrace("LIST_ALL_CHATS start", { scopeYmd, sinceUpdatedMs, limit, pageSize });

          const { conversations, total } = await listAllChatsBackend({
            accessToken: session.accessToken,
            limit,
            pageSize,
            sinceUpdatedMs,
          });

          logTrace("LIST_ALL_CHATS done", { totalReturned: conversations.length, total });
          safeSend(sendResponse, { ok: true, conversations, total });
          return;
        } catch (e: any) {
          // HTTP details already logged by apiClient (inside listAllChatsBackend)
          logError("LIST_ALL_CHATS failed (handler)", { error: e?.message || String(e) });
          safeSend(sendResponse, { ok: false, error: e?.message || "Failed to list chats." });
          return;
        } finally {
          runLocks.listChatsRunning = false;
        }
      }

      /* -----------------------------
         LIST PROJECTS (backend)
      -------------------------------- */
      if (msg?.type === MSG.LIST_GIZMO_PROJECTS) {
        if (runLocks.listProjectsRunning) {
          safeSend(sendResponse, { ok: false, error: "A projects listing is already running." });
          return;
        }
        runLocks.listProjectsRunning = true;

        try {
          const session = await fetchSession();
          if (!session.loggedIn || !session.accessToken) {
            safeSend(sendResponse, { ok: false, error: "Not logged in (no access token)." });
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

          logTrace("LIST_GIZMO_PROJECTS start", {
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

          logTrace("LIST_GIZMO_PROJECTS done", { projects: projects.length });
          safeSend(sendResponse, { ok: true, projects });
          return;
        } catch (e: any) {
          logError("LIST_GIZMO_PROJECTS failed (handler)", { error: e?.message || String(e) });
          safeSend(sendResponse, { ok: false, error: e?.message || "Failed to list projects." });
          return;
        } finally {
          runLocks.listProjectsRunning = false;
        }
      }

      /* -----------------------------
         EXECUTE DELETE (chats)
      -------------------------------- */
      if (msg?.type === MSG.EXECUTE_DELETE) {
        const ids: string[] = ((msg as any).ids || []).filter(Boolean);

        if (!ids.length) {
          safeSend(sendResponse, { ok: false, error: "No ids provided." });
          return;
        }
        if (runLocks.executeRunning) {
          safeSend(sendResponse, { ok: false, error: "An execute is already running." });
          return;
        }

        runLocks.executeRunning = true;
        const startedAt = nowMs();
        const throttleMs = Math.max(150, Math.min(5000, Number((msg as any).throttleMs ?? 600)));
        const runId = makeRunId();

        try {
          const session = await fetchSession();
          if (!session.loggedIn || !session.accessToken) {
            logWarn("EXECUTE_DELETE blocked: not logged in", { meHint: session.meHint });

            // Ensure UI unlocks
            chrome.runtime.sendMessage({
              type: MSG.EXECUTE_DELETE_DONE,
              runId,
              total: ids.length,
              okCount: 0,
              failCount: ids.length,
              elapsedMs: nowMs() - startedAt,
              throttleMs,
            });

            safeSend(sendResponse, {
              ok: true,
              loggedIn: false,
              meHint: session.meHint,
              note: "Not logged in (or access token not available).",
              throttleMs,
              results: ids.map((id: string) => ({ id, ok: false, error: "Not logged in" })),
            });
            return;
          }

          logTrace("EXECUTE_DELETE start", { runId, count: ids.length, throttleMs });

          const r = await executeDeleteConversations({
            accessToken: session.accessToken,
            ids,
            throttleMs,
          });

          logTrace("EXECUTE_DELETE done", {
            runId,
            okCount: r.results.filter((x) => x.ok).length,
            failCount: r.results.filter((x) => !x.ok).length,
            elapsedMs: nowMs() - startedAt,
          });

          safeSend(sendResponse, {
            ok: true,
            loggedIn: true,
            meHint: session.meHint,
            note: "Execute done. These are soft-deletes (visibility off). Refresh ChatGPT to confirm.",
            throttleMs,
            results: r.results,
          });
          return;
        } catch (e: any) {
          // apiClient logged HTTP failures; we log handler-level context once.
          logError("EXECUTE_DELETE failed (handler)", { runId, error: e?.message || String(e) });

          // Best-effort DONE so panel doesn't hang
          try {
            chrome.runtime.sendMessage({
              type: MSG.EXECUTE_DELETE_DONE,
              runId,
              total: ids.length,
              okCount: 0,
              failCount: ids.length,
              elapsedMs: nowMs() - startedAt,
              throttleMs,
            });
          } catch {}

          safeSend(sendResponse, { ok: false, error: e?.message || "Execute delete failed." });
          return;
        } finally {
          runLocks.executeRunning = false;
        }
      }

      /* -----------------------------
         DELETE PROJECTS
      -------------------------------- */
      if (msg?.type === MSG.DELETE_PROJECTS) {
        const gizmoIds: string[] = ((msg as any).gizmoIds || []).filter(Boolean);

        if (!gizmoIds.length) {
          safeSend(sendResponse, { ok: false, error: "No gizmoIds provided." });
          return;
        }

        if (runLocks.executeRunning) {
          safeSend(sendResponse, { ok: false, error: "An execute is already running." });
          return;
        }

        runLocks.executeRunning = true;
        const runId = makeRunId();
        const startedAt = nowMs();

        try {
          const session = await fetchSession();
          if (!session.loggedIn || !session.accessToken) {
            safeSend(sendResponse, { ok: false, error: "Not logged in (no access token)." });
            return;
          }

          logTrace("DELETE_PROJECTS start", { runId, count: gizmoIds.length });

          // Respond immediately; progress via runtime messages
          safeSend(sendResponse, { ok: true });

          await executeDeleteProjects({ accessToken: session.accessToken, gizmoIds });

          logTrace("DELETE_PROJECTS done", { runId, count: gizmoIds.length, elapsedMs: nowMs() - startedAt });
          return;
        } catch (e: any) {
          logError("DELETE_PROJECTS failed (handler)", { runId, error: e?.message || String(e) });

          // Best-effort DONE
          try {
            chrome.runtime.sendMessage({
              type: MSG.DELETE_PROJECTS_DONE,
              runId,
              total: gizmoIds.length,
              okCount: 0,
              failCount: gizmoIds.length,
              elapsedMs: nowMs() - startedAt,
            });
          } catch {}

          // If we already responded {ok:true}, this response may fail; safeSend swallows it.
          safeSend(sendResponse, { ok: false, error: e?.message || "Failed to delete projects." });
          return;
        } finally {
          runLocks.executeRunning = false;
        }
      }

      /* -----------------------------
         MOVE CHATS TO PROJECT
      -------------------------------- */
      if (msg?.type === MSG.MOVE_CHATS_TO_PROJECT) {
        const ids: string[] = ((msg as any).ids || []).filter(Boolean);
        const gizmoId = String((msg as any).gizmoId || "").trim();
        const throttleMs = Math.max(150, Math.min(5000, Number((msg as any).throttleMs ?? 400)));

        if (!ids.length) {
          safeSend(sendResponse, { ok: false, error: "No ids provided." });
          return;
        }
        if (!gizmoId) {
          safeSend(sendResponse, { ok: false, error: "No destination gizmoId provided." });
          return;
        }
        if (runLocks.executeRunning) {
          safeSend(sendResponse, { ok: false, error: "An execute is already running." });
          return;
        }

        runLocks.executeRunning = true;
        const runId = makeRunId();
        const startedAt = nowMs();

        try {
          const session = await fetchSession();
          if (!session.loggedIn || !session.accessToken) {
            logWarn("MOVE_CHATS_TO_PROJECT blocked: not logged in", { meHint: session.meHint });

            // Ensure UI unlocks
            chrome.runtime.sendMessage({
              type: MSG.MOVE_CHATS_TO_PROJECT_DONE,
              runId,
              total: ids.length,
              okCount: 0,
              failCount: ids.length,
              elapsedMs: nowMs() - startedAt,
              gizmoId,
            });

            safeSend(sendResponse, {
              ok: true,
              loggedIn: false,
              meHint: session.meHint,
              note: "Not logged in (or access token not available).",
              results: ids.map((id) => ({ id, ok: false, error: "Not logged in" })),
            });
            return;
          }

          logTrace("MOVE_CHATS_TO_PROJECT start", { runId, count: ids.length, gizmoId, throttleMs });

          // Respond immediately; progress via runtime messages
          safeSend(sendResponse, { ok: true });

          await executeMoveChatsToProject({
            accessToken: session.accessToken,
            ids,
            gizmoId,
            throttleMs,
          });

          logTrace("MOVE_CHATS_TO_PROJECT done", { runId, count: ids.length, gizmoId, elapsedMs: nowMs() - startedAt });
          return;
        } catch (e: any) {
          logError("MOVE_CHATS_TO_PROJECT failed (handler)", { runId, error: e?.message || String(e) });

          try {
            chrome.runtime.sendMessage({
              type: MSG.MOVE_CHATS_TO_PROJECT_DONE,
              runId,
              total: ids.length,
              okCount: 0,
              failCount: ids.length,
              elapsedMs: nowMs() - startedAt,
              gizmoId,
            });
          } catch {}

          safeSend(sendResponse, { ok: false, error: e?.message || "Move failed." });
          return;
        } finally {
          runLocks.executeRunning = false;
        }
      }

      /* -----------------------------
         CREATE PROJECT
      -------------------------------- */
      if (msg?.type === MSG.CREATE_PROJECT) {
        if (runLocks.executeRunning) {
          safeSend(sendResponse, { ok: false, error: "An execute is already running." });
          return;
        }
        runLocks.executeRunning = true;

        const runId = makeRunId();
        const startedAt = nowMs();

        try {
          const name = String((msg as any).name || "").trim();
          const description = typeof (msg as any).description === "string" ? (msg as any).description : "";
          const prompt_starters = Array.isArray((msg as any).prompt_starters) ? (msg as any).prompt_starters : [];

          if (!name) {
            safeSend(sendResponse, { ok: false, error: "Project name is required." });
            return;
          }

          const session = await fetchSession();
          if (!session.loggedIn || !session.accessToken) {
            safeSend(sendResponse, { ok: false, error: "Not logged in (no access token)." });
            return;
          }

          logTrace("CREATE_PROJECT start", { runId, nameLen: name.length });

          const r = await executeCreateProject({
            accessToken: session.accessToken,
            name,
            description,
            prompt_starters,
          });

          logTrace("CREATE_PROJECT done", { runId, ok: (r as any)?.ok, elapsedMs: nowMs() - startedAt });

          safeSend(sendResponse, r as any);
          return;
        } catch (e: any) {
          logError("CREATE_PROJECT failed (handler)", { runId, error: e?.message || String(e) });
          safeSend(sendResponse, { ok: false, error: e?.message || "Failed to create project." });
          return;
        } finally {
          runLocks.executeRunning = false;
        }
      }

      /* -----------------------------
         FALLBACK: forward to content script
      -------------------------------- */
      const tab = await getActiveTargetTab();
      if (tab?.id) {
        try {
          const res = await sendToTab(tab.id, msg as any);
          safeSend(sendResponse, res as any);
          return;
        } catch (e: any) {
          logWarn("fallback sendToTab failed", { error: e?.message || String(e) });
        }
      }

      safeSend(sendResponse, { ok: false, error: "Unknown message." });
    } catch (e: any) {
      // Catch absolutely everything so we never leave the listener in a broken state.
      logError("background handler crashed", { error: e?.message || String(e), msgType: (msg as any)?.type });
      safeSend(sendResponse, { ok: false, error: "Background handler crashed." });
    }
  })();

  return true;
});
