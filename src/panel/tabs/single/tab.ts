// src/panel/tabs/single/tab.ts
import { MSG, type AnyEvent } from "../../../shared/messages";
import type { ConversationItem } from "../../../shared/types";
import * as actionLog from "../../../shared/actionLog";

import type { Dom } from "../../app/dom";
import type { PanelCache } from "../../app/cache";

import type { createBus } from "../../app/bus"; // type-only shape; adjust if you exported differently
import { clampInt, formatMs } from "../../app/format";
import { getBusy, setBusy } from "../../app/state";
import { createSingleModel } from "./model";
import { createSingleView } from "./view";
import { incDeletedChats } from "../../app/statsStore";


type Bus = ReturnType<typeof createBus>;

export function createSingleTab(dom: Dom, bus: Bus, cache: PanelCache) {
  const model = createSingleModel();
  const view = createSingleView(dom);

  // progress state (chat deletions)
  let execRunId: string | null = null;
  let execOk = 0;
  let execFail = 0;
  let execTotal = 0;
  let failureLogged = 0;
  const MAX_FAILURE_LOGS_PER_RUN = 50;

  function startProgressUI(total: number) {
    execRunId = null;
    execOk = 0;
    execFail = 0;
    execTotal = total;
    failureLogged = 0; // ✅ add this

    view.showExecProgress(true);
    dom.singleExecProgressEl.max = total;
    dom.singleExecProgressEl.value = 0;
    dom.singleExecProgressTextEl.textContent = `Starting… 0/${total}`;
    view.setStatus("Deleting…");
  }


  function updateProgressUI(i: number, total: number, okCount: number, failCount: number, lastOpMs: number) {
    dom.singleExecProgressEl.max = total;
    dom.singleExecProgressEl.value = Math.min(i, total);
    dom.singleExecProgressTextEl.textContent =
      `Deleting ${i}/${total} · ok ${okCount} · failed ${failCount} · last ${formatMs(lastOpMs)}`;
  }

  function finishProgressUI(summary: string) {
    view.setStatus("Done");
    dom.singleExecProgressTextEl.textContent = summary;
  }

  async function listSingleChats() {
    view.showConfirm(false);
    view.writeExecOut("");

    view.setStatus("Loading…");
    setBusy(dom, true);

    const limit = clampInt(dom.singleLimitEl.value, 1, 50000, 50);

    const res = await chrome.runtime
      .sendMessage({ type: MSG.LIST_ALL_CHATS, limit, pageSize: 50 })
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

    const items = (res.conversations || []) as ConversationItem[];
    model.setChats(items.filter((c) => !c.gizmoId));


    // ✅ write into cache (single chats)
    cache.setSingleChats(model.chats, { limit });

    view.renderList({
      chats: model.chats,
      selected: model.selected,
      isBusy: getBusy(),
      onToggleChat: (id, checked) => {
        model.toggle(id, checked);
        view.updateCounts(model.chats, model.selected);
        view.updateToggleAllState(model.chats, model.selected);
      },
    });

    view.setStatus(`Done: ${model.chats.length}`);
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

  async function executeDeleteSelected() {
    const ids = model.getSelectedIds();
    if (!ids.length) {
      view.writeExecOut("Nothing selected.");
      return;
    }

    view.writeExecOut("");
    view.appendExecOut(`EXECUTE: deleting ${ids.length} chat(s)…`);

    startProgressUI(ids.length);
    setBusy(dom, true);

    // fire & forget: progress comes via runtime events
    chrome.runtime.sendMessage({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 }).catch(() => null);
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
      isBusy: getBusy(),
      onToggleChat: (id, checked) => {
        model.toggle(id, checked);
        view.updateCounts(model.chats, model.selected);
        view.updateToggleAllState(model.chats, model.selected);
      },
    });
  }

  // progress events
  const off = bus.on((msg: AnyEvent) => {
    // ignore anything not related to single tab deletion
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

      updateProgressUI(i, total, execOk, execFail, lastOpMs);

      const title = model.chats.find((c) => c.id === id)?.title || id.slice(0, 8);

      const line =
        ok
          ? `✓ ${title} (${id.slice(0, 8)}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
          : `✗ ${title} (${id.slice(0, 8)}) — ${status ?? "ERR"} — attempt ${attempt} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

      view.appendExecOut(line);

      if (!ok && failureLogged < MAX_FAILURE_LOGS_PER_RUN) {
        failureLogged++;

        actionLog.append({
          kind: "error",
          scope: "single",
          message: `Delete chat failed: ${title} (${id.slice(0, 8)})`,
          ok: false,
          status,
          error: error || "failed",
          chatId: id,
          chatTitle: title,
          meta: { attempt, elapsedMs, lastOpMs },
        }).catch(() => { });
      }


      if (ok) {
        model.removeChat(id);


        // ✅ keep cache in sync
        cache.removeChat(id);
        // ✅ persist stats
        incDeletedChats(1).catch(() => { });

        view.renderList({
          chats: model.chats,
          selected: model.selected,
          isBusy: getBusy(),
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
      const m = msg as any;

      if (!execRunId) execRunId = m.runId;
      if (execRunId !== m.runId) return;

      const total = Number(m.total || execTotal);
      const okCount = Number(m.okCount || execOk);
      const failCount = Number(m.failCount || execFail);
      const elapsedMs = Number(m.elapsedMs || 0);

      actionLog.append({
        kind: "run",
        scope: "single",
        message: `Delete run finished: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}`,
        ok: failCount === 0,
        meta: { total, okCount, failCount, elapsedMs },
      }).catch(() => { });

      failureLogged = 0;


      finishProgressUI(`Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`);
      setBusy(dom, false);

      execRunId = null;
      return;
    }
  });

  function bind() {
    // dom.btnListSingle.addEventListener("click", () => {
    //   if (getBusy()) return;
    //  listSingleChats().catch((e) => view.setStatus(`Error: ${e?.message || e}`));
    // });

    dom.cbSingleToggleAll.addEventListener("change", () => onToggleAll());

    dom.btnSingleDelete.addEventListener("click", () => {
      if (getBusy()) return;
      openConfirm();
    });

    dom.singleBtnCancelExecute.addEventListener("click", () => view.showConfirm(false));

    dom.singleBtnConfirmExecute.addEventListener("click", () => {
      if (!dom.singleCbConfirmEl.checked) {
        view.writeExecOut("Blocked: tick the confirmation checkbox.");
        return;
      }
      view.showConfirm(false);
      executeDeleteSelected().catch((e) => {
        view.writeExecOut(`Execute crashed: ${e?.message || e}`);
        setBusy(dom, false);
      });
    });
  }

  return {
    id: "single" as const,
    refresh() {
      if (getBusy()) return;
      listSingleChats().catch((e) => view.setStatus(`Error: ${e?.message || e}`));
    },
    mount() { /* no auto fetch */ },
    unmount() { },
    bind,
    dispose() { off(); },
  };

}
