// src/panel/panel.ts
import { MSG } from "../shared/messages";
import type { ConversationItem } from "../shared/types";

const btnScan = document.getElementById("btnScan") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;
const countEl = document.getElementById("count") as HTMLElement;
const selectedCountEl = document.getElementById("selectedCount") as HTMLElement;
const listEl = document.getElementById("list") as HTMLUListElement;
const btnSelectAll = document.getElementById("btnSelectAll") as HTMLButtonElement;
const btnSelectNone = document.getElementById("btnSelectNone") as HTMLButtonElement;
const cbToggleAll = document.getElementById("cbToggleAll") as HTMLInputElement;


let lastConvos: ConversationItem[] = [];
const selected = new Set<string>(); // conversation ids selected for deletion

function setStatus(s: string) {
  statusEl.textContent = s;
}

function updateSelectedCount() {
  selectedCountEl.textContent = String(selected.size);
}

function updateToggleAllState() {
  // If nothing loaded yet, keep it unchecked.
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
  // Update checkboxes + row style for whatever is currently rendered
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


function render(convos: ConversationItem[]) {
  lastConvos = convos;

  countEl.textContent = String(convos.length);
  listEl.innerHTML = "";

  for (const c of convos) {
    const li = document.createElement("li");
    li.className = "item";
    li.dataset["id"] = c.id;


    // Left: delete checkbox
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

    // Middle: title + link
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

    // initial selected style
    li.classList.toggle("selected", selected.has(c.id));

    listEl.appendChild(li);
  }

  updateSelectedCount();
  updateToggleAllState();

}

async function scan() {
  setStatus("Scanning…");

  const res = await chrome.runtime
    .sendMessage({ type: MSG.LIST_CONVERSATIONS })
    .catch(() => null);

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

btnSelectAll.addEventListener("click", () => selectAllVisible());
btnSelectNone.addEventListener("click", () => selectNoneVisible());

cbToggleAll.addEventListener("change", () => {
  // If user clicks the checkbox, treat it as “toggle all”.
  // (We drive the checked/indeterminate state ourselves.)
  toggleAllVisible();
});


btnScan.addEventListener("click", () => {
  scan().catch((e) => {
    console.error(e);
    setStatus("Error");
  });
});

// Auto-scan once when panel opens
scan().catch(() => setStatus("Idle"));
