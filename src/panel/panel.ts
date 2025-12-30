// src/panel/panel.ts

// src/panel/panel.ts
import { MSG, type AnyEvent } from "../shared/messages";
import type { ConversationItem, ProjectItem } from "../shared/types";

/* -----------------------------------------------------------
 * Tabs
 * ----------------------------------------------------------- */
type PanelTab = "single" | "projects";

const tabSingle = document.getElementById("tabSingle") as HTMLButtonElement;
const tabProjects = document.getElementById("tabProjects") as HTMLButtonElement;
const viewSingle = document.getElementById("viewSingle") as HTMLElement;
const viewProjects = document.getElementById("viewProjects") as HTMLElement;

function setTabUI(tab: PanelTab) {
  const isSingle = tab === "single";

  tabSingle.classList.toggle("is-active", isSingle);
  tabSingle.setAttribute("aria-selected", String(isSingle));

  tabProjects.classList.toggle("is-active", !isSingle);
  tabProjects.setAttribute("aria-selected", String(!isSingle));

  viewSingle.hidden = !isSingle;
  viewProjects.hidden = isSingle;
}

let activeTab: PanelTab = "single";

/* -----------------------------------------------------------
 * Shared helpers
 * ----------------------------------------------------------- */
function clampInt(v: any, min: number, max: number, fallback: number): number {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "?";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s}s`;
}

let isBusy = false;
function setBusy(next: boolean) {
  isBusy = next;

  // Single tab controls
  btnListSingle.disabled = next;
  singleLimitEl.disabled = next;
  cbSingleToggleAll.disabled = next;
  btnSingleDelete.disabled = next;

  // Projects tab controls
  btnListProjects.disabled = next;
  projectsLimitEl.disabled = next;
  projectsChatsLimitEl.disabled = next;
  btnProjectsDelete.disabled = next;

  // disable all checkboxes inside lists
  for (const cb of document.querySelectorAll<HTMLInputElement>("input[type='checkbox']")) {
    cb.disabled = next;
  }
}

/* -----------------------------------------------------------
 * SINGLE CHATS TAB
 * ----------------------------------------------------------- */
const singleLimitEl = document.getElementById("singleLimit") as HTMLInputElement;
const btnListSingle = document.getElementById("btnListSingle") as HTMLButtonElement;
const singleStatusEl = document.getElementById("singleStatus") as HTMLSpanElement;

const cbSingleToggleAll = document.getElementById("cbSingleToggleAll") as HTMLInputElement;
const btnSingleDelete = document.getElementById("btnSingleDelete") as HTMLButtonElement;

const singleExecOutEl = document.getElementById("singleExecOut") as HTMLPreElement;
const singleExecProgressWrapEl = document.getElementById("singleExecProgressWrap") as HTMLDivElement;
const singleExecProgressEl = document.getElementById("singleExecProgress") as HTMLProgressElement;
const singleExecProgressTextEl = document.getElementById("singleExecProgressText") as HTMLDivElement;

const singleConfirmBoxEl = document.getElementById("singleConfirmBox") as HTMLDivElement;
const singleConfirmTitleEl = document.getElementById("singleConfirmTitle") as HTMLDivElement;
const singleConfirmPreviewEl = document.getElementById("singleConfirmPreview") as HTMLUListElement;
const singleCbConfirmEl = document.getElementById("singleCbConfirm") as HTMLInputElement;
const singleBtnConfirmExecute = document.getElementById("singleBtnConfirmExecute") as HTMLButtonElement;
const singleBtnCancelExecute = document.getElementById("singleBtnCancelExecute") as HTMLButtonElement;

const singleCountEl = document.getElementById("singleCount") as HTMLElement;
const singleSelectedCountEl = document.getElementById("singleSelectedCount") as HTMLElement;
const singleListEl = document.getElementById("singleList") as HTMLUListElement;

let singleChats: ConversationItem[] = [];
const singleSelected = new Set<string>();

function setSingleStatus(s: string) {
  singleStatusEl.textContent = s;
}

function singleWriteExecOut(text: string) {
  singleExecOutEl.textContent = text;
}

function singleAppendExecOut(line: string) {
  const prev = singleExecOutEl.textContent || "";
  singleExecOutEl.textContent = prev ? `${prev}\n${line}` : line;
  singleExecOutEl.scrollTop = singleExecOutEl.scrollHeight;
}

function singleShowExecProgress(show: boolean) {
  singleExecProgressWrapEl.hidden = !show;
  if (!show) {
    singleExecProgressEl.value = 0;
    singleExecProgressEl.max = 100;
    singleExecProgressTextEl.textContent = "";
  }
}

function singleShowConfirm(show: boolean) {
  singleConfirmBoxEl.hidden = !show;
  if (!show) {
    singleCbConfirmEl.checked = false;
    singleConfirmTitleEl.textContent = "";
    singleConfirmPreviewEl.innerHTML = "";
  }
}

function singleUpdateCounts() {
  singleCountEl.textContent = String(singleChats.length);
  singleSelectedCountEl.textContent = String(singleSelected.size);
}

function singleUpdateToggleAllState() {
  if (!singleChats.length) {
    cbSingleToggleAll.checked = false;
    cbSingleToggleAll.indeterminate = false;
    return;
  }

  const selectedInList = singleChats.filter((c) => singleSelected.has(c.id)).length;

  if (selectedInList === 0) {
    cbSingleToggleAll.checked = false;
    cbSingleToggleAll.indeterminate = false;
  } else if (selectedInList === singleChats.length) {
    cbSingleToggleAll.checked = true;
    cbSingleToggleAll.indeterminate = false;
  } else {
    cbSingleToggleAll.checked = false;
    cbSingleToggleAll.indeterminate = true;
  }
}

function singleRenderList() {
  singleListEl.innerHTML = "";

  for (const c of singleChats) {
    const li = document.createElement("li");
    li.className = "item";
    li.dataset["id"] = c.id;

    const left = document.createElement("div");
    left.className = "left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "deleteCb";
    cb.checked = singleSelected.has(c.id);
    cb.addEventListener("change", () => {
      if (isBusy) return;
      if (cb.checked) singleSelected.add(c.id);
      else singleSelected.delete(c.id);
      li.classList.toggle("selected", cb.checked);
      singleUpdateCounts();
      singleUpdateToggleAllState();
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

    li.classList.toggle("selected", singleSelected.has(c.id));
    singleListEl.appendChild(li);
  }

  singleUpdateCounts();
  singleUpdateToggleAllState();
}

function singleRenderConfirmPreview(ids: string[]) {
  const items = singleChats.filter((c) => ids.includes(c.id));
  const n = items.length;
  const preview = items.slice(0, 5);

  singleConfirmTitleEl.textContent = `You are about to delete: ${n} chat${n === 1 ? "" : "s"}`;
  singleConfirmPreviewEl.innerHTML = "";

  for (const c of preview) {
    const li = document.createElement("li");
    li.textContent = c.title || "Untitled";
    singleConfirmPreviewEl.appendChild(li);
  }

  const more = n - preview.length;
  if (more > 0) {
    const li = document.createElement("li");
    li.textContent = `and ${more} more…`;
    singleConfirmPreviewEl.appendChild(li);
  }

  singleCbConfirmEl.checked = false;
  singleBtnConfirmExecute.textContent = `Yes, delete ${n}`;
}

async function listSingleChats() {
  singleShowConfirm(false);
  singleWriteExecOut("");

  setSingleStatus("Loading…");
  setBusy(true);

  const limit = clampInt(singleLimitEl.value, 1, 50000, 50);

  // IMPORTANT: v0.0.12 message type
  const res = await chrome.runtime
    .sendMessage({ type: MSG.LIST_ALL_CHATS, limit, pageSize: 50 })
    .catch(() => null);

  setBusy(false);

  if (!res) {
    setSingleStatus("Failed (no response).");
    return;
  }
  if (!res.ok) {
    setSingleStatus(`Failed: ${res.error}`);
    return;
  }

  const items = (res.conversations || []) as ConversationItem[];

  // In your UI, "single chats" = chats with no project.
  // If backend returns only global chats already, this filter is harmless.
  singleChats = items.filter((c) => !c.gizmoId);

  // prune selections not in list anymore
  const valid = new Set(singleChats.map((c) => c.id));
  for (const id of Array.from(singleSelected)) {
    if (!valid.has(id)) singleSelected.delete(id);
  }

  singleRenderList();
  setSingleStatus(`Done: ${singleChats.length}`);
}

function singleGetSelectedIds(): string[] {
  return singleChats.filter((c) => singleSelected.has(c.id)).map((c) => c.id);
}

/* -----------------------------------------------------------
 * PROJECTS TAB
 * ----------------------------------------------------------- */
const projectsLimitEl = document.getElementById("projectsLimit") as HTMLInputElement;
const projectsChatsLimitEl = document.getElementById("projectsChatsLimit") as HTMLInputElement;
const btnListProjects = document.getElementById("btnListProjects") as HTMLButtonElement;
const projectsStatusEl = document.getElementById("projectsStatus") as HTMLSpanElement;

const btnProjectsDelete = document.getElementById("btnProjectsDelete") as HTMLButtonElement;

const projectsExecOutEl = document.getElementById("projectsExecOut") as HTMLPreElement;
const projectsExecProgressWrapEl = document.getElementById("projectsExecProgressWrap") as HTMLDivElement;
const projectsExecProgressEl = document.getElementById("projectsExecProgress") as HTMLProgressElement;
const projectsExecProgressTextEl = document.getElementById("projectsExecProgressText") as HTMLDivElement;

const projectsConfirmBoxEl = document.getElementById("projectsConfirmBox") as HTMLDivElement;
const projectsConfirmTitleEl = document.getElementById("projectsConfirmTitle") as HTMLDivElement;
const projectsConfirmPreviewEl = document.getElementById("projectsConfirmPreview") as HTMLUListElement;
const projectsCbConfirmEl = document.getElementById("projectsCbConfirm") as HTMLInputElement;
const projectsBtnConfirmExecute = document.getElementById("projectsBtnConfirmExecute") as HTMLButtonElement;
const projectsBtnCancelExecute = document.getElementById("projectsBtnCancelExecute") as HTMLButtonElement;

const projectsCountEl = document.getElementById("projectsCount") as HTMLElement;
const projectsSelectedChatsCountEl = document.getElementById("projectsSelectedChatsCount") as HTMLElement;
const projectsSelectedProjectsCountEl = document.getElementById("projectsSelectedProjectsCount") as HTMLElement;

const projectsListEl = document.getElementById("projectsList") as HTMLUListElement;

let projects: ProjectItem[] = [];

// Selection model:
// - selecting a project implies "delete project" + all its chats (loaded)
// - selecting some chats without project implies "delete chats only"
const selectedProjectIds = new Set<string>();
const selectedProjectChatIds = new Set<string>(); // conversation ids across all projects

function setProjectsStatus(s: string) {
  projectsStatusEl.textContent = s;
}

function projectsWriteExecOut(text: string) {
  projectsExecOutEl.textContent = text;
}

function projectsAppendExecOut(line: string) {
  const prev = projectsExecOutEl.textContent || "";
  projectsExecOutEl.textContent = prev ? `${prev}\n${line}` : line;
  projectsExecOutEl.scrollTop = projectsExecOutEl.scrollHeight;
}

function projectsShowExecProgress(show: boolean) {
  projectsExecProgressWrapEl.hidden = !show;
  if (!show) {
    projectsExecProgressEl.value = 0;
    projectsExecProgressEl.max = 100;
    projectsExecProgressTextEl.textContent = "";
  }
}

function projectsShowConfirm(show: boolean) {
  projectsConfirmBoxEl.hidden = !show;
  if (!show) {
    projectsCbConfirmEl.checked = false;
    projectsConfirmTitleEl.textContent = "";
    projectsConfirmPreviewEl.innerHTML = "";
  }
}

function projectsUpdateCounts() {
  projectsCountEl.textContent = String(projects.length);
  projectsSelectedChatsCountEl.textContent = String(selectedProjectChatIds.size);
  projectsSelectedProjectsCountEl.textContent = String(selectedProjectIds.size);
}

function projectAllChatIds(p: ProjectItem): string[] {
  return (p.conversations || []).map((c) => c.id);
}

function toggleProjectSelection(p: ProjectItem, checked: boolean) {
  if (checked) {
    selectedProjectIds.add(p.gizmoId);
    for (const cid of projectAllChatIds(p)) selectedProjectChatIds.add(cid);
  } else {
    selectedProjectIds.delete(p.gizmoId);
    for (const cid of projectAllChatIds(p)) selectedProjectChatIds.delete(cid);
  }
  projectsUpdateCounts();
}

function toggleProjectChatSelection(cid: string, checked: boolean) {
  if (checked) selectedProjectChatIds.add(cid);
  else selectedProjectChatIds.delete(cid);
  projectsUpdateCounts();
}

function renderProjectsList() {
  projectsListEl.innerHTML = "";

  for (const p of projects) {
    const li = document.createElement("li");
    li.className = "projectCard";
    li.dataset["gizmoId"] = p.gizmoId;

    const head = document.createElement("div");
    head.className = "projectHead";

    const left = document.createElement("div");

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = `${p.title} (${p.conversations?.length || 0})`;

    const link = document.createElement("a");
    link.className = "link";
    link.href = p.href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = p.href;

    left.appendChild(title);
    left.appendChild(link);

    const pickLabel = document.createElement("label");
    pickLabel.className = "projectPick";

    const pickCb = document.createElement("input");
    pickCb.type = "checkbox";
    pickCb.checked = selectedProjectIds.has(p.gizmoId);
    pickCb.addEventListener("change", () => {
      if (isBusy) return;
      toggleProjectSelection(p, pickCb.checked);
      renderProjectsList();
    });

    const pickText = document.createElement("span");
    pickText.textContent = "Select project (delete project + its chats)";

    pickLabel.appendChild(pickCb);
    pickLabel.appendChild(pickText);

    head.appendChild(left);
    head.appendChild(pickLabel);

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Show conversations";
    details.appendChild(summary);

    const ul = document.createElement("ul");
    ul.className = "list";
    ul.style.marginTop = "8px";

    for (const c of p.conversations || []) {
      const cLi = document.createElement("li");
      cLi.className = "item";
      cLi.style.gridTemplateColumns = "28px 1fr";

      const cLeft = document.createElement("div");
      cLeft.className = "left";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "deleteCb";

      const forced = selectedProjectIds.has(p.gizmoId);
      cb.checked = forced || selectedProjectChatIds.has(c.id);

      cb.addEventListener("change", () => {
        if (isBusy) return;
        if (selectedProjectIds.has(p.gizmoId)) {
          cb.checked = true;
          return;
        }
        toggleProjectChatSelection(c.id, cb.checked);
      });

      cLeft.appendChild(cb);

      const mid = document.createElement("div");

      const cTitle = document.createElement("div");
      cTitle.className = "title";
      cTitle.textContent = c.title || "Untitled";

      const cLink = document.createElement("a");
      cLink.className = "link";
      cLink.href = c.href;
      cLink.target = "_blank";
      cLink.rel = "noreferrer";
      cLink.textContent = c.href;

      mid.appendChild(cTitle);
      mid.appendChild(cLink);

      cLi.appendChild(cLeft);
      cLi.appendChild(mid);

      ul.appendChild(cLi);
    }

    details.appendChild(ul);
    li.appendChild(head);
    li.appendChild(details);

    projectsListEl.appendChild(li);
  }

  projectsUpdateCounts();
}

async function listProjects() {
  projectsShowConfirm(false);
  projectsWriteExecOut("");

  setProjectsStatus("Loading…");
  setBusy(true);

  const limitProjects = clampInt(projectsLimitEl.value, 1, 5000, 50);

  // This is only used by the UI selection model.
  // Background may fetch more; we cap in panel to keep UI light.
  const uiMaxChatsPerProject = clampInt(projectsChatsLimitEl.value, 1, 5000, 200);

  // IMPORTANT: v0.0.12 message type
  const res = await chrome.runtime
    .sendMessage({ type: MSG.LIST_GIZMO_PROJECTS, limit: limitProjects, conversationsPerGizmo: 5 })
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

  const raw = (res.projects || []) as ProjectItem[];

  // UI cap
  projects = raw.map((p) => ({
    ...p,
    conversations: (p.conversations || []).slice(0, uiMaxChatsPerProject),
  }));

  // prune selections
  const projectIds = new Set(projects.map((p) => p.gizmoId));
  for (const pid of Array.from(selectedProjectIds)) {
    if (!projectIds.has(pid)) selectedProjectIds.delete(pid);
  }

  const chatIds = new Set(projects.flatMap((p) => (p.conversations || []).map((c) => c.id)));
  for (const cid of Array.from(selectedProjectChatIds)) {
    if (!chatIds.has(cid)) selectedProjectChatIds.delete(cid);
  }

  renderProjectsList();
  setProjectsStatus(`Done: ${projects.length} project(s)`);
}

/* -----------------------------------------------------------
 * EXECUTE (shared engine, but two UIs)
 * ----------------------------------------------------------- */
let execRunId: string | null = null;
let execOk = 0;
let execFail = 0;
let execTotal = 0;

function startProgressUI(where: "single" | "projects", total: number) {
  execRunId = null;
  execOk = 0;
  execFail = 0;
  execTotal = total;

  if (where === "single") {
    singleShowExecProgress(true);
    singleExecProgressEl.max = total;
    singleExecProgressEl.value = 0;
    singleExecProgressTextEl.textContent = `Starting… 0/${total}`;
    setSingleStatus("Deleting…");
  } else {
    projectsShowExecProgress(true);
    projectsExecProgressEl.max = total;
    projectsExecProgressEl.value = 0;
    projectsExecProgressTextEl.textContent = `Starting… 0/${total}`;
    setProjectsStatus("Deleting…");
  }
}

function updateProgressUI(where: "single" | "projects", i: number, total: number, okCount: number, failCount: number, lastOpMs: number) {
  if (where === "single") {
    singleExecProgressEl.max = total;
    singleExecProgressEl.value = Math.min(i, total);
    singleExecProgressTextEl.textContent = `Deleting ${i}/${total} · ok ${okCount} · failed ${failCount} · last ${formatMs(lastOpMs)}`;
  } else {
    projectsExecProgressEl.max = total;
    projectsExecProgressEl.value = Math.min(i, total);
    projectsExecProgressTextEl.textContent = `Deleting ${i}/${total} · ok ${okCount} · failed ${failCount} · last ${formatMs(lastOpMs)}`;
  }
}

function finishProgressUI(where: "single" | "projects", summary: string) {
  if (where === "single") {
    setSingleStatus("Done");
    singleExecProgressTextEl.textContent = summary;
  } else {
    setProjectsStatus("Done");
    projectsExecProgressTextEl.textContent = summary;
  }
}

async function executeDeleteConversationIds(where: "single" | "projects", ids: string[]) {
  if (!ids.length) return;
  startProgressUI(where, ids.length);
  setBusy(true);
  chrome.runtime.sendMessage({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 }).catch(() => null);
}

async function executeDeleteProjects(gizmoIds: string[]) {
  if (!gizmoIds.length) return { results: [] as Array<{ gizmoId: string; ok: boolean; status?: number; error?: string }> };

  const res = await chrome.runtime
    .sendMessage({ type: MSG.DELETE_PROJECTS, gizmoIds })
    .catch(() => null);

  if (!res || !res.ok) {
    return {
      results: gizmoIds.map((gizmoId) => ({
        gizmoId,
        ok: false,
        error: (res as any)?.error || "Project delete failed",
      })),
    };
  }

  return { results: res.results || [] };
}

/* -----------------------------------------------------------
 * Confirm flows
 * ----------------------------------------------------------- */
function openSingleConfirm() {
  const ids = singleGetSelectedIds();
  if (!ids.length) {
    singleWriteExecOut("Nothing selected.");
    return;
  }
  singleRenderConfirmPreview(ids);
  singleShowConfirm(true);
}

function openProjectsConfirm() {
  const selectedChats = Array.from(selectedProjectChatIds);
  const selectedProjects = Array.from(selectedProjectIds);

  if (!selectedChats.length && !selectedProjects.length) {
    projectsWriteExecOut("Nothing selected.");
    return;
  }

  projectsConfirmPreviewEl.innerHTML = "";

  const titleParts: string[] = [];
  if (selectedProjects.length) titleParts.push(`${selectedProjects.length} project(s)`);
  if (selectedChats.length) titleParts.push(`${selectedChats.length} chat(s)`);

  projectsConfirmTitleEl.textContent = `You are about to delete: ${titleParts.join(" + ")}`;

  const previewProjects = selectedProjects.slice(0, 5);
  for (const pid of previewProjects) {
    const p = projects.find((x) => x.gizmoId === pid);
    if (!p) continue;
    const li = document.createElement("li");
    li.textContent = `Project: ${p.title}`;
    projectsConfirmPreviewEl.appendChild(li);
  }
  if (selectedProjects.length > previewProjects.length) {
    const li = document.createElement("li");
    li.textContent = `…and ${selectedProjects.length - previewProjects.length} more projects`;
    projectsConfirmPreviewEl.appendChild(li);
  }

  const previewChats = selectedChats.slice(0, 5);
  for (const cid of previewChats) {
    const c = projects.flatMap((p) => p.conversations || []).find((x) => x.id === cid);
    const li = document.createElement("li");
    li.textContent = `Chat: ${c?.title || cid.slice(0, 8)}`;
    projectsConfirmPreviewEl.appendChild(li);
  }
  if (selectedChats.length > previewChats.length) {
    const li = document.createElement("li");
    li.textContent = `…and ${selectedChats.length - previewChats.length} more chats`;
    projectsConfirmPreviewEl.appendChild(li);
  }

  projectsCbConfirmEl.checked = false;
  projectsBtnConfirmExecute.textContent = "Yes, delete";
  projectsShowConfirm(true);
}

/* -----------------------------------------------------------
 * Execute flows
 * ----------------------------------------------------------- */
async function runProjectsExecute() {
  const selectedChats = Array.from(selectedProjectChatIds);
  const selectedProjects = Array.from(selectedProjectIds);

  if (!selectedChats.length && !selectedProjects.length) {
    projectsWriteExecOut("Nothing selected.");
    return;
  }

  // Keep plan for later project deletion (after chat deletes)
  (window as any).__cgo_projectsDeletePlan = { selectedProjects };

  projectsWriteExecOut("");
  projectsAppendExecOut(`EXECUTE: deleting ${selectedChats.length} conversation(s)…`);
  if (selectedProjects.length) {
    projectsAppendExecOut(`Then attempting to delete ${selectedProjects.length} project(s) (only if empty).`);
  }

  await executeDeleteConversationIds("projects", selectedChats);
}

async function runSingleExecute() {
  const ids = singleGetSelectedIds();
  if (!ids.length) {
    singleWriteExecOut("Nothing selected.");
    return;
  }

  singleWriteExecOut("");
  singleAppendExecOut(`EXECUTE: deleting ${ids.length} chat(s)…`);
  await executeDeleteConversationIds("single", ids);
}

/* -----------------------------------------------------------
 * Progress events listener
 * ----------------------------------------------------------- */
chrome.runtime.onMessage.addListener((msg: AnyEvent) => {
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

    const where: "single" | "projects" = activeTab === "single" ? "single" : "projects";
    updateProgressUI(where, i, total, execOk, execFail, lastOpMs);

    const title =
      singleChats.find((c) => c.id === id)?.title ||
      projects.flatMap((p) => p.conversations || []).find((c) => c.id === id)?.title ||
      id.slice(0, 8);

    const line =
      ok
        ? `✓ ${title} (${id.slice(0, 8)}) — ${status ?? "OK"} — ${formatMs(lastOpMs)} — elapsed ${formatMs(elapsedMs)}`
        : `✗ ${title} (${id.slice(0, 8)}) — ${status ?? "ERR"} — attempt ${attempt} — ${error || "failed"} — elapsed ${formatMs(elapsedMs)}`;

    if (where === "single") {
      singleAppendExecOut(line);
      if (ok) {
        singleSelected.delete(id);
        singleChats = singleChats.filter((c) => c.id !== id);
        singleRenderList();
      }
    } else {
      projectsAppendExecOut(line);
      if (ok) {
        selectedProjectChatIds.delete(id);
        for (const p of projects) {
          p.conversations = (p.conversations || []).filter((c) => c.id !== id);
        }
        renderProjectsList();
      }
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

    const where: "single" | "projects" = activeTab === "single" ? "single" : "projects";
    finishProgressUI(where, `Done · ok ${okCount}/${total} · failed ${failCount} · elapsed ${formatMs(elapsedMs)}`);
    setBusy(false);

    if (where === "projects") {
      const plan = (window as any).__cgo_projectsDeletePlan as { selectedProjects: string[] } | undefined;
      (window as any).__cgo_projectsDeletePlan = undefined;

      if (plan?.selectedProjects?.length) {
        // delete only projects that are now empty in our model
        const deletable: string[] = [];
        for (const pid of plan.selectedProjects) {
          const p = projects.find((x) => x.gizmoId === pid);
          if (!p) continue;
          const remaining = (p.conversations || []).length;
          if (remaining === 0) deletable.push(pid);
          else projectsAppendExecOut(`SKIP PROJECT: ${p.title} — ${remaining} chat(s) still present.`);
        }

        if (deletable.length) {
          projectsAppendExecOut("");
          projectsAppendExecOut(`Deleting ${deletable.length} project(s)…`);

          executeDeleteProjects(deletable).then(({ results }) => {
            for (const r of results) {
              const p = projects.find((x) => x.gizmoId === r.gizmoId);
              const name = p?.title || r.gizmoId;
              if (r.ok) {
                projectsAppendExecOut(`✓ PROJECT DELETED: ${name} (${r.gizmoId})`);
                selectedProjectIds.delete(r.gizmoId);
                projects = projects.filter((x) => x.gizmoId !== r.gizmoId);
              } else {
                projectsAppendExecOut(`✗ PROJECT FAILED: ${name} (${r.gizmoId}) — ${r.status ?? ""} — ${r.error || "failed"}`);
              }
            }
            renderProjectsList();
          });
        }
      }
    }

    execRunId = null;
    return;
  }
});

/* -----------------------------------------------------------
 * Listeners
 * ----------------------------------------------------------- */
tabSingle.addEventListener("click", () => {
  activeTab = "single";
  setTabUI("single");
});
tabProjects.addEventListener("click", () => {
  activeTab = "projects";
  setTabUI("projects");
});

btnListSingle.addEventListener("click", () => {
  if (isBusy) return;
  listSingleChats().catch((e) => setSingleStatus(`Error: ${e?.message || e}`));
});

cbSingleToggleAll.addEventListener("change", () => {
  if (isBusy) return;
  if (!singleChats.length) return;

  const selectedInList = singleChats.filter((c) => singleSelected.has(c.id)).length;
  const allSelected = selectedInList === singleChats.length;

  if (allSelected) {
    for (const c of singleChats) singleSelected.delete(c.id);
  } else {
    for (const c of singleChats) singleSelected.add(c.id);
  }

  singleRenderList();
});

btnSingleDelete.addEventListener("click", () => {
  if (isBusy) return;
  openSingleConfirm();
});

singleBtnCancelExecute.addEventListener("click", () => singleShowConfirm(false));

singleBtnConfirmExecute.addEventListener("click", () => {
  if (!singleCbConfirmEl.checked) {
    singleWriteExecOut("Blocked: tick the confirmation checkbox.");
    return;
  }
  singleShowConfirm(false);
  runSingleExecute().catch((e) => {
    singleWriteExecOut(`Execute crashed: ${e?.message || e}`);
    setBusy(false);
  });
});

btnListProjects.addEventListener("click", () => {
  if (isBusy) return;
  listProjects().catch((e) => setProjectsStatus(`Error: ${e?.message || e}`));
});

btnProjectsDelete.addEventListener("click", () => {
  if (isBusy) return;
  openProjectsConfirm();
});

projectsBtnCancelExecute.addEventListener("click", () => projectsShowConfirm(false));

projectsBtnConfirmExecute.addEventListener("click", () => {
  if (!projectsCbConfirmEl.checked) {
    projectsWriteExecOut("Blocked: tick the confirmation checkbox.");
    return;
  }
  projectsShowConfirm(false);
  runProjectsExecute().catch((e) => {
    projectsWriteExecOut(`Execute crashed: ${e?.message || e}`);
    setBusy(false);
  });
});

/* -----------------------------------------------------------
 * Boot
 * ----------------------------------------------------------- */
(() => {
  setTabUI("single");
})();
