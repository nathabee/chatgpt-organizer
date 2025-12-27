// src/panel/panel.ts
import { MSG } from "../shared/messages";
import type { ConversationItem } from "../shared/types";

const btnScan = document.getElementById("btnScan") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;
const countEl = document.getElementById("count") as HTMLElement;
const listEl = document.getElementById("list") as HTMLUListElement;

function setStatus(s: string) {
  statusEl.textContent = s;
}

function render(convos: ConversationItem[]) {
  countEl.textContent = String(convos.length);
  listEl.innerHTML = "";

  for (const c of convos) {
    const li = document.createElement("li");
    li.className = "item";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = c.title || "Untitled";

    const meta = document.createElement("a");
    meta.href = c.href;
    meta.textContent = c.href;
    meta.target = "_blank";
    meta.rel = "noreferrer";

    li.appendChild(title);
    li.appendChild(meta);
    listEl.appendChild(li);
  }
}

async function scan() {
  setStatus("Scanning…");

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    setStatus("No active tab.");
    render([]);
    return;
  }

  // Optional sanity check
  if (!tab.url?.startsWith("https://chatgpt.com/")) {
    setStatus("Open a chatgpt.com tab first.");
    render([]);
    return;
  }

  const res = await chrome.tabs.sendMessage(tab.id, { type: MSG.LIST_CONVERSATIONS }).catch(() => null);

  if (!res?.ok) {
    setStatus("Scan failed (content script not responding). Reload ChatGPT tab.");
    render([]);
    return;
  }

  const convos: ConversationItem[] = res.conversations || [];
  setStatus("Done");
  render(convos);
}

btnScan.addEventListener("click", () => {
  scan().catch((e) => {
    console.error(e);
    setStatus("Error");
  });
});

// Auto-scan once when panel opens
scan().catch(() => setStatus("Idle"));
