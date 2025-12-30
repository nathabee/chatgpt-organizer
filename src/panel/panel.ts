// src/panel/panel.ts
import { MSG, type AnyEvent } from "../shared/messages";
import type { ConversationItem, ProjectItem } from "../shared/types";

import { getActiveTab, setActiveTab, type PanelTab } from "../shared/storage";

/* -----------------------------------------------------------
 * ELEMENTS
 * ----------------------------------------------------------- */

const tabDelete = document.getElementById("tabDelete") as HTMLButtonElement;
const tabProjects = document.getElementById("tabProjects") as HTMLButtonElement;
const viewDelete = document.getElementById("viewDelete") as HTMLElement;
const viewProjects = document.getElementById("viewProjects") as HTMLElement;

const deleteLimitEl = document.getElementById("deleteLimit") as HTMLInputElement;
const btnListAllChats = document.getElementById("btnListAllChats") as HTMLButtonElement;

const statusEl = document.getElementById("status") as HTMLSpanElement;
const scanOutEl = document.getElementById("scanOut") as HTMLDivElement;

const countEl = document.getElementById("count") as HTMLElement;
const selectedCountEl = document.getElementById("selectedCount") as HTMLElement;
const listEl = document.getElementById("list") as HTMLUListElement;
const cbToggleAll = document.getElementById("cbToggleAll") as HTMLInputElement;

const btnExecuteDelete = document.getElementById("btnExecuteDelete") as HTMLButtonElement;
const execOutEl = document.getElementById("execOut") as HTMLPreElement;

const confirmBoxEl = document.getElementById("confirmBox") as HTMLDivElement;
const confirmTitleEl = document.getElementById("confirmTitle") as HTMLDivElement;
const confirmPreviewEl = document.getElementById("confirmPreview") as HTMLUListElement;
const cbConfirm = document.getElementById("cbConfirm") as HTMLInputElement;
const btnConfirmExecute = document.getElementById("btnConfirmExecute") as HTMLButtonElement;
const btnCancelExecute = document.getElementById("btnCancelExecute") as HTMLButtonElement;

const execProgressWrapEl = document.getElementById("execProgressWrap") as HTMLDivElement;
const execProgressEl = document.getElementById("execProgress") as HTMLProgressElement;
const execProgressTextEl = document.getElementById("execProgressText") as HTMLDivElement;

// Projects
const projectsLimitEl = document.getElementById("projectsLimit") as HTMLInputElement;
const btnListProjects = document.getElementById("btnListProjects") as HTMLButtonElement;
const projectsStatusEl = document.getElementById("projectsStatus") as HTMLSpanElement;
const projectsCountEl = document.getElementById("projectsCount") as HTMLSpanElement;
const projectsListEl = document.getElementById("projectsList") as HTMLUListElement;

/* -----------------------------------------------------------
 * STATE
 * ----------------------------------------------------------- */

let isBusy = false;

let lastConvos: ConversationItem[] = [];
const selected = new Set<string>();

// Execute run tracking
let execRunId: string | null = null;
let execTotal = 0;
let execOk = 0;
let execFail = 0;
let execTargetIds = new Set<string>();

/* -----------------------------------------------------------
 * UI helpers
 * ----------------------------------------------------------- */

function setStatus(s: string) {
  statusEl.textContent = s;
}

function setScanOut(s: string) {
  scanOutEl.textContent = s;
}

function setProjectsStatus(s: string) {
  projectsStatusEl.textContent = s;
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

  // Delete
  deleteLimitEl.disabled = next;
  btnListAllChats.disabled = next;
  btnExecuteDelete.disabled = next;
  cbToggleAll.disabled = next;

  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = next;

  cbConfirm.disabled = next;
  btnConfirmExecute.disabled = next;
  btnCancelExecute.disabled = next;

  // Projects
  projectsLimitEl.disabled = next;
  btnListProjects.disabled = next;
}

function showConfirmBox(show: boolean) {
  confirmBoxEl.hidden = !show;
  if (!show) {
    cbConfirm.checked = false;
    confirmTitleEl.textContent = "";
    confirmPreviewEl.innerHTML = "";
  }
}

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

function readLimit(el: HTMLInputElement, fallback: number): number {
  const v = Number((el.value || "").trim());
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.floor(v);
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
 * Tabs
 * ----------------------------------------------------------- */

function setTabUI(tab: PanelTab) {
  const isDelete = tab === "delete";

  tabDelete.classList.toggle("is-active", isDelete);
  tabDelete.setAttribute("aria-selected", String(isDelete));

  tabProjects.classList.toggle("is-active", !isDelete);
  tabProjects.setAttribute("aria-selected", String(!isDelete));

  viewDelete.hidden = !isDelete;
  viewProjects.hidden = isDelete;
}

async function switchTab(tab: PanelTab) {
  setTabUI(tab);
  await setActiveTab(tab);
}

/* -----------------------------------------------------------
 * Rendering (delete view)
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

  // prune selected ids not in list
  const validIds = new Set(convos.map((c) => c.id));
  for (const id of Array.from(selected)) {
    if (!validIds.has(id)) selected.delete(id);
  }

  updateSelectedCount();
  updateToggleAllState();

  setBusy(isBusy);
}

function removeConversationFromUI(id: string) {
  selected.delete(id);

  const idx = lastConvos.findIndex((c) => c.id === id);
  if (idx >= 0) lastConvos.splice(idx, 1);

  const li = listEl.querySelector<HTMLLIElement>(`li.item[data-id="${id}"]`);
  li?.remove();

  countEl.textContent = String(lastConvos.length);
  updateSelectedCount();
  updateToggleAllState();
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

function getSelectedItems(): ConversationItem[] {
  return lastConvos.filter((c) => selected.has(c.id));
}

function openExecuteConfirm() {
  const items = getSelectedItems();

  if (!items.length) {
    writeExecOut("Nothing selected. Tick conversations first.");
    showConfirmBox(false);
    return;
  }

  cbToggleAll.disabled = true;
  const cbs = Array.from(listEl.querySelectorAll<HTMLInputElement>("input.deleteCb"));
  for (const cb of cbs) cb.disabled = true;

  renderConfirmPreview(items);
  showConfirmBox(true);
}

/* -----------------------------------------------------------
 * List all chats (backend)
 * ----------------------------------------------------------- */

async function listAllChats() {
  showConfirmBox(false);
  writeExecOut("");
  setScanOut("");

  const limit = readLimit(deleteLimitEl, 50);

  setBusy(true);
  setStatus("Loading…");

  const res = await chrome.runtime
    .sendMessage({ type: MSG.LIST_ALL_CHATS, limit, pageSize: 50 })
    .catch(() => null);

  setBusy(false);

  if (!res) {
    setStatus("Failed (no response).");
    setScanOut("No response from background.");
    render([]);
    return;
  }

  if (!res.ok) {
    setStatus("Failed.");
    setScanOut(String(res.error || "Unknown error"));
    render([]);
    return;
  }

  const convos: ConversationItem[] = res.conversations || [];
  setStatus("Done");
  setScanOut(`Collected ${convos.length}.`);
  render(convos);
}

/* -----------------------------------------------------------
 * Execute delete (event-driven progress)
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
}

async function executeDeleteStart() {
  const items = getSelectedItems();
  const ids = items.map((c) => c.id).filter(Boolean);

  if (!ids.length) {
    writeExecOut("Nothing selected.");
    return;
  }

  if (ids.length > 50) {
    appendExecOut(`Note: large batch (${ids.length}). Expect ~1–4 seconds per delete (server-paced).`);
  }

  execRunId = null;
  execTargetIds = new Set(ids);

  writeExecOut("");
  appendExecOut(`EXECUTE: deleting ${ids.length} conversation(s)…`);

  startExecuteUI(ids.length);
  setBusy(true);

  chrome.runtime.sendMessage({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 }).catch(() => null);
}

/* -----------------------------------------------------------
 * Projects rendering + listing
 * ----------------------------------------------------------- */

function renderProjects(projects: ProjectItem[]) {
  projectsCountEl.textContent = String(projects.length);
  projectsListEl.innerHTML = "";

  for (const p of projects) {
    const li = document.createElement("li");
    li.className = "projectCard";

    const header = document.createElement("div");
    header.style.display = "grid";
    header.style.gap = "6px";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `${p.title} (${p.conversations?.length || 0})`;

    const link = document.createElement("a");
    link.className = "link";
    link.href = p.href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = p.href;

    header.appendChild(title);
    header.appendChild(link);
    li.appendChild(header);

    const convos: ConversationItem[] = p.conversations || [];
    if (!convos.length) {
      const hint = document.createElement("div");
      hint.className = "status";
      hint.textContent = "No conversations found for this project.";
      li.appendChild(hint);
    } else {
      const details = document.createElement("details");
      details.style.marginTop = "6px";

      const summary = document.createElement("summary");
      summary.textContent = "Show conversations";

      const ul = document.createElement("ul");
      ul.className = "list";
      ul.style.marginTop = "8px";

      for (const c of convos) {
        const cLi = document.createElement("li");
        cLi.className = "item";
        cLi.style.gridTemplateColumns = "1fr";
        cLi.style.marginBottom = "6px";

        const cTitle = document.createElement("div");
        cTitle.className = "title";
        cTitle.textContent = c.title || "Untitled";

        const cLink = document.createElement("a");
        cLink.className = "link";
        cLink.href = c.href;
        cLink.target = "_blank";
        cLink.rel = "noreferrer";
        cLink.textContent = c.href;

        cLi.appendChild(cTitle);
        cLi.appendChild(cLink);
        ul.appendChild(cLi);
      }

      details.appendChild(summary);
      details.appendChild(ul);
      li.appendChild(details);
    }

    projectsListEl.appendChild(li);
  }
}

async function listProjects() {
  const limit = readLimit(projectsLimitEl, 50);

  setBusy(true);
  setProjectsStatus("Loading…");

  const res = await chrome.runtime
    .sendMessage({ type: MSG.LIST_GIZMO_PROJECTS, limit, conversationsPerGizmo: 5, ownedOnly: true })
    .catch(() => null);

  setBusy(false);

  if (!res) {
    setProjectsStatus("Failed (no response).");
    return;
  }
  if (!res.ok) {
    setProjectsStatus(`Failed: ${res.error}`);
    return;
  }

  const projects: ProjectItem[] = res.projects || [];
  renderProjects(projects);
  setProjectsStatus(`Done: ${projects.length} project(s)`);
}

/* -----------------------------------------------------------
 * Toggle all
 * ----------------------------------------------------------- */

function selectAllVisible() {
  for (const c of lastConvos) selected.add(c.id);
  updateSelectedCount();
  updateToggleAllState();
  syncListSelectionStyles();
}

function selectNoneVisible() {
  for (const c of lastConvos) selected.delete(c.id);
  updateSelectedCount();
  updateToggleAllState();
  syncListSelectionStyles();
}

function toggleAllVisible() {
  const selectedInList = lastConvos.filter((c) => selected.has(c.id)).length;
  if (selectedInList === lastConvos.length) selectNoneVisible();
  else selectAllVisible();
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
}

/* -----------------------------------------------------------
 * Message listener (events)
 * ----------------------------------------------------------- */

chrome.runtime.onMessage.addListener((msg: AnyEvent) => {
  // chats listing progress
  if ((msg as any)?.type === MSG.LIST_ALL_CHATS_PROGRESS) {
    const m = msg as any;
    setScanOut(`Loading… ${Number(m.found || 0)} collected (offset ${Number(m.offset || 0)})`);
    return;
  }
  if ((msg as any)?.type === MSG.LIST_ALL_CHATS_DONE) {
    const m = msg as any;
    setScanOut(`Done · ${Number(m.total || 0)} collected · elapsed ${formatMs(Number(m.elapsedMs || 0))}`);
    return;
  }

  // projects progress
  if ((msg as any)?.type === MSG.LIST_GIZMO_PROJECTS_PROGRESS) {
    const m = msg as any;
    setProjectsStatus(`Scanning… projects ${Number(m.foundProjects || 0)} · convos ${Number(m.foundConversations || 0)}`);
    return;
  }
  if ((msg as any)?.type === MSG.LIST_GIZMO_PROJECTS_DONE) {
    const m = msg as any;
    setProjectsStatus(
      `Done: ${Number(m.totalProjects || 0)} project(s) · ${Number(m.totalConversations || 0)} convos · elapsed ${formatMs(
        Number(m.elapsedMs || 0)
      )}`
    );
    return;
  }

  // execute delete progress
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

    execProgressEl.max = total;
    execProgressEl.value = Math.min(i, total);

    if (ok) execOk++;
    else execFail++;

    const title = lastConvos.find((c) => c.id === id)?.title || id.slice(0, 8);

    const line =
      ok
        ? `✓ ${title} (${id.slice(0, 8)}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        : `✗ ${title} (${id.slice(0, 8)}) — ${status ?? "ERR"} — attempt ${attempt} — ${error || "failed"} — elapsed ${formatMs(
            elapsedMs
          )}`;

    appendExecOut(line);

    execProgressTextEl.textContent = `Deleting ${i}/${total} · ok ${execOk} · failed ${execFail} · last ${formatMs(lastOpMs)}`;

    if (ok && execTargetIds.has(id)) {
      removeConversationFromUI(id);
      execTargetIds.delete(id);
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

    finishExecuteUI(`Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`);

    appendExecOut("");
    appendExecOut(`SUMMARY: ok ${okCount}/${total}, failed ${failCount}, elapsed ${formatMs(elapsedMs)}.`);
    appendExecOut("Tip: refresh ChatGPT tab to see sidebar update.");

    setBusy(false);

    execRunId = null;
    return;
  }
});

/* -----------------------------------------------------------
 * Listeners
 * ----------------------------------------------------------- */

tabDelete.addEventListener("click", () => switchTab("delete"));
tabProjects.addEventListener("click", () => switchTab("projects"));

btnListAllChats.addEventListener("click", () => {
  if (isBusy) return;
  setStatus("Idle");
  listAllChats().catch((e) => {
    console.error(e);
    setStatus("Error");
    setScanOut("List crashed. See console.");
    setBusy(false);
  });
});

btnListProjects.addEventListener("click", () => {
  if (isBusy) return;
  listProjects().catch((e) => {
    console.error(e);
    setProjectsStatus("Error");
    setBusy(false);
  });
});

cbToggleAll.addEventListener("change", () => {
  if (isBusy) return;
  toggleAllVisible();
});

btnExecuteDelete.addEventListener("click", () => {
  if (isBusy) return;
  openExecuteConfirm();
});

btnCancelExecute.addEventListener("click", () => {
  showConfirmBox(false);

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

/* -----------------------------------------------------------
 * Boot
 * ----------------------------------------------------------- */

(async () => {
  const tab = await getActiveTab();
  setTabUI(tab);

  // optional: auto-load chats on open
  setStatus("Idle");
})();
