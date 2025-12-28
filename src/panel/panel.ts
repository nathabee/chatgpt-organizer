// src/panel/panel.ts

import { MSG, type AnyEvent } from "../shared/messages";
import type { ConversationItem } from "../shared/types";

/* -----------------------------------------------------------
 * ELEMENTS
 * ----------------------------------------------------------- */

const btnScan = document.getElementById("btnScan") as HTMLButtonElement;
const btnDeepScan = document.getElementById("btnDeepScan") as HTMLButtonElement;
const btnCancelScan = document.getElementById("btnCancelScan") as HTMLButtonElement;

const statusEl = document.getElementById("status") as HTMLSpanElement;
const scanOutEl = document.getElementById("scanOut") as HTMLDivElement;

const countEl = document.getElementById("count") as HTMLElement;
const selectedCountEl = document.getElementById("selectedCount") as HTMLElement;
const listEl = document.getElementById("list") as HTMLUListElement;

const cbToggleAll = document.getElementById("cbToggleAll") as HTMLInputElement;

const btnExecuteDelete = document.getElementById("btnExecuteDelete") as HTMLButtonElement;
const execOutEl = document.getElementById("execOut") as HTMLPreElement;

// Confirm UI
const confirmBoxEl = document.getElementById("confirmBox") as HTMLDivElement;
const confirmTitleEl = document.getElementById("confirmTitle") as HTMLDivElement;
const confirmPreviewEl = document.getElementById("confirmPreview") as HTMLUListElement;
const cbConfirm = document.getElementById("cbConfirm") as HTMLInputElement;
const btnConfirmExecute = document.getElementById("btnConfirmExecute") as HTMLButtonElement;
const btnCancelExecute = document.getElementById("btnCancelExecute") as HTMLButtonElement;

// NEW v0.0.7: execute progress UI
const execProgressWrapEl = document.getElementById("execProgressWrap") as HTMLDivElement;
const execProgressEl = document.getElementById("execProgress") as HTMLProgressElement;
const execProgressTextEl = document.getElementById("execProgressText") as HTMLDivElement;

/* -----------------------------------------------------------
 * STATE
 * ----------------------------------------------------------- */

let lastConvos: ConversationItem[] = [];
const selected = new Set<string>();

let isBusy = false;
let isDeepScanning = false;

// NEW v0.0.7: current execute run tracking
let execRunId: string | null = null;
let execTotal = 0;
let execOk = 0;
let execFail = 0;
let execTargetIds = new Set<string>(); // ids we intended to delete (for quick membership checks)

/* -----------------------------------------------------------
 * UI helpers
 * ----------------------------------------------------------- */

function setStatus(s: string) {
  statusEl.textContent = s;
}

function setScanOut(s: string) {
  scanOutEl.textContent = s;
}

function writeExecOut(text: string) {
  execOutEl.textContent = text;
}

function appendExecOut(line: string) {
  const prev = execOutEl.textContent || "";
  execOutEl.textContent = prev ? `${prev}\n${line}` : line;
  execOutEl.scrollTop = execOutEl.scrollHeight;
}

function setBusy(next: boolean) {
  isBusy = next;

  btnScan.disabled = next;
  btnDeepScan.disabled = next;
  btnExecuteDelete.disabled = next;

  cbToggleAll.disabled = next;

  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = next;

  cbConfirm.disabled = next;
  btnConfirmExecute.disabled = next;
  btnCancelExecute.disabled = next;

  btnCancelScan.disabled = !isDeepScanning || next;
}

function showConfirmBox(show: boolean) {
  confirmBoxEl.hidden = !show;
  if (!show) {
    cbConfirm.checked = false;
    confirmTitleEl.textContent = "";
    confirmPreviewEl.innerHTML = "";
  }
}

// NEW v0.0.7: progress UI controls
function showExecProgress(show: boolean) {
  execProgressWrapEl.hidden = !show;
  if (!show) {
    execProgressEl.value = 0;
    execProgressEl.max = 100;
    execProgressTextEl.textContent = "";
  }
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "?";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
}

function updateSelectedCount() {
  selectedCountEl.textContent = String(selected.size);
}

function updateToggleAllState() {
  if (!lastConvos.length) {
    cbToggleAll.checked = false;
    cbToggleAll.indeterminate = false;
    return;
  }

  const selectedInList = lastConvos.filter((c) => selected.has(c.id)).length;

  if (selectedInList === 0) {
    cbToggleAll.checked = false;
    cbToggleAll.indeterminate = false;
  } else if (selectedInList === lastConvos.length) {
    cbToggleAll.checked = true;
    cbToggleAll.indeterminate = false;
  } else {
    cbToggleAll.checked = false;
    cbToggleAll.indeterminate = true;
  }
}

/* -----------------------------------------------------------
 * Selection helpers
 * ----------------------------------------------------------- */

function syncListSelectionStyles() {
  const items = Array.from(listEl.querySelectorAll<HTMLLIElement>("li.item"));
  for (const li of items) {
    const id = li.dataset["id"];
    if (!id) continue;

    const checked = selected.has(id);
    li.classList.toggle("selected", checked);

    const cb = li.querySelector<HTMLInputElement>("input.deleteCb");
    if (cb) cb.checked = checked;
  }

  updateSelectedCount();
  updateToggleAllState();
}

function selectAllVisible() {
  for (const c of lastConvos) selected.add(c.id);
  syncListSelectionStyles();
}

function selectNoneVisible() {
  for (const c of lastConvos) selected.delete(c.id);
  syncListSelectionStyles();
}

function toggleAllVisible() {
  const selectedInList = lastConvos.filter((c) => selected.has(c.id)).length;
  if (selectedInList === lastConvos.length) selectNoneVisible();
  else selectAllVisible();
}

function getSelectedItems(): ConversationItem[] {
  return lastConvos.filter((c) => selected.has(c.id));
}

/* -----------------------------------------------------------
 * Confirm UI
 * ----------------------------------------------------------- */

function renderConfirmPreview(items: ConversationItem[]) {
  const n = items.length;
  const preview = items.slice(0, 5);

  confirmTitleEl.textContent = `You are about to delete: ${n} conversation${n === 1 ? "" : "s"}`;
  confirmPreviewEl.innerHTML = "";

  for (const c of preview) {
    const li = document.createElement("li");
    li.textContent = c.title || "Untitled";
    confirmPreviewEl.appendChild(li);
  }

  const more = n - preview.length;
  if (more > 0) {
    const li = document.createElement("li");
    li.textContent = `and ${more} more…`;
    confirmPreviewEl.appendChild(li);
  }

  cbConfirm.checked = false;
  btnConfirmExecute.textContent = `Yes, delete ${n}`;
}

function openExecuteConfirm() {
  const items = getSelectedItems();

  if (!items.length) {
    writeExecOut("Nothing selected. Tick conversations first.");
    showConfirmBox(false);
    return;
  }

  // Freeze selection while confirm is open (prevents count drifting)
  cbToggleAll.disabled = true;
  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = true;

  renderConfirmPreview(items);
  showConfirmBox(true);
}

/* -----------------------------------------------------------
 * Rendering
 * ----------------------------------------------------------- */

function render(convos: ConversationItem[]) {
  lastConvos = convos;

  countEl.textContent = String(convos.length);
  listEl.innerHTML = "";

  for (const c of convos) {
    const li = document.createElement("li");
    li.className = "item";
    li.dataset["id"] = c.id;

    const left = document.createElement("div");
    left.className = "left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "deleteCb";
    cb.checked = selected.has(c.id);
    cb.title = "Select for delete";
    cb.addEventListener("change", () => {
      if (isBusy) return;
      if (cb.checked) selected.add(c.id);
      else selected.delete(c.id);
      updateSelectedCount();
      updateToggleAllState();
      li.classList.toggle("selected", cb.checked);
    });

    left.appendChild(cb);

    const mid = document.createElement("div");
    mid.className = "mid";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = c.title || "Untitled";

    const link = document.createElement("a");
    link.className = "link";
    link.href = c.href;
    link.textContent = c.href;
    link.target = "_blank";
    link.rel = "noreferrer";

    mid.appendChild(title);
    mid.appendChild(link);

    li.appendChild(left);
    li.appendChild(mid);

    li.classList.toggle("selected", selected.has(c.id));
    listEl.appendChild(li);
  }

  updateSelectedCount();
  updateToggleAllState();

  setBusy(isBusy);
}

// NEW v0.0.7: remove a conversation item from UI/state immediately
function removeConversationFromUI(id: string) {
  // state: selected
  selected.delete(id);

  // state: lastConvos
  const idx = lastConvos.findIndex((c) => c.id === id);
  if (idx >= 0) lastConvos.splice(idx, 1);

  // DOM: remove li
  const li = listEl.querySelector<HTMLLIElement>(`li.item[data-id="${id}"]`);
  li?.remove();

  // counts
  countEl.textContent = String(lastConvos.length);
  updateSelectedCount();
  updateToggleAllState();
}

/* -----------------------------------------------------------
 * Scanning
 * ----------------------------------------------------------- */

async function scan() {
  setStatus("Scanning…");
  setScanOut("");
  showConfirmBox(false);

  setBusy(true);

  const res = await chrome.runtime.sendMessage({ type: MSG.LIST_CONVERSATIONS }).catch(() => null);

  setBusy(false);

  if (!res) {
    setStatus("Scan failed (no response).");
    render([]);
    return;
  }

  if (!res.ok) {
    setStatus(`Scan failed: ${res.error}`);
    render([]);
    return;
  }

  const convos: ConversationItem[] = res.conversations || [];
  setStatus("Done");

  const validIds = new Set(convos.map((c) => c.id));
  for (const id of Array.from(selected)) {
    if (!validIds.has(id)) selected.delete(id);
  }

  render(convos);
}

/* -----------------------------------------------------------
 * Deep scan
 * ----------------------------------------------------------- */

function onDeepScanProgress(found: number, step: number) {
  setScanOut(`Deep scan… collected ${found} · step ${step}`);
}

async function deepScan() {
  showConfirmBox(false);
  setScanOut("");

  isDeepScanning = true;
  btnCancelScan.hidden = false;

  setStatus("Deep scanning…");
  setBusy(true);

  const res = await chrome.runtime
    .sendMessage({
      type: MSG.DEEP_SCAN_START,
      options: { maxSteps: 140, stepDelayMs: 350, noNewLimit: 10 }
    })
    .catch(() => null);

  isDeepScanning = false;
  btnCancelScan.hidden = true;

  setBusy(false);

  if (!res) {
    setStatus("Deep scan failed (no response).");
    setScanOut("No response from content script.");
    render([]);
    return;
  }

  if (!res.ok) {
    setStatus("Deep scan failed.");
    setScanOut(String(res.error || "Unknown error"));
    return;
  }

  const convos: ConversationItem[] = res.conversations || [];
  setStatus("Done");
  setScanOut(`Deep scan done. Collected ${convos.length}.`);

  const validIds = new Set(convos.map((c) => c.id));
  for (const id of Array.from(selected)) {
    if (!validIds.has(id)) selected.delete(id);
  }

  render(convos);
}

async function cancelDeepScan() {
  if (!isDeepScanning) return;
  await chrome.runtime.sendMessage({ type: MSG.DEEP_SCAN_CANCEL }).catch(() => null);
  setScanOut("Cancel requested…");
}

/* -----------------------------------------------------------
 * NEW v0.0.7: Execute delete — event-driven progress
 * ----------------------------------------------------------- */

function startExecuteUI(total: number) {
  execTotal = total;
  execOk = 0;
  execFail = 0;

  showExecProgress(true);
  execProgressEl.max = total;
  execProgressEl.value = 0;
  execProgressTextEl.textContent = `Starting… 0/${total}`;

  setStatus("Deleting…");
}

function finishExecuteUI(summary: string) {
  setStatus("Done");
  execProgressTextEl.textContent = summary;
  // Keep progress visible so user can read the result.
  // They can scan again if they want.
}

async function executeDeleteStart() {
  const items = getSelectedItems();
  const ids = items.map((c) => c.id).filter(Boolean);

  if (!ids.length) {
    writeExecOut("Nothing selected.");
    return;
  }

  // Guidance without hard-block
  if (ids.length > 50) {
    appendExecOut(`Note: large batch (${ids.length}). Expect ~1–4 seconds per delete (server-paced).`);
  }

  // Prepare run tracking
  execRunId = null; // will be set from first progress event
  execTargetIds = new Set(ids);

  writeExecOut("");
  appendExecOut(`EXECUTE: deleting ${ids.length} conversation(s)…`);

  startExecuteUI(ids.length);
  setBusy(true);

  // Fire-and-forget. The background will emit progress + done events.
  // We still await the promise to catch immediate errors (e.g. background not reachable),
  // but we do NOT rely on the final response for UI completion.
  chrome.runtime.sendMessage({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 }).catch(() => null);
}

/* -----------------------------------------------------------
 * NEW v0.0.7: message listener for progress + done
 * ----------------------------------------------------------- */

chrome.runtime.onMessage.addListener((msg: AnyEvent) => {
  // Deep scan progress
  if ((msg as any)?.type === MSG.DEEP_SCAN_PROGRESS) {
    const m = msg as any;
    onDeepScanProgress(Number(m.found || 0), Number(m.step || 0));
    return;
  }

  // Execute progress
  if ((msg as any)?.type === MSG.EXECUTE_DELETE_PROGRESS) {
    const m = msg as any;

    // Adopt runId on first message
    if (!execRunId) execRunId = m.runId;

    // Ignore stale runs
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

    execProgressEl.max = total;
    execProgressEl.value = Math.min(i, total);

    if (ok) execOk++;
    else execFail++;

    // Find title for logging (best effort)
    const title = lastConvos.find((c) => c.id === id)?.title || id.slice(0, 8);

    const line =
      ok
        ? `✓ ${title} (${id.slice(0, 8)}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        : `✗ ${title} (${id.slice(0, 8)}) — ${status ?? "ERR"} — attempt ${attempt} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

    appendExecOut(line);

    execProgressTextEl.textContent = `Deleting ${i}/${total} · ok ${execOk} · failed ${execFail} · last ${formatMs(lastOpMs)}`;

    // NEW v0.0.7: remove successful deletes from list immediately
    if (ok && execTargetIds.has(id)) {
      removeConversationFromUI(id);
      execTargetIds.delete(id);
    }

    return;
  }

  // Execute done
  if ((msg as any)?.type === MSG.EXECUTE_DELETE_DONE) {
    const m = msg as any;

    if (!execRunId) execRunId = m.runId;
    if (execRunId !== m.runId) return;

    const total = Number(m.total || execTotal);
    const okCount = Number(m.okCount || execOk);
    const failCount = Number(m.failCount || execFail);
    const elapsedMs = Number(m.elapsedMs || 0);

    finishExecuteUI(`Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`);

    appendExecOut("");
    appendExecOut(`SUMMARY: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}.`);
    appendExecOut("Tip: refresh ChatGPT tab to see sidebar update.");

    // Re-enable UI
    setBusy(false);

    // Reset run tracking (keep execTargetIds with failures)
    // Remaining ids in execTargetIds are those not confirmed as ok by progress events.
    execRunId = null;
    return;
  }
});

/* -----------------------------------------------------------
 * Listeners
 * ----------------------------------------------------------- */

cbToggleAll.addEventListener("change", () => {
  if (isBusy) return;
  toggleAllVisible();
});

btnScan.addEventListener("click", () => {
  if (isBusy) return;
  scan().catch((e) => {
    console.error(e);
    setStatus("Error");
  });
});

btnDeepScan.addEventListener("click", () => {
  if (isBusy) return;
  deepScan().catch((e) => {
    console.error(e);
    setStatus("Error");
    setScanOut("Deep scan crashed. See console.");
  });
});

btnCancelScan.addEventListener("click", () => {
  cancelDeepScan().catch(() => null);
});

btnExecuteDelete.addEventListener("click", () => {
  if (isBusy) return;
  openExecuteConfirm();
});

btnCancelExecute.addEventListener("click", () => {
  showConfirmBox(false);

  // re-enable selection controls
  cbToggleAll.disabled = isBusy;
  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = isBusy;
});

btnConfirmExecute.addEventListener("click", () => {
  if (!cbConfirm.checked) {
    writeExecOut("Blocked: tick the confirmation checkbox.");
    return;
  }

  showConfirmBox(false);

  // re-enable selection controls (busy will disable again during execute)
  cbToggleAll.disabled = isBusy;
  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = isBusy;

  executeDeleteStart().catch((e) => {
    console.error(e);
    setStatus("Error");
    writeExecOut("Execute crashed. See console.");
    setBusy(false);
  });
});

// Auto-scan on open
scan().catch(() => setStatus("Idle"));
