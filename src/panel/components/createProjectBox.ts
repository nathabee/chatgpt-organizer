// src/panel/components/createProjectBox.ts

export type CreateProjectPayload = {
  name: string;
  description: string;
  context: "projects" | "organize";
};

export type CreateProjectBox = {
  el: HTMLElement;
  setBusy(next: boolean): void;
  setStatus(text: string): void;
  clearStatus(): void;
  reset(): void;
  getValue(): { name: string; description: string };
};

function q<T extends Element>(root: Element, sel: string): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`[createProjectBox] Missing ${sel}`);
  return el as T;
}

export function createProjectBox(args: {
  context: "projects" | "organize";
  title?: string;
  compact?: boolean;
  namePlaceholder?: string;
  descPlaceholder?: string;
  submitLabel?: string;
}): CreateProjectBox {
  const {
    context,
    title = context === "organize" ? "Create new project" : "Create a new project",
    compact = context === "organize",
    namePlaceholder = "e.g. general",
    descPlaceholder = context === "organize" ? "Optional description…" : "Short description shown in ChatGPT projects…",
    submitLabel = context === "organize" ? "Create" : "Create project",
  } = args;

  const root = document.createElement("details");
  root.className = `createBox${compact ? " createBox--compact" : ""}`;
  root.open = false;

  root.innerHTML = `
    <summary>${escapeHtml(title)}</summary>

    <div class="createGrid">
      <label class="fieldBlock">
        <span>Project name</span>
        <input data-role="name" type="text" autocomplete="off" maxlength="80" placeholder="${escapeAttr(namePlaceholder)}" />
      </label>

      <label class="fieldBlock">
        <span>Description (optional)</span>
        <textarea data-role="desc" rows="${compact ? "2" : "3"}" placeholder="${escapeAttr(descPlaceholder)}"></textarea>
      </label>

      <div class="row createActions">
        <button data-role="submit" type="button" class="subtle">${escapeHtml(submitLabel)}</button>
        <span data-role="status" class="status"></span>
      </div>
    </div>
  `;

  const nameEl = q<HTMLInputElement>(root, `[data-role="name"]`);
  const descEl = q<HTMLTextAreaElement>(root, `[data-role="desc"]`);
  const submitEl = q<HTMLButtonElement>(root, `[data-role="submit"]`);
  const statusEl = q<HTMLElement>(root, `[data-role="status"]`);

  function getValue() {
    return {
      name: nameEl.value.trim(),
      description: descEl.value.trim(),
    };
  }

  function setBusy(next: boolean) {
    nameEl.disabled = next;
    descEl.disabled = next;
    submitEl.disabled = next;
  }

  function setStatus(text: string) {
    statusEl.textContent = text;
  }

  function clearStatus() {
    statusEl.textContent = "";
  }

  function reset() {
    nameEl.value = "";
    descEl.value = "";
    clearStatus();
  }

  function fireSubmit() {
    clearStatus();

    const { name, description } = getValue();
    if (!name) {
      setStatus("Name is required.");
      nameEl.focus();
      return;
    }

    const payload: CreateProjectPayload = { name, description, context };

    // Clean integration point: tabs or a global controller can listen for this event.
    root.dispatchEvent(
      new CustomEvent<CreateProjectPayload>("cgo:createProject", {
        bubbles: true,
        detail: payload,
      })
    );
  }

  submitEl.addEventListener("click", fireSubmit);
  nameEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fireSubmit();
    }
  });

  return {
    el: root,
    setBusy,
    setStatus,
    clearStatus,
    reset,
    getValue,
  };
}

// Small helpers (avoid injecting raw strings into HTML)
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case `"`: return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
