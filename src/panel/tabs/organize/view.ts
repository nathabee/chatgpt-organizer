import type { Dom } from "../../app/dom";
import type { ProjectItem } from "../../../shared/types";
import type { SourceChat } from "./model";

export function createOrganizeView(dom: Dom) {

    function setActionsEnabled(enabled: boolean) {
        // main action
        dom.btnOrganizeMove.disabled = !enabled;

        // confirm buttons
        dom.organizeBtnConfirmExecute.disabled = !enabled;
        dom.organizeBtnCancelExecute.disabled = !enabled;

        // selection / filters (optional but recommended)
        dom.organizeSourceEl.disabled = !enabled;
        dom.organizeFilterEl.disabled = !enabled;
        dom.organizeProjectFilterEl.disabled = !enabled;
        dom.cbOrganizeToggleAll.disabled = !enabled;
        dom.btnOrganizeClearTarget.disabled = !enabled;
    }


    function setSourceStatus(text: string) {
        dom.organizeSourceStatusEl.textContent = text;
    }

    function setProjectsStatus(text: string) {
        dom.organizeProjectsStatusEl.textContent = text;
    }

    function setCounts(args: { sourceCount: number; selectedCount: number; projectsCount: number; targetLabel: string }) {
        dom.organizeSourceCountEl.textContent = String(args.sourceCount);
        dom.organizeSelectedCountEl.textContent = String(args.selectedCount);
        dom.organizeProjectsCountEl.textContent = String(args.projectsCount);
        dom.organizeTargetLabelEl.textContent = args.targetLabel || "—";
    }

    function writeExecOut(text: string) {
        dom.organizeExecOutEl.textContent = text;
    }

    function appendExecOut(line: string) {
        const prev = dom.organizeExecOutEl.textContent || "";
        dom.organizeExecOutEl.textContent = prev ? `${prev}\n${line}` : line;
        dom.organizeExecOutEl.scrollTop = dom.organizeExecOutEl.scrollHeight;
    }

    function showExecProgress(show: boolean) {
        dom.organizeExecProgressWrapEl.hidden = !show;
        if (!show) {
            dom.organizeExecProgressEl.value = 0;
            dom.organizeExecProgressEl.max = 100;
            dom.organizeExecProgressTextEl.textContent = "";
        }
    }

    function showConfirm(show: boolean) {
        dom.organizeConfirmBoxEl.hidden = !show;
        if (!show) {
            dom.organizeCbConfirmEl.checked = false;
            dom.organizeConfirmTitleEl.textContent = "";
            dom.organizeConfirmPreviewEl.innerHTML = "";
        }
    }



    function renderSourceList(args: {
        chats: SourceChat[];
        selectedIds: Set<string>;
        isBusy(): boolean;
        onToggle(id: string, checked: boolean): void;
    }) {
        dom.organizeSourceListEl.innerHTML = "";

        for (const c of args.chats) {
            const li = document.createElement("li");
            li.className = "item";
            li.style.gridTemplateColumns = "28px 1fr";

            const left = document.createElement("div");
            left.className = "left";

            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = args.selectedIds.has(c.id);
            cb.addEventListener("change", () => {
                if (args.isBusy()) return;
                args.onToggle(c.id, cb.checked);
            });

            left.appendChild(cb);

            const mid = document.createElement("div");

            const title = document.createElement("div");
            title.className = "title";
            title.textContent = c.title || "Untitled";

            const meta = document.createElement("div");
            meta.className = "muted";
            meta.style.fontSize = "12px";
            meta.textContent = c.origin === "single" ? "Single chat" : `Project chat · ${c.projectTitle || c.projectId || "—"}`;

            const link = document.createElement("a");
            link.className = "link";
            link.href = c.href;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = c.href;

            mid.appendChild(title);
            mid.appendChild(meta);
            mid.appendChild(link);

            li.appendChild(left);
            li.appendChild(mid);

            dom.organizeSourceListEl.appendChild(li);
        }
    }

    function renderProjectList(args: {
        projects: ProjectItem[];
        targetProjectId: string | null;
        isBusy(): boolean;
        onPick(projectId: string): void;
    }) {
        dom.organizeProjectListEl.innerHTML = "";

        for (const p of args.projects) {
            const li = document.createElement("li");
            li.className = "item";
            li.style.gridTemplateColumns = "28px 1fr";

            const left = document.createElement("div");
            left.className = "left";

            const rb = document.createElement("input");
            rb.type = "radio";
            rb.name = "organizeTargetProject";
            rb.checked = args.targetProjectId === p.gizmoId;
            rb.addEventListener("change", () => {
                if (args.isBusy()) return;
                if (rb.checked) args.onPick(p.gizmoId);
            });

            left.appendChild(rb);

            const mid = document.createElement("div");

            const title = document.createElement("div");
            title.className = "title";
            title.textContent = p.title || "Untitled project";

            const meta = document.createElement("div");
            meta.className = "muted";
            meta.style.fontSize = "12px";
            meta.textContent = `${(p.conversations || []).length} chat(s) loaded`;

            const link = document.createElement("a");
            link.className = "link";
            link.href = p.href;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = p.href;

            mid.appendChild(title);
            mid.appendChild(meta);
            mid.appendChild(link);

            li.appendChild(left);
            li.appendChild(mid);

            dom.organizeProjectListEl.appendChild(li);
        }
    }

    function renderConfirmPreview(args: { selectedChats: SourceChat[]; target: ProjectItem }) {
        dom.organizeConfirmPreviewEl.innerHTML = "";

        dom.organizeConfirmTitleEl.textContent =
            `Move ${args.selectedChats.length} chat(s) → “${args.target.title || "Untitled project"}”`;

        const preview = args.selectedChats.slice(0, 5);
        for (const c of preview) {
            const li = document.createElement("li");
            li.textContent = c.title || c.id.slice(0, 8);
            dom.organizeConfirmPreviewEl.appendChild(li);
        }

        if (args.selectedChats.length > preview.length) {
            const li = document.createElement("li");
            li.textContent = `…and ${args.selectedChats.length - preview.length} more`;
            dom.organizeConfirmPreviewEl.appendChild(li);
        }

        dom.organizeCbConfirmEl.checked = false;
        dom.organizeBtnConfirmExecute.textContent = "Yes, move";
    }

    return {
        setActionsEnabled,
        setSourceStatus,
        setProjectsStatus,
        setCounts,
        writeExecOut,
        appendExecOut,
        showExecProgress,
        showConfirm,
        renderSourceList,
        renderProjectList,
        renderConfirmPreview,
    };
}
