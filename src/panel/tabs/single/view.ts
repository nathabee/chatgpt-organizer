// src/panel/tabs/single/view.ts
import type { Dom } from "../../app/dom";
import type { ConversationItem } from "../../../shared/types";

export function createSingleView(dom: Dom) {
  function setStatus(s: string) {
    dom.singleStatusEl.textContent = s;
  }

  function writeExecOut(text: string) {
    dom.singleExecOutEl.textContent = text;
  }

  function appendExecOut(line: string) {
    const prev = dom.singleExecOutEl.textContent || "";
    dom.singleExecOutEl.textContent = prev ? `${prev}\n${line}` : line;
    dom.singleExecOutEl.scrollTop = dom.singleExecOutEl.scrollHeight;
  }

  function showExecProgress(show: boolean) {
    dom.singleExecProgressWrapEl.hidden = !show;
    if (!show) {
      dom.singleExecProgressEl.value = 0;
      dom.singleExecProgressEl.max = 100;
      dom.singleExecProgressTextEl.textContent = "";
    }
  }

  function showConfirm(show: boolean) {
    dom.singleConfirmBoxEl.hidden = !show;
    if (!show) {
      dom.singleCbConfirmEl.checked = false;
      dom.singleConfirmTitleEl.textContent = "";
      dom.singleConfirmPreviewEl.innerHTML = "";
    }
  }

  function updateCounts(chats: ConversationItem[], selected: Set<string>) {
    dom.singleCountEl.textContent = String(chats.length);
    dom.singleSelectedCountEl.textContent = String(selected.size);
  }

  function updateToggleAllState(chats: ConversationItem[], selected: Set<string>) {
    if (!chats.length) {
      dom.cbSingleToggleAll.checked = false;
      dom.cbSingleToggleAll.indeterminate = false;
      return;
    }

    const selectedInList = chats.filter((c) => selected.has(c.id)).length;

    if (selectedInList === 0) {
      dom.cbSingleToggleAll.checked = false;
      dom.cbSingleToggleAll.indeterminate = false;
    } else if (selectedInList === chats.length) {
      dom.cbSingleToggleAll.checked = true;
      dom.cbSingleToggleAll.indeterminate = false;
    } else {
      dom.cbSingleToggleAll.checked = false;
      dom.cbSingleToggleAll.indeterminate = true;
    }
  }

  function renderList(args: {
    chats: ConversationItem[];
    selected: Set<string>;
    isBusy(): boolean;
    onToggleChat(id: string, checked: boolean): void;
  }) {
    const { chats, selected, isBusy, onToggleChat } = args;

    dom.singleListEl.innerHTML = "";

    for (const c of chats) {
      const li = document.createElement("li");
      li.className = "item";
      li.dataset["id"] = c.id;

      const left = document.createElement("div");
      left.className = "left";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "deleteCb";
      cb.checked = selected.has(c.id);

      cb.addEventListener("change", () => {
        if (isBusy()) {
          // revert UI change
          cb.checked = selected.has(c.id);
          return;
        }
        onToggleChat(c.id, cb.checked);
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
      dom.singleListEl.appendChild(li);
    }

    updateCounts(chats, selected);
    updateToggleAllState(chats, selected);
  }

  function renderConfirmPreview(chats: ConversationItem[], ids: string[]) {
    const items = chats.filter((c) => ids.includes(c.id));
    const n = items.length;
    const preview = items.slice(0, 5);

    dom.singleConfirmTitleEl.textContent = `You are about to delete: ${n} chat${n === 1 ? "" : "s"}`;
    dom.singleConfirmPreviewEl.innerHTML = "";

    for (const c of preview) {
      const li = document.createElement("li");
      li.textContent = c.title || "Untitled";
      dom.singleConfirmPreviewEl.appendChild(li);
    }

    const more = n - preview.length;
    if (more > 0) {
      const li = document.createElement("li");
      li.textContent = `and ${more} more…`;
      dom.singleConfirmPreviewEl.appendChild(li);
    }

    dom.singleCbConfirmEl.checked = false;
    dom.singleBtnConfirmExecute.textContent = `Yes, delete ${n}`;
  }

  return {
    setStatus,
    writeExecOut,
    appendExecOut,
    showExecProgress,
    showConfirm,
    updateCounts,
    updateToggleAllState,
    renderList,
    renderConfirmPreview,
  };
}
