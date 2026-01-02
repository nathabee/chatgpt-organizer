// src/panel/tabs/projects/tab.ts
import { MSG, type AnyEvent } from "../../../shared/messages";
import type { ProjectItem } from "../../../shared/types";
import * as actionLog from "../../../shared/actionLog";

import type { Dom } from "../../app/dom";
import type { createBus } from "../../app/bus"; // adjust if export differs
import { clampInt, formatMs } from "../../app/format";
import { getBusy, setBusy } from "../../app/state";
import { createProjectsModel } from "./model";
import { createProjectsView } from "./view";

type Bus = ReturnType<typeof createBus>;

export function createProjectsTab(dom: Dom, bus: Bus) {
  const model = createProjectsModel();
  const view = createProjectsView(dom);

  // chat delete progress state
  let execRunId: string | null = null;
  let execOk = 0;
  let execFail = 0;
  let execTotal = 0;

  // project delete progress state
  let projectRunId: string | null = null;
  let projOk = 0;
  let projFail = 0;
  let projTotal = 0;
  let failureLogged = 0;
  const MAX_FAILURE_LOGS_PER_RUN = 50;



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
      isBusy: getBusy(),
      onToggleProject: (p, checked) => model.toggleProjectSelection(p, checked),
      onToggleChat: (_p, chatId, checked) => model.toggleChatSelection(chatId, checked),
      afterProjectToggle: () => {
        refreshCounts();
        rerender(); // needed to reflect forced checkboxes
      },

      afterChatToggle: () => {
        refreshCounts(); // no rerender => <details> stays open
      },
    });

    refreshCounts();
  }

  async function listProjects() {
    view.showConfirm(false);
    view.writeExecOut("");

    view.setStatus("Loading… 0 project(s), 0 chat(s)");
    setBusy(dom, true);

    const limitProjects = clampInt(dom.projectsLimitEl.value, 1, 5000, 50);
    const uiMaxChatsPerProject = clampInt(dom.projectsChatsLimitEl.value, 1, 5000, 200);

    const res = await chrome.runtime
      .sendMessage({ type: MSG.LIST_GIZMO_PROJECTS, limit: limitProjects, conversationsPerGizmo: 5 })
      .catch(() => null);

    setBusy(dom, false);

    if (!res) {
      view.setStatus("Failed (no response).");
      return;
    }
    if (!res.ok) {
      view.setStatus(`Failed: ${res.error}`);
      return;
    }

    const raw = (res.projects || []) as ProjectItem[];
    model.setProjects(
      raw.map((p) => ({
        ...p,
        conversations: (p.conversations || []).slice(0, uiMaxChatsPerProject),
      }))
    );

    rerender();
    view.setStatus(`Done: ${model.projects.length} project(s)`);
  }

  function openConfirm() {
    const selectedChats = Array.from(model.selectedProjectChatIds);
    const selectedProjects = Array.from(model.selectedProjectIds);

    if (!selectedChats.length && !selectedProjects.length) {
      view.writeExecOut("Nothing selected.");
      return;
    }

    view.renderConfirmPreview({
      projects: model.projects,
      selectedProjectIds: selectedProjects,
      selectedChatIds: selectedChats,
    });

    view.showConfirm(true);
  }

  function startChatDeleteProgress(total: number) {
    execRunId = null;
    execOk = 0;
    execFail = 0;
    execTotal = total;
    failureLogged = 0;

    view.showChatsExecProgress(true);
    dom.projectsChatsExecProgressEl.max = total;
    dom.projectsChatsExecProgressEl.value = 0;
    dom.projectsChatsExecProgressTextEl.textContent = `Deleting chats… 0/${total}`;
    view.setStatus("Deleting chats…");
  }

  function startProjectDeleteProgress(total: number) {
    projectRunId = null;
    projOk = 0;
    projFail = 0;
    projTotal = total;
    failureLogged = 0;

    view.showProjectsExecProgress(true);
    dom.projectsProjectsExecProgressEl.max = total;
    dom.projectsProjectsExecProgressEl.value = 0;
    dom.projectsProjectsExecProgressTextEl.textContent = `Deleting projects… 0/${total}`;
  }

  async function executeDeleteConversationIds(ids: string[]) {
    if (!ids.length) return;
    startChatDeleteProgress(ids.length);
    setBusy(dom, true);
    chrome.runtime.sendMessage({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 }).catch(() => null);
  }

  async function executeDeleteProjects(gizmoIds: string[]) {
    if (!gizmoIds.length) return;
    startProjectDeleteProgress(gizmoIds.length);
    chrome.runtime.sendMessage({ type: MSG.DELETE_PROJECTS, gizmoIds }).catch(() => null);
  }

  async function runExecute() {
    const selectedChats = Array.from(model.selectedProjectChatIds);
    const selectedProjects = Array.from(model.selectedProjectIds);

    if (!selectedChats.length && !selectedProjects.length) {
      view.writeExecOut("Nothing selected.");
      return;
    }

    // Keep plan for later project deletion (after chat deletes)
    (window as any).__cgo_projectsDeletePlan = { selectedProjects };

    view.writeExecOut("");
    view.appendExecOut(`EXECUTE: deleting ${selectedChats.length} conversation(s)…`);
    if (selectedProjects.length) {
      view.appendExecOut(`Then attempting to delete ${selectedProjects.length} project(s) (only if empty).`);
    }

    await executeDeleteConversationIds(selectedChats);
  }

  // progress events via bus
  const off = bus.on((msg: AnyEvent) => {
    // show live counters while loading
    if ((msg as any)?.type === MSG.LIST_GIZMO_PROJECTS_PROGRESS) {
      const m = msg as any;
      const foundProjects = Number(m.foundProjects || 0);
      const foundConversations = Number(m.foundConversations || 0);
      view.setStatus(`Loading… ${foundProjects} project(s), ${foundConversations} chat(s)`);
      return;
    }

    if ((msg as any)?.type === MSG.LIST_GIZMO_PROJECTS_DONE) {
      const m = msg as any;
      const totalProjects = Number(m.totalProjects || 0);
      const totalConversations = Number(m.totalConversations || 0);
      const elapsedMs = Number(m.elapsedMs || 0);
      view.setStatus(`Done: ${totalProjects} project(s), ${totalConversations} chat(s) in ${formatMs(elapsedMs)}`);
      return;
    }

    // Chat delete progress (projects context)
    if ((msg as any)?.type === MSG.EXECUTE_DELETE_PROGRESS) {
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



      dom.projectsChatsExecProgressEl.max = total;
      dom.projectsChatsExecProgressEl.value = Math.min(i, total);
      dom.projectsChatsExecProgressTextEl.textContent =
        `Deleting chats ${i}/${total} · ok ${execOk} · failed ${execFail} · last ${formatMs(lastOpMs)}`;

      const title =
        model.projects.flatMap((p) => p.conversations || []).find((c) => c.id === id)?.title || id.slice(0, 8);

      const line =
        ok
          ? `✓ ${title} (${id.slice(0, 8)}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
          : `✗ ${title} (${id.slice(0, 8)}) — ${status ?? "ERR"} — attempt ${attempt} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

      view.appendExecOut(line);

      if (ok) {
        model.removeChatEverywhere(id);
        rerender();
      }

      if (!ok && failureLogged < MAX_FAILURE_LOGS_PER_RUN) {
        failureLogged++;

        actionLog.append({
          kind: "error",
          scope: "projects",
          message: `Delete chat failed: ${title} (${id.slice(0, 8)})`,
          ok: false,
          status,
          error: error || "failed",
          chatId: id,
          chatTitle: title,
          meta: { attempt, elapsedMs, lastOpMs },
        }).catch(() => { });
      }
      return;
    }

    // Chat delete done (projects context)
    if ((msg as any)?.type === MSG.EXECUTE_DELETE_DONE) {
      const m = msg as any;

      if (!execRunId) execRunId = m.runId;
      if (execRunId !== m.runId) return;

      const total = Number(m.total || execTotal);
      const okCount = Number(m.okCount || execOk);
      const failCount = Number(m.failCount || execFail);
      const elapsedMs = Number(m.elapsedMs || 0);

      actionLog.append({
        kind: "run",
        scope: "projects",
        message: `Projects chat-delete run finished: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}`,
        ok: failCount === 0,
        meta: { total, okCount, failCount, elapsedMs },
      }).catch(() => { });

      failureLogged = 0;


      view.setStatus("Chats delete done");
      dom.projectsChatsExecProgressTextEl.textContent =
        `Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`;

      setBusy(dom, false);

      // Attempt project deletions now (only if empty)
      const plan = (window as any).__cgo_projectsDeletePlan as { selectedProjects: string[] } | undefined;
      (window as any).__cgo_projectsDeletePlan = undefined;

      if (plan?.selectedProjects?.length) {
        const deletable: string[] = [];

        for (const pid of plan.selectedProjects) {
          const p = model.projects.find((x) => x.gizmoId === pid);
          if (!p) continue;

          const remaining = (p.conversations || []).length;
          if (remaining === 0) deletable.push(pid);
          else view.appendExecOut(`SKIP PROJECT: ${p.title} — ${remaining} chat(s) still present.`);
        }

        if (deletable.length) {
          view.appendExecOut("");
          view.appendExecOut(`Deleting ${deletable.length} project(s)…`);

          (window as any).__cgo_projectNameById = Object.fromEntries(
            deletable.map((pid) => {
              const p = model.projects.find((x) => x.gizmoId === pid);
              return [pid, p?.title || pid];
            })
          );

          executeDeleteProjects(deletable);
        }
      }

      execRunId = null;
      return;
    }

    // Project delete progress
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

      if (!ok) {
        const nameMap = (window as any).__cgo_projectNameById as Record<string, string> | undefined;
        const name = nameMap?.[gizmoId] || model.projects.find((p) => p.gizmoId === gizmoId)?.title || gizmoId;

        actionLog.append({
          kind: "error",
          scope: "projects",
          message: `Delete project failed: ${name}`,
          ok: false,
          status,
          error: error || "failed",
          projectId: gizmoId,
          projectTitle: name,
          meta: { elapsedMs, lastOpMs },
        }).catch(() => { });
      }

      dom.projectsProjectsExecProgressEl.max = total;
      dom.projectsProjectsExecProgressEl.value = Math.min(i, total);
      dom.projectsProjectsExecProgressTextEl.textContent =
        `Deleting projects ${i}/${total} · ok ${projOk} · failed ${projFail} · last ${formatMs(lastOpMs)}`;

      const nameMap = (window as any).__cgo_projectNameById as Record<string, string> | undefined;
      const name = nameMap?.[gizmoId] || model.projects.find((p) => p.gizmoId === gizmoId)?.title || gizmoId;

      if (ok) {
        view.appendExecOut(
          `✓ PROJECT DELETED: ${name} (${gizmoId}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        );
        model.removeProject(gizmoId);
        rerender();
      } else {
        view.appendExecOut(
          `✗ PROJECT FAILED: ${name} (${gizmoId}) — ${status ?? ""} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`
        );
      }

      if (!ok && failureLogged < MAX_FAILURE_LOGS_PER_RUN) {
        failureLogged++;

        const nameMap = (window as any).__cgo_projectNameById as Record<string, string> | undefined;
        const name = nameMap?.[gizmoId] || model.projects.find((p) => p.gizmoId === gizmoId)?.title || gizmoId;

        actionLog.append({
          kind: "error",
          scope: "projects",
          message: `Delete project failed: ${name}`,
          ok: false,
          status,
          error: error || "failed",
          projectId: gizmoId,
          projectTitle: name,
          meta: { elapsedMs, lastOpMs },
        }).catch(() => { });
      }


      return;
    }

    // Project delete done
    if ((msg as any)?.type === MSG.DELETE_PROJECTS_DONE) {
      const m = msg as any;

      if (!projectRunId) projectRunId = m.runId;
      if (projectRunId !== m.runId) return;

      const total = Number(m.total || projTotal);
      const okCount = Number(m.okCount || projOk);
      const failCount = Number(m.failCount || projFail);
      const elapsedMs = Number(m.elapsedMs || 0);

      dom.projectsProjectsExecProgressTextEl.textContent =
        `Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`;

      projectRunId = null;
      (window as any).__cgo_projectNameById = undefined;
      return;
    }


  });

  function bind() {
    dom.btnListProjects.addEventListener("click", () => {
      if (getBusy()) return;
      listProjects().catch((e) => view.setStatus(`Error: ${e?.message || e}`));
    });

    dom.btnProjectsDelete.addEventListener("click", () => {
      if (getBusy()) return;
      openConfirm();
    });

    dom.projectsBtnCancelExecute.addEventListener("click", () => view.showConfirm(false));

    dom.projectsBtnConfirmExecute.addEventListener("click", () => {
      if (!dom.projectsCbConfirmEl.checked) {
        view.writeExecOut("Blocked: tick the confirmation checkbox.");
        return;
      }
      view.showConfirm(false);
      runExecute().catch((e) => {
        view.writeExecOut(`Execute crashed: ${e?.message || e}`);
        setBusy(dom, false);
      });
    });
  }

  return {
    id: "projects" as const,
    mount() {
      // nothing special
    },
    unmount() {
      // keep state/UI
    },
    bind,
    dispose() {
      off();
    },
  };
}
