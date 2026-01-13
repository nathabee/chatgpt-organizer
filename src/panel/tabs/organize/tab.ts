// src/panel/tabs/organize/tab.ts
import type { Dom } from "../../app/dom";
import type { PanelCache } from "../../app/cache";
import type { createBus } from "../../app/bus";

import { getBusy, setBusy, withBusy } from "../../app/state";
import { MSG, type AnyEvent } from "../../../shared/messages";

import * as actionLog from "../../../shared/actionLog";
import * as debugTrace from "../../../shared/debugTrace";

import { formatMs } from "../../app/format";
import type { ProjectItem } from "../../../shared/types";

import { createOrganizeModel, type OrganizeSourceMode, type SourceChat } from "./model";
import { createOrganizeView } from "./view";
import { createProjectBox } from "../../components/createProjectBox";
import { runtimeSend } from "../../platform/runtime";
import { ensureDevConfigLoaded, getDevConfigSnapshot } from "../../../shared/devConfigStore";

type Bus = ReturnType<typeof createBus>;

export function createOrganizeTab(dom: Dom, bus: Bus, cache: PanelCache) {
  const model = createOrganizeModel();
  const view = createOrganizeView(dom);

  let offCache: (() => void) | null = null;

  // progress state
  let moveRunId: string | null = null;
  let moveOk = 0;
  let moveFail = 0;
  let moveTotal = 0;
  let moveFailureLogged = 0;
  let maxFailureLogsPerRun = 50;


  function startMoveProgress(total: number) {
    moveRunId = null;
    moveOk = 0;
    moveFail = 0;
    moveTotal = total;
    moveFailureLogged = 0;
    void (async () => {
      await ensureDevConfigLoaded();
      maxFailureLogsPerRun = getDevConfigSnapshot().failureLogsPerRun;
    })().catch(() => null);

    // UI gating specific to Organize tab (separate from global busy disable)
    view.setActionsEnabled(false);
    view.showExecProgress(true);

    dom.organizeExecProgressEl.max = total;
    dom.organizeExecProgressEl.value = 0;
    dom.organizeExecProgressTextEl.textContent = `Moving chats… 0/${total}`;
    view.writeExecOut("");
    view.appendExecOut(`EXECUTE MOVE (about to run)`);
  }

  function readCacheIntoModel() {
    const snap = cache.getSnapshot();
    model.setFromCache({
      singleChats: snap.singleChats || [],
      projects: snap.projects || [],
    });
  }

  function refreshUI() {
    // actions enabled depends on busy (global) + local view logic
    view.setActionsEnabled(!getBusy());

    readCacheIntoModel();

    const sourceChats = model.buildSourceChats();
    const projects = model.buildProjects();
    const target = model.getTargetProject();

    view.renderSourceList({
      chats: sourceChats,
      selectedIds: model.selectedChatIds,
      isBusy: () => getBusy(),
      onToggle: (id, checked) => {
        // selection stays local; refresh UI after changes
        model.toggleChat(id, checked);
        refreshUI();
      },
    });

    view.renderProjectList({
      projects,
      targetProjectId: model.targetProjectId,
      isBusy: () => getBusy(),
      onPick: (pid) => {
        model.setTargetProject(pid);
        refreshUI();
      },
    });

    view.setCounts({
      sourceCount: sourceChats.length,
      selectedCount: model.selectedChatIds.size,
      projectsCount: projects.length,
      targetLabel: target?.title || "—",
    });

    view.setSourceStatus(sourceChats.length ? "" : "No source chats loaded (refresh Single/Projects first).");
    view.setProjectsStatus(projects.length ? "" : "No projects loaded (refresh Projects first).");
  }

  function toggleAllVisible(checked: boolean) {
    const visible = model.buildSourceChats();
    for (const c of visible) model.toggleChat(c.id, checked);
  }

  function getSelectedChatsFull(sourceChats: SourceChat[]) {
    const ids = model.selectedChatIds;
    return sourceChats.filter((c) => ids.has(c.id));
  }

  function openConfirm() {
    view.writeExecOut("");
    view.appendExecOut("Preparing move…");
    view.showConfirm(false);

    const target = model.getTargetProject();
    if (!target) {
      view.writeExecOut("Select exactly one destination project.");
      return;
    }

    const sourceChats = model.buildSourceChats();
    const selected = getSelectedChatsFull(sourceChats);

    if (!selected.length) {
      view.writeExecOut("Select at least one chat to move.");
      return;
    }

    view.renderConfirmPreview({ selectedChats: selected, target });
    view.showConfirm(true);
  }

  function runExecuteMove(ids: string[], gizmoId: string) {
    if (!ids.length) return;

    startMoveProgress(ids.length);

    // Event-driven operation: busy spans progress/done messages
    setBusy(dom, true);

    void debugTrace.append({
      scope: "organize",
      kind: "debug",
      message: "move:start",
      meta: { idsCount: ids.length, gizmoId },
    });

    void actionLog.append({
      kind: "run",
      scope: "organize",
      message: `Move run started: ${ids.length} chat(s) -> ${gizmoId}`,
      ok: true,
      meta: { idsCount: ids.length, gizmoId },
    });

    void runtimeSend({
      type: MSG.MOVE_CHATS_TO_PROJECT,
      ids,
      gizmoId,
      throttleMs: 400,
    }).catch((err) => {
      const msg = String(err?.message || err);

      void debugTrace.append({
        scope: "organize",
        kind: "error",
        message: "move:start failed",
        error: msg,
        meta: { idsCount: ids.length, gizmoId },
      });

      void actionLog.append({
        kind: "error",
        scope: "organize",
        message: "Move run failed to start",
        ok: false,
        error: msg,
        meta: { idsCount: ids.length, gizmoId },
      });

      view.appendExecOut(`✗ Start move failed: ${msg}`);
      view.setActionsEnabled(true);
      view.showExecProgress(false);
      setBusy(dom, false);
    });
  }

  // bus listener
  const off = bus.on((msg: AnyEvent) => {
    if ((msg as any)?.type === MSG.MOVE_CHATS_TO_PROJECT_PROGRESS) {
      const m = msg as any;

      if (!moveRunId) moveRunId = m.runId;
      if (moveRunId !== m.runId) return;

      const i = Number(m.i || 0);
      const total = Number(m.total || moveTotal);
      const id = String(m.id || "");
      const ok = !!m.ok;
      const status = m.status as number | undefined;
      const error = m.error as string | undefined;
      const elapsedMs = Number(m.elapsedMs || 0);
      const lastOpMs = Number(m.lastOpMs || 0);

      if (ok) moveOk++;
      else moveFail++;

      dom.organizeExecProgressEl.max = total;
      dom.organizeExecProgressEl.value = Math.min(i, total);
      dom.organizeExecProgressTextEl.textContent =
        `Moving ${i}/${total} · ok ${moveOk} · failed ${moveFail} · last ${formatMs(lastOpMs)}`;

      const line = ok
        ? `✓ ${id.slice(0, 8)} — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        : `✗ ${id.slice(0, 8)} — ${status ?? "ERR"} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

      view.appendExecOut(line);

      if (!ok && moveFailureLogged < maxFailureLogsPerRun) {
        moveFailureLogged++;

        void actionLog.append({
          kind: "error",
          scope: "organize",
          message: `Move chat failed (${id.slice(0, 8)})`,
          ok: false,
          status,
          error: error || "failed",
          chatId: id,
          meta: { elapsedMs, lastOpMs },
        });
      }
      return;
    }

    if ((msg as any)?.type === MSG.MOVE_CHATS_TO_PROJECT_DONE) {
      const m = msg as any;

      if (!moveRunId) moveRunId = m.runId;
      if (moveRunId !== m.runId) return;

      const total = Number(m.total || moveTotal);
      const okCount = Number(m.okCount || moveOk);
      const failCount = Number(m.failCount || moveFail);
      const elapsedMs = Number(m.elapsedMs || 0);

      view.setActionsEnabled(true);

      view.appendExecOut("");
      view.appendExecOut(`DONE · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`);

      void actionLog.append({
        kind: "run",
        scope: "organize",
        message: `Move run finished: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}`,
        ok: failCount === 0,
        meta: { total, okCount, failCount, elapsedMs },
      });

      void debugTrace.append({
        scope: "organize",
        kind: "debug",
        message: "move:done",
        meta: { total, okCount, failCount, elapsedMs },
      });

      view.showExecProgress(false);
      setBusy(dom, false);

      // ---- cache mutation (post-run) ----
      const target = model.getTargetProject();
      const sourceChats = model.buildSourceChats();
      const selected = sourceChats.filter((c) => model.selectedChatIds.has(c.id));
      const ids = selected.map((c) => c.id);

      if (target && ids.length) {
        const metaById = new Map<string, { title?: string; href?: string }>();
        for (const c of selected) metaById.set(c.id, { title: c.title, href: c.href });

        cache.moveChatsToProject({
          ids,
          targetProjectId: target.gizmoId,
          metaById,
        });

        void debugTrace.append({
          scope: "organize",
          kind: "debug",
          message: "cache:moveChatsToProject applied",
          meta: { idsCount: ids.length, targetProjectId: target.gizmoId },
        });
      }

      // Clear selection + update UI (UI reads from cache)
      model.selectedChatIds.clear();
      refreshUI();

      view.appendExecOut("Cache updated (no fetch).");
      view.appendExecOut("Tip: If ChatGPT’s sidebar doesn’t update instantly, refresh the ChatGPT page.");

      // reset run state
      moveRunId = null;
      moveOk = 0;
      moveFail = 0;
      moveTotal = 0;
      moveFailureLogged = 0;

      return;
    }
  });

  function bind() {
    dom.organizeSourceEl.addEventListener("change", () => {
      model.setSourceMode(dom.organizeSourceEl.value as OrganizeSourceMode);
      refreshUI();
    });

    dom.organizeFilterEl.addEventListener("input", () => {
      model.setFilter(dom.organizeFilterEl.value);
      refreshUI();
    });

    dom.organizeProjectFilterEl.addEventListener("input", () => {
      model.setProjectFilter(dom.organizeProjectFilterEl.value);
      refreshUI();
    });

    dom.cbOrganizeToggleAll.addEventListener("change", () => {
      if (getBusy()) return;
      toggleAllVisible(dom.cbOrganizeToggleAll.checked);
      refreshUI();
    });

    dom.btnOrganizeClearTarget.addEventListener("click", () => {
      if (getBusy()) return;
      model.clearTargetProject();
      refreshUI();
    });

    dom.btnOrganizeMove.addEventListener("click", () => {
      if (getBusy()) return;
      openConfirm();
    });

    dom.organizeBtnCancelExecute.addEventListener("click", () => view.showConfirm(false));

    dom.organizeBtnConfirmExecute.addEventListener("click", () => {
      if (getBusy()) return;

      if (!dom.organizeCbConfirmEl.checked) {
        view.writeExecOut("Blocked: tick the confirmation checkbox.");
        return;
      }

      const target = model.getTargetProject();
      if (!target) {
        view.writeExecOut("Blocked: select a destination project.");
        return;
      }

      const sourceChats = model.buildSourceChats();
      const selected = sourceChats.filter((c) => model.selectedChatIds.has(c.id));
      if (!selected.length) {
        view.writeExecOut("Blocked: select at least one chat.");
        return;
      }

      view.showConfirm(false);
      runExecuteMove(
        selected.map((c) => c.id),
        target.gizmoId
      );
    });

    const createBox = createProjectBox({ context: "organize", compact: true });
    dom.mountCreateProjectOrganizeEl.replaceChildren(createBox.el);

    createBox.el.addEventListener("cgo:createProject", (e: Event) => {
      const ev = e as CustomEvent<{ name: string; description: string; context: "projects" | "organize" }>;

      void withBusy(dom, async () => {
        const { name, description } = ev.detail;

        createBox.setBusy(true);
        createBox.setStatus("Creating…");

        void debugTrace.append({
          scope: "organize",
          kind: "debug",
          message: "createProject:start",
          meta: { name, hasDescription: !!description },
        });

        try {
          void debugTrace.append({
            scope: "organize",
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
              scope: "organize",
              message: `Create project failed: ${name} (no response)`,
              ok: false,
            });
            return;
          }

          if (!res.ok) {
            createBox.setStatus(`Create failed: ${res.error || "unknown error"}`);
            void actionLog.append({
              kind: "error",
              scope: "organize",
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
            limitProjects: snap.meta.projectsLimit ?? 50,
            chatsPerProject: snap.meta.projectsChatsLimit ?? 200,
          });

          model.setTargetProject(newProject.gizmoId);
          refreshUI();

          void actionLog.append({
            kind: "run",
            scope: "organize",
            message: `Created project: ${newProject.title} (${newProject.gizmoId})`,
            ok: true,
            meta: { gizmoId: newProject.gizmoId },
          });

          void debugTrace.append({
            scope: "organize",
            kind: "debug",
            message: "createProject:done",
            meta: { gizmoId: newProject.gizmoId },
          });
        } catch (err: any) {
          const msg = String(err?.message || err);
          createBox.setStatus(`Create failed: ${msg}`);

          void actionLog.append({
            kind: "error",
            scope: "organize",
            message: `Create project failed: ${name}`,
            ok: false,
            error: msg,
          });

          void debugTrace.append({
            scope: "organize",
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
    id: "organize" as const,
    refresh() {
      refreshUI();
    },
    mount() {
      refreshUI();
      offCache = cache.subscribe(() => refreshUI());
    },
    unmount() { },
    bind,
    dispose() {
      off();
      offCache?.();
      offCache = null;
    },
  };
}
