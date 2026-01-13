// src/panel/tabs/projects/tab.ts
import { MSG, type AnyEvent } from "../../../shared/messages";
import type { ProjectItem } from "../../../shared/types";
import * as actionLog from "../../../shared/actionLog";
import * as debugTrace from "../../../shared/debugTrace";

import type { PanelCache } from "../../app/cache";
import type { Dom } from "../../app/dom";
import type { createBus } from "../../app/bus";
import { clampInt, formatMs } from "../../app/format";
import { getBusy, setBusy, withBusy } from "../../app/state";
import { createProjectsModel } from "./model";
import { createProjectsView } from "./view";
import { incDeletedChats, incDeletedProjects } from "../../app/statsStore";
import { createProjectBox } from "../../components/createProjectBox";
import { runtimeSend } from "../../platform/runtime";
import { ensureDevConfigLoaded, getDevConfigSnapshot } from "../../../shared/devConfigStore";

type Bus = ReturnType<typeof createBus>;

export function createProjectsTab(dom: Dom, bus: Bus, cache: PanelCache) {
  const model = createProjectsModel();
  const view = createProjectsView(dom);

  // chat delete progress state
  let execRunId: string | null = null;
  let execOk = 0;
  let execFail = 0;
  let execTotal = 0;
  let execActive = false; // only handle EXECUTE_DELETE events when Projects initiated the run

  // project delete progress state
  let projectRunId: string | null = null;
  let projOk = 0;
  let projFail = 0;
  let projTotal = 0;

  let failureLogged = 0;
  let maxFailureLogsPerRun = 50;

  function getScopeYmd(): string {
    const fromCache = typeof cache.getScopeUpdatedSince === "function" ? cache.getScopeUpdatedSince() : "";
    if (fromCache) return fromCache;
    return dom.scopeDateEl?.value || "";
  }

  function refreshCounts() {
    view.updateCounts({
      projects: model.projects,
      totalChats: model.getTotalChats(),
      selectedChatsCount: model.selectedProjectChatIds.size,
      selectedProjectsCount: model.selectedProjectIds.size,
    });
  }

  function rerender() {
    view.renderList({
      projects: model.projects,
      selectedProjectIds: model.selectedProjectIds,
      selectedProjectChatIds: model.selectedProjectChatIds,
      isBusy: () => getBusy(),
      onToggleProject: (p, checked) => model.toggleProjectSelection(p, checked),
      onToggleChat: (_p, chatId, checked) => model.toggleChatSelection(chatId, checked),
      afterProjectToggle: () => {
        refreshCounts();
        rerender();
      },
      afterChatToggle: () => {
        refreshCounts();
      },
    });

    refreshCounts();
  }

  function openConfirm() {
    const selectedChats = Array.from(model.selectedProjectChatIds);
    const selectedProjects = Array.from(model.selectedProjectIds);

    if (!selectedChats.length && !selectedProjects.length) {
      view.writeExecOut("Nothing selected.");
      view.showConfirm(false);
      return;
    }

    view.renderConfirmPreview({
      projects: model.projects,
      selectedProjectIds: selectedProjects,
      selectedChatIds: selectedChats,
    });

    view.showConfirm(true);
  }

  function resetChatRunUi() {
    view.showChatsExecProgress(false);
  }

  function resetProjectRunUi() {
    view.showProjectsExecProgress(false);
  }

  async function listProjects() {
    await withBusy(dom, async () => {
      view.showConfirm(false);
      view.writeExecOut("");
      view.setStatus("Projects loading… 0 project(s), 0 chat(s)");

      const limitProjects = clampInt(dom.projectsLimitEl.value, 1, 5000, 50);
      const uiMaxChatsPerProject = clampInt(dom.projectsChatsLimitEl.value, 1, 5000, 200);

      const scopeYmd = getScopeYmd();

      const conversationsPerGizmo = 5;
      const perProjectLimit = clampInt(dom.projectsChatsLimitEl.value, 1, 50000, 5000);

      void debugTrace.append({
        scope: "projects",
        kind: "debug",
        message: "listProjects:start",
        meta: { limitProjects, uiMaxChatsPerProject, conversationsPerGizmo, perProjectLimit, scopeYmd },
      });

      const res = await runtimeSend({
        type: MSG.LIST_GIZMO_PROJECTS,
        limit: limitProjects,
        conversationsPerGizmo,
        perProjectLimit,
        scopeYmd,
      }).catch((err) => {
        void debugTrace.append({
          scope: "projects",
          kind: "error",
          message: "listProjects:runtimeSend failed",
          error: String((err as any)?.message || err),
        });
        return null;
      });

      if (!res) {
        view.setStatus("Projects loading failed (no response).");
        return;
      }
      if (!res.ok) {
        view.setStatus(`Projects loading failed: ${res.error}`);
        void debugTrace.append({
          scope: "projects",
          kind: "error",
          message: "listProjects:failed",
          error: String(res.error || "unknown error"),
        });
        return;
      }

      const raw = (res.projects || []) as ProjectItem[];
      model.setProjects(
        raw.map((p) => ({
          ...p,
          conversations: (p.conversations || []).slice(0, uiMaxChatsPerProject),
        }))
      );

      cache.setProjects(model.projects, { limitProjects, chatsPerProject: uiMaxChatsPerProject });

      rerender();
      view.setStatus("");

      void debugTrace.append({
        scope: "projects",
        kind: "debug",
        message: "listProjects:done",
        meta: { projects: model.projects.length, chats: model.getTotalChats(), limitProjects, uiMaxChatsPerProject },
      });
    });
  }

  function startDeleteRuns() {
    if (getBusy()) return;

    const selectedChats = Array.from(model.selectedProjectChatIds);
    const selectedProjects = Array.from(model.selectedProjectIds);

    if (!selectedChats.length && !selectedProjects.length) {
      view.writeExecOut("Nothing selected.");
      return;
    }

    if (!dom.projectsCbConfirmEl.checked) {
      view.writeExecOut("Blocked: tick the confirmation checkbox.");
      return;
    }

    view.showConfirm(false);
    view.writeExecOut("");

    resetChatRunUi();
    resetProjectRunUi();

    failureLogged = 0;

    // event-driven run: busy stays on until DONE(s)
    setBusy(dom, true);

    void debugTrace.append({
      scope: "projects",
      kind: "debug",
      message: "deleteRuns:start",
      meta: { selectedChats: selectedChats.length, selectedProjects: selectedProjects.length },
    });

    // ---- start chat delete run ----
    if (selectedChats.length) {
      execRunId = null;
      execOk = 0;
      execFail = 0;
      execTotal = selectedChats.length;
      execActive = true;


      view.showChatsExecProgress(true);
      dom.projectsChatsExecProgressEl.max = execTotal || 1;
      dom.projectsChatsExecProgressEl.value = 0;
      dom.projectsChatsExecProgressTextEl.textContent = `Starting chat delete… 0/${execTotal}`;

      void runtimeSend({
        type: MSG.EXECUTE_DELETE,
        ids: selectedChats,
      }).catch((err) => {
        const em = String((err as any)?.message || err);

        void debugTrace.append({
          scope: "projects",
          kind: "error",
          message: "deleteChats:start failed",
          error: em,
        });

        view.appendExecOut(`✗ Start chat delete failed: ${em}`);

        // if only chats were selected, unlock immediately
        if (!selectedProjects.length) {
          execTotal = 0;
          execRunId = null;
          execActive = false;

          setBusy(dom, false);
        }
      });
    }

    // ---- start project delete run ----
    if (selectedProjects.length) {
      projectRunId = null;
      projOk = 0;
      projFail = 0;
      projTotal = selectedProjects.length;

      view.showProjectsExecProgress(true);
      dom.projectsProjectsExecProgressEl.max = projTotal || 1;
      dom.projectsProjectsExecProgressEl.value = 0;
      dom.projectsProjectsExecProgressTextEl.textContent = `Starting project delete… 0/${projTotal}`;

      void runtimeSend({
        type: MSG.DELETE_PROJECTS,
        gizmoIds: selectedProjects,
      }).catch((err) => {
        const em = String((err as any)?.message || err);

        void debugTrace.append({
          scope: "projects",
          kind: "error",
          message: "deleteProjects:start failed",
          error: em,
        });

        view.appendExecOut(`✗ Start project delete failed: ${em}`);

        // if only projects were selected, unlock immediately
        if (!selectedChats.length) {
          projTotal = 0;
          projectRunId = null;
          setBusy(dom, false);
        }
      });
    }

    // clear selection immediately to avoid stale selection state after deletes
    model.clearSelections();
    refreshCounts();
    rerender();
  }

  const off = bus.on((msg: AnyEvent) => {
    // -------------------------
    // Chat delete progress/done
    // -------------------------
    if ((msg as any)?.type === MSG.EXECUTE_DELETE_PROGRESS) {
      if (!execActive) return;
      const m = msg as any;

      if (!execRunId) execRunId = m.runId;
      if (execRunId !== m.runId) return;

      const i = Number(m.i || 0);
      const total = Number(m.total || execTotal);
      const id = String(m.id || "");
      const ok = !!m.ok;
      const status = m.status as number | undefined;
      const error = m.error as string | undefined;
      const attempt = Number(m.attempt || 1);
      const elapsedMs = Number(m.elapsedMs || 0);
      const lastOpMs = Number(m.lastOpMs || 0);

      if (ok) execOk++;
      else execFail++;

      dom.projectsChatsExecProgressEl.max = total || execTotal || 1;
      dom.projectsChatsExecProgressEl.value = Math.min(i, total || execTotal || 1);
      dom.projectsChatsExecProgressTextEl.textContent =
        `Deleting chats ${i}/${total} · ok ${execOk} · failed ${execFail} · last ${formatMs(lastOpMs)}`;

      // find title for logging
      let title = id.slice(0, 8);
      for (const p of model.projects) {
        const hit = (p.conversations || []).find((c) => c.id === id);
        if (hit?.title) {
          title = hit.title;
          break;
        }
      }

      const line = ok
        ? `✓ ${title} (${id.slice(0, 8)}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        : `✗ ${title} (${id.slice(0, 8)}) — ${status ?? "ERR"} — attempt ${attempt} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

      view.appendExecOut(line);

      if (!ok && failureLogged < maxFailureLogsPerRun) {
        failureLogged++;
        void actionLog.append({
          kind: "error",
          scope: "projects",
          message: `Delete chat failed: ${title} (${id.slice(0, 8)})`,
          ok: false,
          status,
          error: error || "failed",
          chatId: id,
          chatTitle: title,
          meta: { attempt, elapsedMs, lastOpMs },
        });
      }

      if (ok) {
        cache.removeChat(id);
        model.setProjects(
          model.projects.map((p) => ({
            ...p,
            conversations: (p.conversations || []).filter((c) => c.id !== id),
          }))
        );

        void incDeletedChats(1);
        refreshCounts();
        rerender();
      }

      return;
    }

    if ((msg as any)?.type === MSG.EXECUTE_DELETE_DONE) {
      if (!execActive) return;
      const m = msg as any;

      if (!execRunId) execRunId = m.runId;
      if (execRunId !== m.runId) return;

      const total = Number(m.total || execTotal);
      const okCount = Number(m.okCount || execOk);
      const failCount = Number(m.failCount || execFail);
      const elapsedMs = Number(m.elapsedMs || 0);

      void actionLog.append({
        kind: "run",
        scope: "projects",
        message: `Chat delete run finished: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}`,
        ok: failCount === 0,
        meta: { total, okCount, failCount, elapsedMs },
      });

      dom.projectsChatsExecProgressTextEl.textContent =
        `Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`;

      execRunId = null;
      execOk = 0;
      execFail = 0;
      execTotal = 0;
      execActive = false;


      // unlock only if project run is not active
      if (!projectRunId && projTotal === 0) {
        setBusy(dom, false);
      }
      return;
    }

    // -------------------------
    // Project delete progress/done
    // -------------------------
    if ((msg as any)?.type === MSG.DELETE_PROJECTS_PROGRESS) {
      const m = msg as any;

      if (!projectRunId) projectRunId = m.runId;
      if (projectRunId !== m.runId) return;

      const i = Number(m.i || 0);
      const total = Number(m.total || projTotal);
      const gizmoId = String(m.gizmoId || "");
      const ok = !!m.ok;
      const status = m.status as number | undefined;
      const error = m.error as string | undefined;
      const elapsedMs = Number(m.elapsedMs || 0);
      const lastOpMs = Number(m.lastOpMs || 0);

      if (ok) projOk++;
      else projFail++;

      dom.projectsProjectsExecProgressEl.max = total || projTotal || 1;
      dom.projectsProjectsExecProgressEl.value = Math.min(i, total || projTotal || 1);
      dom.projectsProjectsExecProgressTextEl.textContent =
        `Deleting projects ${i}/${total} · ok ${projOk} · failed ${projFail} · last ${formatMs(lastOpMs)}`;

      const title = model.projects.find((p) => p.gizmoId === gizmoId)?.title || gizmoId;

      const line = ok
        ? `✓ ${title} (${gizmoId}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        : `✗ ${title} (${gizmoId}) — ${status ?? "ERR"} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

      view.appendExecOut(line);

      if (!ok && failureLogged < maxFailureLogsPerRun) {
        failureLogged++;
        void actionLog.append({
          kind: "error",
          scope: "projects",
          message: `Delete project failed: ${title} (${gizmoId})`,
          ok: false,
          status,
          error: error || "failed",
          meta: { elapsedMs, lastOpMs },
        });
      }

      if (ok) {
        cache.removeProject(gizmoId);
        model.setProjects(model.projects.filter((p) => p.gizmoId !== gizmoId));
        void incDeletedProjects(1);
        refreshCounts();
        rerender();
      }

      return;
    }

    if ((msg as any)?.type === MSG.DELETE_PROJECTS_DONE) {
      const m = msg as any;

      if (!projectRunId) projectRunId = m.runId;
      if (projectRunId !== m.runId) return;

      const total = Number(m.total || projTotal);
      const okCount = Number(m.okCount || projOk);
      const failCount = Number(m.failCount || projFail);
      const elapsedMs = Number(m.elapsedMs || 0);

      void actionLog.append({
        kind: "run",
        scope: "projects",
        message: `Project delete run finished: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}`,
        ok: failCount === 0,
        meta: { total, okCount, failCount, elapsedMs },
      });

      dom.projectsProjectsExecProgressTextEl.textContent =
        `Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`;

      failureLogged = 0;

      projectRunId = null;
      projOk = 0;
      projFail = 0;
      projTotal = 0;

      // unlock only if chat run is not active
      if (!execRunId && execTotal === 0) {
        setBusy(dom, false);
      }
      return;
    }
  });

  function bind() {
    dom.btnProjectsDelete.addEventListener("click", () => {
      if (getBusy()) return;
      view.writeExecOut("");
      openConfirm();
    });

    dom.projectsBtnCancelExecute.addEventListener("click", () => view.showConfirm(false));

    dom.projectsBtnConfirmExecute.addEventListener("click", () => {
      if (getBusy()) return;
      startDeleteRuns();
    });

    const createBox = createProjectBox({ context: "projects" });
    dom.mountCreateProjectProjectsEl.replaceChildren(createBox.el);

    createBox.el.addEventListener("cgo:createProject", (e: Event) => {
      const ev = e as CustomEvent<{ name: string; description: string; context: "projects" | "organize" }>;

      void debugTrace.append({
        scope: "projects",
        kind: "debug",
        message: "ui:createProject click",
        meta: {
          context: ev.detail?.context,
          name: ev.detail?.name,
          busy: getBusy(),
        },
      });


      void withBusy(dom, async () => { 

        const { name, description } = ev.detail;

        createBox.setBusy(true);
        createBox.setStatus("Creating…");

        void debugTrace.append({
          scope: "projects",
          kind: "debug",
          message: "createProject:start",
          meta: { name, hasDescription: !!description },
        });

        try {

          void debugTrace.append({
            scope: "projects",
            kind: "debug",
            message: "createProject:runtimeSend CREATE_PROJECT",
            meta: {
              name,
              hasDescription: !!description,
              busy: getBusy(),
            },
          });

          const res = await runtimeSend({
            type: MSG.CREATE_PROJECT,
            name,
            description,
            prompt_starters: [],
          });

          if (!res) {
            createBox.setStatus("Create failed (no response).");
            void actionLog.append({
              kind: "error",
              scope: "projects",
              message: `Create project failed: ${name} (no response)`,
              ok: false,
            });
            return;
          }

          if (!res.ok) {
            createBox.setStatus(`Create failed: ${res.error || "unknown error"}`);
            void actionLog.append({
              kind: "error",
              scope: "projects",
              message: `Create project failed: ${name}`,
              ok: false,
              error: res.error || "unknown error",
            });
            return;
          }

          createBox.setStatus("Created.");
          createBox.reset();

          const newProject: ProjectItem = {
            gizmoId: res.gizmoId,
            title: res.title || name,
            href: res.href || "#",
            conversations: [],
            extra: { localOnly: true, createdAt: Date.now() },
          };

          const snap = cache.getSnapshot();
          cache.insertProject(newProject, {
            limitProjects: snap.meta.projectsLimit ?? clampInt(dom.projectsLimitEl.value, 1, 5000, 50),
            chatsPerProject: snap.meta.projectsChatsLimit ?? clampInt(dom.projectsChatsLimitEl.value, 1, 5000, 200),
          });

          model.setProjects(cache.getSnapshot().projects);
          rerender();

          void actionLog.append({
            kind: "run",
            scope: "projects",
            message: `Created project: ${newProject.title} (${newProject.gizmoId})`,
            ok: true,
            meta: { gizmoId: newProject.gizmoId },
          });
        } catch (err: any) {
          const msg = String(err?.message || err);
          createBox.setStatus(`Create failed: ${msg}`);

          void actionLog.append({
            kind: "error",
            scope: "projects",
            message: `Create project failed: ${ev.detail?.name || "unknown"}`,
            ok: false,
            error: msg,
          });

          void debugTrace.append({
            scope: "projects",
            kind: "error",
            message: "createProject:exception",
            error: msg,
          });
        } finally {
          createBox.setBusy(false);
        }
      });
    });
  }

  return {
    id: "projects" as const,
    refresh() {
      if (getBusy()) return;
      void listProjects().catch((e) => view.setStatus(`Error: ${String(e?.message || e)}`));
    },
    mount() {
      /* no auto fetch */
    },
    unmount() { },
    bind,
    dispose() {
      off();
    },
  };
}
