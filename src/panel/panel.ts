// src/panel/panel.ts


import { MSG } from "../shared/messages";
import type { ConversationItem } from "../shared/types";

// ELEMENT REFERENCE
const btnScan = document.getElementById("btnScan") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;
const countEl = document.getElementById("count") as HTMLElement;
const selectedCountEl = document.getElementById("selectedCount") as HTMLElement;
const listEl = document.getElementById("list") as HTMLUListElement;

const btnSelectAll = document.getElementById("btnSelectAll") as HTMLButtonElement;
const btnSelectNone = document.getElementById("btnSelectNone") as HTMLButtonElement;
const cbToggleAll = document.getElementById("cbToggleAll") as HTMLInputElement;

const btnDryRun = document.getElementById("btnDryRun") as HTMLButtonElement;
const btnExecuteDelete = document.getElementById("btnExecuteDelete") as HTMLButtonElement; // NEW
const cbConfirmExecute = document.getElementById("cbConfirmExecute") as HTMLInputElement; // NEW

const btnClearReport = document.getElementById("btnClearReport") as HTMLButtonElement;
const reportEl = document.getElementById("report") as HTMLPreElement;

let lastConvos: ConversationItem[] = [];
const selected = new Set<string>(); // conversation ids selected for deletion

function setStatus(s: string) {
  statusEl.textContent = s;
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

function writeReport(text: string) {
  reportEl.textContent = text;
}

function clearReport() {
  reportEl.textContent = "";
}

function getSelectedItems(): ConversationItem[] {
  return lastConvos.filter((c) => selected.has(c.id));
}

function buildLocalListReport(items: ConversationItem[], title: string): string {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push(title);
  lines.push(`Generated: ${now}`);
  lines.push(`Selected count: ${items.length}`);
  lines.push("");

  for (const c of items) {
    lines.push(`- ${c.title}`);
    lines.push(`  id: ${c.id}`);
    lines.push(`  url: ${c.href}`);
  }

  if (!items.length) lines.push("(Nothing selected)");
  return lines.join("\n");
}

async function runDryRun() {
  const items = getSelectedItems();
  const localReport = buildLocalListReport(items, "DRY-RUN ONLY (no deletion performed)");

  writeReport(localReport);

  const ids = items.map((c) => c.id).filter(Boolean);
  if (!ids.length) return;

  setStatus("Dry-run (network)…");

  const res = await chrome.runtime.sendMessage({ type: MSG.DRY_RUN_DELETE, ids }).catch(() => null);

  setStatus("Done");

  if (!res) {
    writeReport(localReport + "\n\n---\nNETWORK DRY-RUN\nFailed: no response from background.\n");
    return;
  }

  if (!res.ok) {
    writeReport(localReport + `\n\n---\nNETWORK DRY-RUN\nFailed: ${res.error}\n`);
    return;
  }

  const lines: string[] = [];
  lines.push("---");
  lines.push("NETWORK DRY-RUN");
  lines.push(`Logged in: ${res.loggedIn ? "yes" : "no"}${res.meHint ? ` (${res.meHint})` : ""}`);
  lines.push(res.note || "");
  lines.push("");

  if (!res.requests?.length) {
    lines.push("(No requests prepared.)");
  } else {
    lines.push(`Would send ${res.requests.length} request(s):`);
    lines.push("");
    res.requests.forEach((r: any, i: number) => {
      lines.push(`${i + 1}. ${r.method} ${r.url}`);
      lines.push(`   headers: ${JSON.stringify(r.headers)}`);
      lines.push(`   body: ${JSON.stringify(r.body)}`);
      lines.push("");
    });
  }

  writeReport(localReport + "\n\n" + lines.join("\n"));
}

async function runExecuteDelete() {
  const items = getSelectedItems();
  const ids = items.map((c) => c.id).filter(Boolean);

  // Always print what we intend to delete first
  const base = buildLocalListReport(items, "EXECUTE DELETE (about to run)");
  writeReport(base + "\n");

  if (!ids.length) return;

  if (!cbConfirmExecute?.checked) {
    writeReport(base + "\n\nBlocked: tick the confirmation checkbox first.\n");
    return;
  }

  // Second confirmation: require exact count
  const expected = String(ids.length);
  const typed = prompt(`Type the number of selected conversations (${expected}) to confirm deletion:`) || "";
  if (typed.trim() !== expected) {
    writeReport(base + "\n\nCancelled: confirmation did not match.\n");
    return;
  }

  // Final “are you sure”
  if (!confirm(`This will hide ${ids.length} conversation(s) immediately. Continue?`)) {
    writeReport(base + "\n\nCancelled.\n");
    return;
  }

  setStatus("Deleting…");

  const res = await chrome.runtime
    .sendMessage({ type: MSG.EXECUTE_DELETE, ids, throttleMs: 600 })
    .catch(() => null);

  setStatus("Done");

  if (!res) {
    writeReport(base + "\n\n---\nEXECUTE\nFailed: no response from background.\n");
    return;
  }

  if (!res.ok) {
    writeReport(base + `\n\n---\nEXECUTE\nFailed: ${res.error}\n`);
    return;
  }

  const okCount = (res.results || []).filter((r: any) => r.ok).length;
  const failCount = (res.results || []).filter((r: any) => !r.ok).length;

  const lines: string[] = [];
  lines.push("---");
  lines.push("EXECUTE");
  lines.push(`Logged in: ${res.loggedIn ? "yes" : "no"}${res.meHint ? ` (${res.meHint})` : ""}`);
  lines.push(`Throttle: ${res.throttleMs} ms`);
  lines.push(res.note || "");
  lines.push("");
  lines.push(`Result: ${okCount} ok, ${failCount} failed`);
  lines.push("");

  for (const r of res.results || []) {
    if (r.ok) lines.push(`✓ ${r.id} (HTTP ${r.status ?? "?"})`);
    else lines.push(`✗ ${r.id} (${r.error || "failed"}${r.status ? `, HTTP ${r.status}` : ""})`);
  }

  lines.push("");
  lines.push("Tip: refresh chatgpt.com to confirm the sidebar updates.");

  writeReport(base + "\n\n" + lines.join("\n"));
}

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
}

async function scan() {
  setStatus("Scanning…");

  const res = await chrome.runtime.sendMessage({ type: MSG.LIST_CONVERSATIONS }).catch(() => null);

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

// LISTENERS
btnDryRun.addEventListener("click", () => {
  runDryRun().catch((e) => {
    console.error(e);
    setStatus("Error");
    writeReport("Dry-run crashed. See console.");
  });
});

btnExecuteDelete.addEventListener("click", () => {
  runExecuteDelete().catch((e) => {
    console.error(e);
    setStatus("Error");
    writeReport("Execute crashed. See console.");
  });
});

btnClearReport.addEventListener("click", () => clearReport());

btnSelectAll.addEventListener("click", () => selectAllVisible());
btnSelectNone.addEventListener("click", () => selectNoneVisible());

cbToggleAll.addEventListener("change", () => toggleAllVisible());

btnScan.addEventListener("click", () => {
  scan().catch((e) => {
    console.error(e);
    setStatus("Error");
  });
});

// Auto-scan once when panel opens
scan().catch(() => setStatus("Idle"));
