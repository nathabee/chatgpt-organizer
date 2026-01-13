// src/panel/tabs/projects/view.ts
import type { Dom } from "../../app/dom";
import type { ProjectItem } from "../../../shared/types";
import * as debugTrace from "../../../shared/debugTrace";

export function createProjectsView(dom: Dom) {
  const openProjects = new Set<string>();

  function rememberOpenState() {
    openProjects.clear();
    dom.projectsListEl.querySelectorAll("li.projectCard").forEach((li) => {
      const gid = (li as HTMLElement).dataset["gizmoId"] || "";
      const details = li.querySelector("details");
      if (gid && details?.open) openProjects.add(gid);
    });
  }

  function restoreOpenState() {
    dom.projectsListEl.querySelectorAll("li.projectCard").forEach((li) => {
      const gid = (li as HTMLElement).dataset["gizmoId"] || "";
      const details = li.querySelector("details") as HTMLDetailsElement | null;
      if (gid && details) details.open = openProjects.has(gid);
    });
  }

  function setStatus(s: string) {
    dom.projectsStatusEl.textContent = s;
  }

  function writeExecOut(text: string) {
    dom.projectsExecOutEl.textContent = text;
  }

  function appendExecOut(line: string) {
    const prev = dom.projectsExecOutEl.textContent || "";
    dom.projectsExecOutEl.textContent = prev ? `${prev}\n${line}` : line;
    dom.projectsExecOutEl.scrollTop = dom.projectsExecOutEl.scrollHeight;
  }

  function showChatsExecProgress(show: boolean) {
    dom.projectsChatsExecProgressWrapEl.hidden = !show;
    if (!show) {
      dom.projectsChatsExecProgressEl.value = 0;
      dom.projectsChatsExecProgressEl.max = 100;
      dom.projectsChatsExecProgressTextEl.textContent = "";
    }
  }

  function showProjectsExecProgress(show: boolean) {
    dom.projectsProjectsExecProgressWrapEl.hidden = !show;
    if (!show) {
      dom.projectsProjectsExecProgressEl.value = 0;
      dom.projectsProjectsExecProgressEl.max = 100;
      dom.projectsProjectsExecProgressTextEl.textContent = "";
    }
  }

  function showConfirm(show: boolean) {
    dom.projectsConfirmBoxEl.hidden = !show;
    if (!show) {
      dom.projectsCbConfirmEl.checked = false;
      dom.projectsConfirmTitleEl.textContent = "";
      dom.projectsConfirmPreviewEl.innerHTML = "";
    }
  }

  function updateCounts(args: {
    projects: ProjectItem[];
    totalChats: number;
    selectedChatsCount: number;
    selectedProjectsCount: number;
  }) {
    dom.projectsCountEl.textContent = String(args.projects.length);
    dom.projectsChatsCountEl.textContent = String(args.totalChats);
    dom.projectsSelectedChatsCountEl.textContent = String(args.selectedChatsCount);
    dom.projectsSelectedProjectsCountEl.textContent = String(args.selectedProjectsCount);
  }

  function renderList(args: {
    projects: ProjectItem[];
    selectedProjectIds: Set<string>;
    selectedProjectChatIds: Set<string>;
    isBusy(): boolean;
    onToggleProject(p: ProjectItem, checked: boolean): void;
    onToggleChat(p: ProjectItem, chatId: string, checked: boolean): void;
    afterProjectToggle(): void;
    afterChatToggle(): void;
  }) {
    const {
      projects,
      selectedProjectIds,
      selectedProjectChatIds,
      isBusy,
      onToggleProject,
      onToggleChat,
      afterProjectToggle,
      afterChatToggle,
    } = args;

    rememberOpenState();
    dom.projectsListEl.innerHTML = "";

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
        // Selection must remain usable even while busy.
        // If user toggles during busy, we record a persisted dev trace (only when enabled).
        if (isBusy()) {
          void debugTrace.append({
            scope: "projects",
            kind: "debug",
            message: "ui:toggleProject while busy",
            meta: { gizmoId: p.gizmoId, checked: pickCb.checked },
          });
        }

        onToggleProject(p, pickCb.checked);
        afterProjectToggle();
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
          // If the project is selected, chat selection is forced on.
          // (User can’t uncheck an individual chat while the whole project is selected.)
          if (selectedProjectIds.has(p.gizmoId)) {
            cb.checked = true;
            if (isBusy()) {
              void debugTrace.append({
                scope: "projects",
                kind: "debug",
                message: "ui:toggleChat blocked (project forced) while busy",
                meta: { gizmoId: p.gizmoId, chatId: c.id },
              });
            }
            return;
          }

          if (isBusy()) {
            void debugTrace.append({
              scope: "projects",
              kind: "debug",
              message: "ui:toggleChat while busy",
              meta: { gizmoId: p.gizmoId, chatId: c.id, checked: cb.checked },
            });
          }

          onToggleChat(p, c.id, cb.checked);
          afterChatToggle();
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

      dom.projectsListEl.appendChild(li);
    }

    restoreOpenState();
  }

  function renderConfirmPreview(args: {
    projects: ProjectItem[];
    selectedProjectIds: string[];
    selectedChatIds: string[];
  }) {
    const { projects, selectedProjectIds, selectedChatIds } = args;

    dom.projectsConfirmPreviewEl.innerHTML = "";

    const titleParts: string[] = [];
    if (selectedProjectIds.length) titleParts.push(`${selectedProjectIds.length} project(s)`);
    if (selectedChatIds.length) titleParts.push(`${selectedChatIds.length} chat(s)`);
    dom.projectsConfirmTitleEl.textContent = `You are about to delete: ${titleParts.join(" + ")}`;

    const previewProjects = selectedProjectIds.slice(0, 5);
    for (const pid of previewProjects) {
      const p = projects.find((x) => x.gizmoId === pid);
      if (!p) continue;
      const li = document.createElement("li");
      li.textContent = `Project: ${p.title}`;
      dom.projectsConfirmPreviewEl.appendChild(li);
    }
    if (selectedProjectIds.length > previewProjects.length) {
      const li = document.createElement("li");
      li.textContent = `…and ${selectedProjectIds.length - previewProjects.length} more projects`;
      dom.projectsConfirmPreviewEl.appendChild(li);
    }

    const previewChats = selectedChatIds.slice(0, 5);
    for (const cid of previewChats) {
      const c = projects.flatMap((p) => p.conversations || []).find((x) => x.id === cid);
      const li = document.createElement("li");
      li.textContent = `Chat: ${c?.title || cid.slice(0, 8)}`;
      dom.projectsConfirmPreviewEl.appendChild(li);
    }
    if (selectedChatIds.length > previewChats.length) {
      const li = document.createElement("li");
      li.textContent = `…and ${selectedChatIds.length - previewChats.length} more chats`;
      dom.projectsConfirmPreviewEl.appendChild(li);
    }

    dom.projectsCbConfirmEl.checked = false;
    dom.projectsBtnConfirmExecute.textContent = "Yes, delete";
  }

  return {
    setStatus,
    writeExecOut,
    appendExecOut,
    showChatsExecProgress,
    showProjectsExecProgress,
    showConfirm,
    updateCounts,
    renderList,
    renderConfirmPreview,
  };
}
