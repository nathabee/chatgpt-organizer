import type { Dom } from "../../app/dom";
import type { PanelCache } from "../../app/cache";
import type { createBus } from "../../app/bus";
import { getBusy, setBusy } from "../../app/state";
import { MSG, type AnyEvent } from "../../../shared/messages";
import * as actionLog from "../../../shared/actionLog";
import { formatMs } from "../../app/format";

import { createOrganizeModel, type OrganizeSourceMode, type SourceChat } from "./model";
import { createOrganizeView } from "./view";
import { createProjectBox } from "../../components/createProjectBox";
import { requestRefreshAll } from "../../app/refreshAll"; // adjust relative path

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
  const MAX_FAILURE_LOGS_PER_RUN = 50;

  function startMoveProgress(total: number) {
    moveRunId = null;
    moveOk = 0;
    moveFail = 0;
    moveTotal = total;
    moveFailureLogged = 0;
    view.setActionsEnabled(false);


    view.showExecProgress(true);
    dom.organizeExecProgressEl.max = total;
    dom.organizeExecProgressEl.value = 0;
    dom.organizeExecProgressTextEl.textContent = `Moving chats… 0/${total}`;
    view.writeExecOut("");
    view.appendExecOut(`EXECUTE MOVE (about to run)`);
  }

  async function runExecuteMove(ids: string[], gizmoId: string) {
    if (!ids.length) return;

    startMoveProgress(ids.length);
    setBusy(dom, true);

    chrome.runtime
      .sendMessage({
        type: MSG.MOVE_CHATS_TO_PROJECT,
        ids,
        gizmoId,
        throttleMs: 400,
      })
      .catch(() => null);
  }

  // bus listener (similar to projects delete)
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

      if (!ok && moveFailureLogged < MAX_FAILURE_LOGS_PER_RUN) {
        moveFailureLogged++;
        actionLog
          .append({
            kind: "error",
            scope: "organize",
            message: `Move chat failed (${id.slice(0, 8)})`,
            ok: false,
            status,
            error: error || "failed",
            chatId: id,
            meta: { elapsedMs, lastOpMs },
          })
          .catch(() => { });
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
      view.appendExecOut(
        `DONE · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`
      );

      actionLog
        .append({
          kind: "run",
          scope: "organize",
          message: `Move run finished: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}`,
          ok: failCount === 0,
          meta: { total, okCount, failCount, elapsedMs },
        })
        .catch(() => { });

      view.showExecProgress(false);
      setBusy(dom, false);
      moveRunId = null;

      view.appendExecOut("Refresh: reloading Singles + Projects to reflect new membership…");
      window.dispatchEvent(new CustomEvent("cgo:refreshAll"));
      view.appendExecOut("Tip: If ChatGPT’s sidebar doesn’t update instantly, refresh the ChatGPT page.");


      return;
    }
  });

  function readCacheIntoModel() {
    const snap = cache.getSnapshot();
    model.setFromCache({
      singleChats: snap.singleChats || [],
      projects: snap.projects || [],
    });
  }

  function refreshUI() {
    view.setActionsEnabled(!getBusy());

    readCacheIntoModel();

    const sourceChats = model.buildSourceChats();
    const projects = model.buildProjects();
    const target = model.getTargetProject();

    view.renderSourceList({
      chats: sourceChats,
      selectedIds: model.selectedChatIds,
      isBusy: getBusy(),
      onToggle: (id, checked) => {
        model.toggleChat(id, checked);
        refreshUI();
      },
    });

    view.renderProjectList({
      projects,
      targetProjectId: model.targetProjectId,
      isBusy: getBusy(),
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

  async function runMoveExecuteStub() {
    // Stub until the real background executor exists.
    view.showConfirm(false);

    const target = model.getTargetProject();
    if (!target) {
      view.writeExecOut("Blocked: no destination project selected.");
      return;
    }

    const sourceChats = model.buildSourceChats();
    const selected = getSelectedChatsFull(sourceChats);
    if (!selected.length) {
      view.writeExecOut("Blocked: no chats selected.");
      return;
    }

    view.writeExecOut("");
    view.appendExecOut(`EXECUTE (stub): would move ${selected.length} chat(s) → "${target.title || "Untitled"}"`);
    view.appendExecOut("Next step: implement background move executor + MSG events, then wire it here.");

    view.showExecProgress(false);
    setBusy(dom, false);
  }

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
      runExecuteMove(selected.map((c) => c.id), target.gizmoId).catch((e) => {
        view.writeExecOut(`Execute crashed: ${e?.message || e}`);
        setBusy(dom, false);
      });
    });

    const createBox = createProjectBox({ context: "organize", compact: true });
    dom.mountCreateProjectOrganizeEl.replaceChildren(createBox.el);

    createBox.el.addEventListener("cgo:createProject", (e: Event) => {
      const ev = e as CustomEvent<{ name: string; description: string; context: "projects" | "organize" }>;
      void (async () => {
        if (getBusy()) return;

        const { name, description } = ev.detail;

        createBox.setBusy(true);
        createBox.setStatus("Creating…");

        try {
          const res = await chrome.runtime.sendMessage({
            type: MSG.CREATE_PROJECT,
            name,
            description,
            prompt_starters: [],
          });

          if (!res) {
            createBox.setStatus("Create failed (no response).");
            return;
          }
          if (!res.ok) {
            createBox.setStatus(`Create failed: ${res.error || "unknown error"}`);
            return;
          }

          createBox.setStatus("Created.");
          createBox.reset();

          // THIS is where you refresh (panel-side)
          requestRefreshAll();

          // optional: close the <details>
          // (createBox.el as HTMLDetailsElement).open = false;
        } catch (err: any) {
          createBox.setStatus(`Create failed: ${err?.message || err}`);
        } finally {
          createBox.setBusy(false);
        }
      })();
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
