// docs/checklist/checklist.js

// helper to avoid accidental HTML injection
export function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function getBaseDir(file) {
  const i = String(file).lastIndexOf("/");
  return i >= 0 ? String(file).slice(0, i + 1) : "";
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch JSON: ${path} (${res.status})`);
  return await res.json();
}

function normalizeSections(json) {
  if (Array.isArray(json?.sections)) return json.sections;
  if (Array.isArray(json)) return json;
  return [];
}

async function resolveBundle(file, json) {
  const baseDir = getBaseDir(file);

  const merged = [];
  const includes = Array.isArray(json?.includes) ? json.includes : [];

  for (const inc of includes) {
    const incPath = baseDir + String(inc).replace(/^\/+/, "");
    const incJson = await fetchJson(incPath);
    merged.push(...normalizeSections(incJson));
  }

  merged.push(...normalizeSections(json));
  return merged;
}

function defaultMeta(metaIn = {}) {
  const m = isObject(metaIn) ? metaIn : {};
  return {
    title: m.title || "Interactive Checklist",
    date: m.date || new Date().toISOString().split("T")[0],
    tester: m.tester || "",
    device: m.device || "",
    browser: m.browser || "",
    buildVariant: m.buildVariant || "",
    extensionVersion: m.extensionVersion || m.version || "",
  };
}

function ensureSession() {
  if (!window.__cgoChecklistSession) {
    window.__cgoChecklistSession = {
      file: "",
      loadedKey: "",
      meta: defaultMeta(),
      sections: [],
      mode: "single", // "single" | "all"
      secIndex: 0,
    };
  }
  return window.__cgoChecklistSession;
}

function readMetaFromFields(fallbackMeta) {
  return {
    title: document.getElementById("meta-title")?.value || fallbackMeta.title || "",
    date: document.getElementById("meta-date")?.value || fallbackMeta.date || "",
    tester: document.getElementById("meta-tester")?.value || fallbackMeta.tester || "",
    device: document.getElementById("meta-device")?.value || fallbackMeta.device || "",
    browser: document.getElementById("meta-browser")?.value || fallbackMeta.browser || "",
    buildVariant: document.getElementById("meta-build")?.value || fallbackMeta.buildVariant || "",
    extensionVersion:
      document.getElementById("meta-extver")?.value || fallbackMeta.extensionVersion || "",
  };
}

function persistUiToSession() {
  const session = ensureSession();

  // meta
  session.meta = readMetaFromFields(session.meta);

  // items for sections that are currently in DOM
  document.querySelectorAll(".checklist-section").forEach((sectionEl) => {
    const secIndex = Number(sectionEl.dataset.secIndex);
    const sec = session.sections[secIndex];
    if (!sec) return;

    sectionEl.querySelectorAll(".checklist-item").forEach((itemEl) => {
      const itemIndex = Number(itemEl.dataset.itemIndex);
      const it = sec.items[itemIndex];
      if (!it) return;

      const selected = itemEl.querySelector("input[type='radio']:checked");
      const note = itemEl.querySelector(".note-field")?.value || "";
      const desc = itemEl.querySelector(".description-field")?.value || "";

      it.state = selected ? selected.value : "";
      it.note = note;
      it.description = desc;
    });
  });
}

function renderMetaBox(container, meta) {
  const metaBox = document.createElement("div");
  metaBox.classList.add("meta-box");
  metaBox.innerHTML = `
    <h3>Test Session Info</h3>
    <label>Title: <input type="text" id="meta-title" value="${escapeHtml(meta.title || "")}"></label>
    <label>Date: <input type="date" id="meta-date" value="${escapeHtml(meta.date || "")}"></label>
    <label>Tester: <input type="text" id="meta-tester" value="${escapeHtml(meta.tester || "")}"></label>
    <label>Device: <input type="text" id="meta-device" value="${escapeHtml(meta.device || "")}"></label>
    <label>Browser: <input type="text" id="meta-browser" value="${escapeHtml(meta.browser || "")}"></label>
    <label>Extension Version: <input type="text" id="meta-extver" value="${escapeHtml(
      meta.extensionVersion || ""
    )}"></label>
    <label>Build Variant: <input type="text" id="meta-build" value="${escapeHtml(meta.buildVariant || "")}"></label>
  `;
  container.appendChild(metaBox);
}

function renderHeader(container, titleText) {
  container.innerHTML = `<h2>Checklist: ${escapeHtml(titleText || "Interactive Checklist")}</h2>`;
}

function renderControls(container, session) {
  const controls = document.createElement("div");
  controls.classList.add("panel-actions");
  controls.style.margin = "0.75rem 0 1rem 0";

  const btnPrev = document.createElement("button");
  btnPrev.textContent = "Previous";
  btnPrev.disabled = session.mode !== "single" || session.secIndex <= 0;
  btnPrev.onclick = () => {
    persistUiToSession();
    session.secIndex = Math.max(0, session.secIndex - 1);
    renderChecklistSession();
  };

  const btnNext = document.createElement("button");
  btnNext.textContent = "Next";
  btnNext.disabled = session.mode !== "single" || session.secIndex >= session.sections.length - 1;
  btnNext.onclick = () => {
    persistUiToSession();
    session.secIndex = Math.min(session.sections.length - 1, session.secIndex + 1);
    renderChecklistSession();
  };

  const btnAll = document.createElement("button");
  btnAll.textContent = session.mode === "all" ? "View single section" : "View all sections";
  btnAll.onclick = () => {
    persistUiToSession();
    session.mode = session.mode === "all" ? "single" : "all";
    renderChecklistSession();
  };

  const progress = document.createElement("span");
  progress.style.marginLeft = "0.5rem";
  progress.textContent =
    session.mode === "single"
      ? `Section ${session.secIndex + 1} / ${session.sections.length}`
      : `All sections (${session.sections.length})`;

  controls.appendChild(btnPrev);
  controls.appendChild(btnNext);
  controls.appendChild(btnAll);
  controls.appendChild(progress);
  container.appendChild(controls);
}

function renderOpenRow(container, session) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "1rem";
  row.style.marginBottom = "1rem";
  row.style.alignItems = "center";
  row.style.flexWrap = "wrap";

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "New Checklist";
  reloadBtn.onclick = () => loadStructuredChecklist(session.file);
  row.appendChild(reloadBtn);

  const openLabel = document.createElement("label");
  openLabel.textContent = "Open JSON Checklist";
  openLabel.classList.add("button-like");

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.style.display = "none";
  input.onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = JSON.parse(String(ev.target.result || "{}"));
      renderChecklistFromData(data);
    };
    reader.readAsText(f);
  };

  openLabel.appendChild(input);
  row.appendChild(openLabel);

  container.appendChild(row);
}

function renderSections(container, session) {
  const sectionsToRender =
    session.mode === "all"
      ? session.sections.map((s, idx) => ({ ...s, __idx: idx }))
      : [{ ...session.sections[session.secIndex], __idx: session.secIndex }];

  sectionsToRender.forEach((sectionObj) => {
    const secIndex = sectionObj.__idx;

    const sectionDiv = document.createElement("div");
    sectionDiv.classList.add("checklist-section");
    sectionDiv.dataset.secIndex = String(secIndex);

    const title = document.createElement("h3");
    title.textContent = sectionObj.section || `Section ${secIndex + 1}`;
    sectionDiv.appendChild(title);

    (Array.isArray(sectionObj.items) ? sectionObj.items : []).forEach((item, itemIndex) => {
      const row = document.createElement("div");
      row.classList.add("checklist-item");
      row.dataset.itemIndex = String(itemIndex);

      const expectedHtml = item.expected
        ? `<em class="expected">${escapeHtml(item.expected)}</em>`
        : "";
      const detailsHtml = item.details
        ? `<div class="details" style="margin-top:.25rem"><code>${escapeHtml(item.details)}</code></div>`
        : "";

      const label = document.createElement("p");
      label.innerHTML = `
        <strong>${escapeHtml(item.test || "")}</strong><br>
        ${expectedHtml}
        ${detailsHtml}
      `;
      row.appendChild(label);

      const desc = document.createElement("textarea");
      desc.classList.add("description-field");
      desc.placeholder = "Optional test scenario or setup steps";
      desc.rows = 2;
      desc.style.width = "100%";
      desc.style.marginBottom = "0.5rem";
      desc.value = item.description || "";
      row.appendChild(desc);

      const options = ["Pass", "Partial", "Fail"];
      const name = `check-${secIndex}-${itemIndex}`;
      options.forEach((opt) => {
        const input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.value = opt;
        if (item.state === opt) input.checked = true;

        const radioLabel = document.createElement("label");
        radioLabel.style.marginRight = "1rem";
        radioLabel.appendChild(input);
        radioLabel.append(` ${opt}`);
        row.appendChild(radioLabel);
      });

      const note = document.createElement("input");
      note.type = "text";
      note.placeholder = "(Optional) Notes if Partial/Fail";
      note.classList.add("note-field");
      note.value = item.note || "";
      row.appendChild(note);

      sectionDiv.appendChild(row);
    });

    container.appendChild(sectionDiv);
  });
}

function renderSaveButtons(container) {
  const saveMd = document.createElement("button");
  saveMd.textContent = "Save Checklist Report (Markdown)";
  saveMd.onclick = () => {
    persistUiToSession();
    saveStructuredChecklist();
  };
  container.appendChild(saveMd);

  const saveJson = document.createElement("button");
  saveJson.textContent = "Save Checklist as JSON";
  saveJson.onclick = () => {
    persistUiToSession();
    saveChecklistAsJSON();
  };
  container.appendChild(saveJson);
}

function renderChecklistSession() {
  const session = ensureSession();

  const container = document.getElementById("content");
  if (!container) throw new Error("Missing #content container");

  renderHeader(container, session.meta.title);
  renderMetaBox(container, session.meta);
  renderControls(container, session);
  renderOpenRow(container, session);
  renderSections(container, session);
  renderSaveButtons(container);
}

/**
 * Load checklist by file. Supports "bundle JSON" with:
 * - meta
 * - includes: ["sections/a.json", ...]
 * - sections: [] (optional)
 *
 * Default behavior: render one section at a time, with Next/Previous.
 */
export async function loadStructuredChecklist(file) {
  const session = ensureSession();

  const json = await fetchJson(file);
  const meta = defaultMeta(json?.meta);

  const allSections = await resolveBundle(file, json);

  // determine whether we need to reinitialize the session
  const loadedKey = `${file}::bundle`;
  const shouldInit = session.loadedKey !== loadedKey || !Array.isArray(session.sections);

  session.file = file;
  session.meta = meta;

  if (shouldInit) {
    session.sections = allSections.map((s) => ({
      section: s.section || "Untitled section",
      items: (Array.isArray(s.items) ? s.items : []).map((it) => ({
        test: it.test || "",
        expected: it.expected || "",
        details: it.details || "",
        description: it.description || "",
        state: it.state || "",
        note: it.note || "",
      })),
    }));

    session.mode = "single";
    session.secIndex = 0;
    session.loadedKey = loadedKey;
  }

  renderChecklistSession();
}

/**
 * Load a saved checklist report JSON (already contains sections and item states).
 * This intentionally ignores "includes" and treats the payload as self-contained.
 */
export function renderChecklistFromData(data) {
  const session = ensureSession();

  const meta = defaultMeta(data?.meta);
  const sections = normalizeSections(data);

  session.file = "(local)";
  session.meta = meta;
  session.sections = sections.map((s) => ({
    section: s.section || "Untitled section",
    items: (Array.isArray(s.items) ? s.items : []).map((it) => ({
      test: it.test || "",
      expected: it.expected || "",
      details: it.details || "",
      description: it.description || "",
      state: it.state || "",
      note: it.note || "",
    })),
  }));

  session.mode = "single";
  session.secIndex = 0;
  session.loadedKey = "local::report";

  renderChecklistSession();
}

export function saveChecklistAsJSON() {
  const session = ensureSession();
  const full = {
    meta: session.meta,
    sections: session.sections,
  };

  const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Checklist_${new Date().toISOString().split("T")[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

export function saveStructuredChecklist() {
  const session = ensureSession();
  const meta = session.meta || {};
  const title = meta.title || "Checklist";

  const lines = [
    `# ${title}\n`,
    `\n## Test Session`,
    `- **Date:** ${meta.date || ""}`,
    `- **Tester:** ${meta.tester || ""}`,
    `- **Device:** ${meta.device || ""}`,
    meta.browser ? `- **Browser:** ${meta.browser}` : null,
    meta.extensionVersion ? `- **Extension Version:** ${meta.extensionVersion}` : null,
    meta.buildVariant ? `- **Build Variant:** ${meta.buildVariant}` : null,
    `\n---\n`,
  ].filter(Boolean);

  session.sections.forEach((section) => {
    lines.push(`\n## ${section.section}`);

    section.items.forEach((it) => {
      const status = it.state || "Not marked";
      lines.push(`- **${it.test}** — ${status}${it.note ? `: ${it.note}` : ""}`);
      if (it.expected) lines.push(`  - _Expected:_ ${it.expected}`);
      if (it.details) lines.push(`  - _Details:_ ${it.details}`);
      if (it.description) lines.push(`  - _Scenario:_ ${it.description}`);
    });
  });

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Checklist_${new Date().toISOString().split("T")[0]}.md`;
  a.click();

  URL.revokeObjectURL(url);
}

// Optional: keep backward compatibility with inline onclick="..."
export function registerChecklistGlobals() {
  window.escapeHtml = escapeHtml;
  window.loadStructuredChecklist = loadStructuredChecklist;
  window.renderChecklistFromData = renderChecklistFromData;
  window.saveChecklistAsJSON = saveChecklistAsJSON;
  window.saveStructuredChecklist = saveStructuredChecklist;
}
