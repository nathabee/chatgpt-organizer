// src/panel/tabs/single/tab.ts
import { MSG, type AnyEvent } from "../../../shared/messages";
import type { ConversationItem } from "../../../shared/types";
import * as actionLog from "../../../shared/actionLog";
import * as debugTrace from "../../../shared/debugTrace";

import type { Dom } from "../../app/dom";
import type { PanelCache } from "../../app/cache";
import type { createBus } from "../../app/bus";

import { clampInt, formatMs } from "../../app/format";
import { getBusy, setBusy, withBusy } from "../../app/state";
import { createSingleModel } from "./model";
import { createSingleView } from "./view";
import { incDeletedChats } from "../../app/statsStore";
import { runtimeSend } from "../../platform/runtime";

type Bus = ReturnType<typeof createBus>;

export function createSingleTab(dom: Dom, bus: Bus, cache: PanelCache) {
  const model = createSingleModel();
  const view = createSingleView(dom);

  // progress state (chat deletions)
  let execRunId: string | null = null;
  let execOk = 0;
  let execFail = 0;
  let execTotal = 0;
  let execActive = false; // only handle EXECUTE_DELETE events when Single initiated the run

  let failureLogged = 0;
  let maxFailureLogsPerRun = 50;

  // IMPORTANT:
  // Scope source of truth is panel.ts pushed into cache meta.
  // Do NOT read scope from the dialog input as the main source; it can contain unvalidated edits.
  function getScopeYmd(): string {
    const fromCache = typeof cache.getScopeUpdatedSince === "function" ? cache.getScopeUpdatedSince() : "";
    if (fromCache) return fromCache;
    return dom.scopeDateEl?.value || "";
  }

  function startProgressUI(total: number) {
    execRunId = null;
    execOk = 0;
    execFail = 0;
    execTotal = total;
    failureLogged = 0;

    view.showExecProgress(true);
    dom.singleExecProgressEl.max = Math.max(1, total);
    dom.singleExecProgressEl.value = 0;
    dom.singleExecProgressTextEl.textContent = `Starting… 0/${total}`;
    view.setStatus("Deleting chats…");
  }

  function updateProgressUI(i: number, total: number, okCount: number, failCount: number, lastOpMs: number) {
    dom.singleExecProgressEl.max = Math.max(1, total);
    dom.singleExecProgressEl.value = Math.min(i, total);
    dom.singleExecProgressTextEl.textContent =
      `Deleting ${i}/${total} · ok ${okCount} · failed ${failCount} · last ${formatMs(lastOpMs)}`;
  }

  function finishProgressUI(summary: string) {
    view.setStatus("");
    dom.singleExecProgressTextEl.textContent = summary;
  }

  async function listSingleChats() {
    await withBusy(dom, async () => {
      view.showConfirm(false);
      view.writeExecOut("");
      view.setStatus("Loading single chats…");

      const limit = clampInt(dom.singleLimitEl.value, 1, 50000, 50);
      const scopeYmd = getScopeYmd(); // "YYYY-MM-DD" or ""

      void debugTrace.append({
        scope: "single",
        kind: "debug",
        message: "listSingleChats:start",
        meta: { scopeYmd, limit, pageSize: 50 },
      });

      const res = await runtimeSend({ type: MSG.LIST_ALL_CHATS, limit, pageSize: 50, scopeYmd }).catch((err) => {
        void debugTrace.append({
          scope: "single",
          kind: "error",
          message: "listSingleChats:runtimeSend failed",
          error: String((err as any)?.message || err),
        });
        return null;
      });

      if (!res) {
        view.setStatus("Loading single chats failed (no response).");
        return;
      }
      if (!res.ok) {
        view.setStatus(`Loading single chats failed: ${res.error}`);
        void debugTrace.append({
          scope: "single",
          kind: "error",
          message: "listSingleChats:failed",
          error: String(res.error || "unknown error"),
        });
        return;
      }

      const items = (res.conversations || []) as ConversationItem[];
      model.setChats(items.filter((c) => !c.gizmoId));

      cache.setSingleChats(model.chats, { limit });

      view.renderList({
        chats: model.chats,
        selected: model.selected,
        isBusy: () => getBusy(),
        onToggleChat: (id, checked) => {
          model.toggle(id, checked);
          view.updateCounts(model.chats, model.selected);
          view.updateToggleAllState(model.chats, model.selected);
        },
      });

      view.setStatus("");

      void debugTrace.append({
        scope: "single",
        kind: "debug",
        message: "listSingleChats:done",
        meta: { chats: model.chats.length, limit, scopeYmd },
      });
    });
  }

  function openConfirm() {
    const ids = model.getSelectedIds();
    if (!ids.length) {
      view.writeExecOut("Nothing selected.");
      return;
    }
    view.renderConfirmPreview(model.chats, ids);
    view.showConfirm(true);
  }

  function executeDeleteSelected() {
    const ids = model.getSelectedIds();
    if (!ids.length) {
      view.writeExecOut("Nothing selected.");
      return;
    }

    view.writeExecOut("");
    view.appendExecOut(`EXECUTE: deleting ${ids.length} chat(s)…`);

    startProgressUI(ids.length);

    // Event-driven run: keep busy until DONE arrives.
    setBusy(dom, true);
    execActive = true;


    void debugTrace.append({
      scope: "single",
      kind: "debug",
      message: "deleteRun:start",
      meta: { count: ids.length },
    });

    // fire & forget: progress comes via runtime events
    void runtimeSend({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 }).catch((err) => {

      execActive = false;
      const msg = String((err as any)?.message || err);
      view.appendExecOut(`✗ Start delete failed: ${msg}`);

      void debugTrace.append({
        scope: "single",
        kind: "error",
        message: "deleteRun:start failed",
        error: msg,
      });

      void actionLog.append({
        kind: "error",
        scope: "single",
        message: "Delete run failed to start",
        ok: false,
        error: msg,
      });

      setBusy(dom, false);
    });
  }

  function onToggleAll() {
    if (getBusy()) return;
    if (!model.chats.length) return;

    const selectedInList = model.chats.filter((c) => model.selected.has(c.id)).length;
    const allSelected = selectedInList === model.chats.length;

    model.toggleAll(!allSelected);

    view.renderList({
      chats: model.chats,
      selected: model.selected,
      isBusy: () => getBusy(),
      onToggleChat: (id, checked) => {
        model.toggle(id, checked);
        view.updateCounts(model.chats, model.selected);
        view.updateToggleAllState(model.chats, model.selected);
      },
    });
  }

  // progress events
  const off = bus.on((msg: AnyEvent) => {
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

      updateProgressUI(i, total, execOk, execFail, lastOpMs);

      const title = model.chats.find((c) => c.id === id)?.title || id.slice(0, 8);

      const line = ok
        ? `✓ ${title} (${id.slice(0, 8)}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        : `✗ ${title} (${id.slice(0, 8)}) — ${status ?? "ERR"} — attempt ${attempt} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

      view.appendExecOut(line);

      if (!ok && failureLogged < maxFailureLogsPerRun) {
        failureLogged++;

        void actionLog.append({
          kind: "error",
          scope: "single",
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
        model.removeChat(id);
        cache.removeChat(id);
        void incDeletedChats(1);

        view.renderList({
          chats: model.chats,
          selected: model.selected,
          isBusy: () => getBusy(),
          onToggleChat: (cid, checked) => {
            model.toggle(cid, checked);
            view.updateCounts(model.chats, model.selected);
            view.updateToggleAllState(model.chats, model.selected);
          },
        });
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
        scope: "single",
        message: `Delete run finished: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}`,
        ok: failCount === 0,
        meta: { total, okCount, failCount, elapsedMs },
      });

      void debugTrace.append({
        scope: "single",
        kind: "debug",
        message: "deleteRun:done",
        meta: { total, okCount, failCount, elapsedMs },
      });

      failureLogged = 0;

      finishProgressUI(`Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`);
      setBusy(dom, false);

      execRunId = null;
      execOk = 0;
      execFail = 0;
      execTotal = 0;
      execActive = false;

      return;
    }
  });

  function bind() {
    dom.cbSingleToggleAll.addEventListener("change", () => onToggleAll());

    dom.btnSingleDelete.addEventListener("click", () => {
      if (getBusy()) return;
      openConfirm();
    });

    dom.singleBtnCancelExecute.addEventListener("click", () => view.showConfirm(false));

    dom.singleBtnConfirmExecute.addEventListener("click", () => {
      if (getBusy()) return;

      if (!dom.singleCbConfirmEl.checked) {
        view.writeExecOut("Blocked: tick the confirmation checkbox.");
        return;
      }

      view.showConfirm(false);
      executeDeleteSelected();
    });
  }

  return {
    id: "single" as const,
    refresh() {
      if (getBusy()) return;
      void listSingleChats().catch((e) => view.setStatus(`Error: ${String((e as any)?.message || e)}`));
    },
    mount() {
      /* no auto fetch */
    },
    unmount() {},
    bind,
    dispose() {
      off();
    },
  };
}
