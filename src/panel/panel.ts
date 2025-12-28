// src/panel/panel.ts

import { MSG } from "../shared/messages";
import type { ConversationItem } from "../shared/types";

/* -----------------------------------------------------------
 * ELEMENT REFERENCE
 * ----------------------------------------------------------- */

const btnScan = document.getElementById("btnScan") as HTMLButtonElement;
const btnDeepScan = document.getElementById("btnDeepScan") as HTMLButtonElement; // NEW v0.0.6
const btnCancelScan = document.getElementById("btnCancelScan") as HTMLButtonElement; // NEW v0.0.6

const statusEl = document.getElementById("status") as HTMLSpanElement;
const scanOutEl = document.getElementById("scanOut") as HTMLDivElement; // NEW v0.0.6

const countEl = document.getElementById("count") as HTMLElement;
const selectedCountEl = document.getElementById("selectedCount") as HTMLElement;
const listEl = document.getElementById("list") as HTMLUListElement;

const cbToggleAll = document.getElementById("cbToggleAll") as HTMLInputElement;

// NEW v0.0.6: execute-only UX
const btnExecuteDelete = document.getElementById("btnExecuteDelete") as HTMLButtonElement;
const execOutEl = document.getElementById("execOut") as HTMLPreElement;

const confirmBoxEl = document.getElementById("confirmBox") as HTMLDivElement; // NEW v0.0.6
const confirmTitleEl = document.getElementById("confirmTitle") as HTMLDivElement; // NEW v0.0.6
const confirmPreviewEl = document.getElementById("confirmPreview") as HTMLUListElement; // NEW v0.0.6
const cbConfirm = document.getElementById("cbConfirm") as HTMLInputElement; // NEW v0.0.6
const btnConfirmExecute = document.getElementById("btnConfirmExecute") as HTMLButtonElement; // NEW v0.0.6
const btnCancelExecute = document.getElementById("btnCancelExecute") as HTMLButtonElement; // NEW v0.0.6

/* -----------------------------------------------------------
 * STATE
 * ----------------------------------------------------------- */

let lastConvos: ConversationItem[] = [];
const selected = new Set<string>(); // conversation ids selected for deletion

// NEW v0.0.6: busy state (scan/delete)
let isBusy = false;

// NEW v0.0.6: deep scan running state (to show cancel)
let isDeepScanning = false;

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
}

// NEW v0.0.6: disable controls while busy
function setBusy(next: boolean) {
  isBusy = next;

  btnScan.disabled = next;
  btnDeepScan.disabled = next;
  btnExecuteDelete.disabled = next;

  cbToggleAll.disabled = next;

  // disable per-row checkboxes
  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = next;

  // confirmation controls also disabled when busy
  cbConfirm.disabled = next;
  btnConfirmExecute.disabled = next;
  btnCancelExecute.disabled = next;

  // Deep scan cancel is special: only enabled when scanning
  btnCancelScan.disabled = !isDeepScanning || next;
}

// NEW v0.0.6: show/hide confirm box
function showConfirmBox(show: boolean) {
  confirmBoxEl.hidden = !show;
  if (!show) {
    cbConfirm.checked = false;
    confirmTitleEl.textContent = "";
    confirmPreviewEl.innerHTML = "";
  }
}

/* -----------------------------------------------------------
 * Selection helpers
 * ----------------------------------------------------------- */

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
 * Confirmation UI (execute delete) — NEW v0.0.6
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

  // Label the confirm button with the count
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
  setBusy(true);
  setBusy(false); // allow UI generally, but we will block selection below

  // NEW v0.0.6: disable selection controls while confirm box is visible
  cbToggleAll.disabled = true;
  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = true;

  renderConfirmPreview(items);
  showConfirmBox(true);
}

/* -----------------------------------------------------------
 * Scanning
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

  // NEW v0.0.6: re-apply busy disables on re-render
  setBusy(isBusy);
}

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

  // prune selection to visible ids only (current list)
  const validIds = new Set(convos.map((c) => c.id));
  for (const id of Array.from(selected)) {
    if (!validIds.has(id)) selected.delete(id);
  }

  render(convos);
}

/* -----------------------------------------------------------
 * NEW v0.0.6: Deep scan (auto-scroll)
 * ----------------------------------------------------------- */

function onDeepScanProgress(found: number, step: number) {
  setScanOut(`Deep scan… collected ${found} · step ${step}`);
}

async function deepScan() {
  showConfirmBox(false);
  writeExecOut("");
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

  // prune selection to returned ids
  const validIds = new Set(convos.map((c) => c.id));
  for (const id of Array.from(selected)) {
    if (!validIds.has(id)) selected.delete(id);
  }

  render(convos);
}

async function cancelDeepScan() {
  if (!isDeepScanning) return;

  // best effort: request cancel, UI will settle when deepScan promise returns
  await chrome.runtime.sendMessage({ type: MSG.DEEP_SCAN_CANCEL }).catch(() => null);
  setScanOut("Cancel requested…");
}

/* -----------------------------------------------------------
 * NEW v0.0.6: Execute delete flow (no dry-run, inline confirm)
 * ----------------------------------------------------------- */

async function executeDeleteConfirmed() {
  const items = getSelectedItems();
  const ids = items.map((c) => c.id).filter(Boolean);

  if (!ids.length) {
    writeExecOut("Nothing selected.");
    showConfirmBox(false);
    return;
  }

  if (!cbConfirm.checked) {
    writeExecOut("Blocked: tick the confirmation checkbox.");
    return;
  }

  showConfirmBox(false);
  setBusy(true);
  setStatus("Deleting…");
  writeExecOut(`Deleting ${ids.length}…`);

  const res = await chrome.runtime
    .sendMessage({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 })
    .catch(() => null);

  setBusy(false);

  if (!res) {
    setStatus("Done");
    writeExecOut("Failed: no response from background.");
    return;
  }

  if (!res.ok) {
    setStatus("Done");
    writeExecOut(`Failed: ${res.error}`);
    return;
  }

  const okCount = (res.results || []).filter((r: any) => r.ok).length;
  const fail = (res.results || []).filter((r: any) => !r.ok);

  setStatus("Done");

  writeExecOut(
    [
      `Deleted (hidden): ${okCount}`,
      `Failed: ${fail.length}`,
      "",
      "Refresh ChatGPT tab to see sidebar update."
    ].join("\n")
  );

  if (fail.length) {
    appendExecOut("");
    appendExecOut("Failures:");
    for (const r of fail) {
      appendExecOut(`- ${r.id} (${r.error || "failed"}${r.status ? `, HTTP ${r.status}` : ""})`);
    }
  }

  // NEW v0.0.6: re-scan automatically (quick scan)
  await scan().catch(() => null);
}

/* -----------------------------------------------------------
 * NEW v0.0.6: runtime message listener for progress events
 * ----------------------------------------------------------- */

chrome.runtime.onMessage.addListener((msg: any) => {
  if (msg?.type === MSG.DEEP_SCAN_PROGRESS) {
    onDeepScanProgress(Number(msg.found || 0), Number(msg.step || 0));
  }
});

/* -----------------------------------------------------------
 * LISTENERS
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

// NEW v0.0.6
btnDeepScan.addEventListener("click", () => {
  if (isBusy) return;
  deepScan().catch((e) => {
    console.error(e);
    setStatus("Error");
    setScanOut("Deep scan crashed. See console.");
  });
});

// NEW v0.0.6
btnCancelScan.addEventListener("click", () => {
  cancelDeepScan().catch(() => null);
});

// NEW v0.0.6
btnExecuteDelete.addEventListener("click", () => {
  if (isBusy) return;
  openExecuteConfirm();
});

// NEW v0.0.6
btnCancelExecute.addEventListener("click", () => {
  showConfirmBox(false);

  // re-enable selection controls
  cbToggleAll.disabled = isBusy;
  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = isBusy;
});

// NEW v0.0.6
btnConfirmExecute.addEventListener("click", () => {
  executeDeleteConfirmed().catch((e) => {
    console.error(e);
    setStatus("Error");
    writeExecOut("Execute crashed. See console.");
  });
});

// Auto-scan once when panel opens
scan().catch(() => setStatus("Idle"));
