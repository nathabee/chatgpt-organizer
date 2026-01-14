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

export function getMetaFromFields() {
  return {
    title: document.getElementById("meta-title")?.value || "",
    date: document.getElementById("meta-date")?.value || "",
    tester: document.getElementById("meta-tester")?.value || "",
    device: document.getElementById("meta-device")?.value || "",
    androidVersion: document.getElementById("meta-android")?.value || "",
    appVersion: document.getElementById("meta-app")?.value || "",
    buildVariant: document.getElementById("meta-build")?.value || ""
  };
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

  // Load included section files first (if any)
  const includes = Array.isArray(json?.includes) ? json.includes : [];
  const merged = [];

  for (const inc of includes) {
    const incPath = baseDir + String(inc).replace(/^\/+/, "");
    const incJson = await fetchJson(incPath);
    merged.push(...normalizeSections(incJson));
  }

  // Then append bundle’s own sections (if any)
  merged.push(...normalizeSections(json));

  return merged;
}

// Load and render structured checklist JSON with metadata
export async function loadStructuredChecklist(file = "App_Test_checklist.json") {
  const json = await fetchJson(file);
  const meta = isObject(json?.meta) ? json.meta : {};
  const allSections = await resolveBundle(file, json);

  const container = document.getElementById("content");
  if (!container) throw new Error("Missing #content container");

  // Persist session state globally while user moves between sections
  window.__cgoChecklistSession = window.__cgoChecklistSession || {
    file,
    meta: {},
    sections: [],
    mode: "single",     // "single" | "all"
    secIndex: 0
  };

  const session = window.__cgoChecklistSession;
  session.file = file;
  session.meta = {
    title: meta.title || "Interactive Checklist",
    date: meta.date || new Date().toISOString().split("T")[0],
    tester: meta.tester || "",
    device: meta.device || "",
    androidVersion: meta.androidVersion || "",
    appVersion: meta.appVersion || "",
    buildVariant: meta.buildVariant || ""
  };

  // Initialize sections only once per file, or if file changed
  if (!Array.isArray(session.sections) || session.sections.length === 0 || session._loadedFile !== file) {
    session.sections = allSections.map((s) => ({
      section: s.section || "Untitled section",
      items: (Array.isArray(s.items) ? s.items : []).map((it) => ({
        test: it.test || "",
        expected: it.expected || "",
        details: it.details || "",
        description: it.description || "",
        state: it.state || "",
        note: it.note || ""
      }))
    }));
    session.secIndex = 0;
    session.mode = "single";
    session._loadedFile = file;
  }

  renderChecklistSession();
}

function renderChecklistSession() {
  const session = window.__cgoChecklistSession;
  const container = document.getElementById("content");
  if (!container) return;

  const titleText = session.meta.title || "Interactive Checklist";
  container.innerHTML = `<h2>✅ ${escapeHtml(titleText)}</h2>`;

  // ===== Meta box =====
  const metaBox = document.createElement("div");
  metaBox.classList.add("meta-box");
  metaBox.innerHTML = `
    <h3>📝 Test Session Info</h3>
    <label>Title: <input type="text" id="meta-title" value="${escapeHtml(session.meta.title || "")}"></label>
    <label>Date: <input type="date" id="meta-date" value="${escapeHtml(session.meta.date || "")}"></label>
    <label>Tester: <input type="text" id="meta-tester" value="${escapeHtml(session.meta.tester || "")}"></label>
    <label>Device: <input type="text" id="meta-device" value="${escapeHtml(session.meta.device || "")}"></label>
    <label>Android Version: <input type="text" id="meta-android" value="${escapeHtml(session.meta.androidVersion || "")}"></label>
    <label>App Version: <input type="text" id="meta-app" value="${escapeHtml(session.meta.appVersion || "")}"></label>
    <label>Build Variant: <input type="text" id="meta-build" value="${escapeHtml(session.meta.buildVariant || "")}"></label>
  `;
  container.appendChild(metaBox);

  // ===== Controls row =====
  const controls = document.createElement("div");
  controls.classList.add("panel-actions");
  controls.style.margin = "0.75rem 0 1rem 0";

  const btnPrev = document.createElement("button");
  btnPrev.textContent = "← Previous";
  btnPrev.disabled = session.mode !== "single" || session.secIndex <= 0;
  btnPrev.onclick = () => {
    persistUiToSession();
    session.secIndex = Math.max(0, session.secIndex - 1);
    renderChecklistSession();
  };

  const btnNext = document.createElement("button");
  btnNext.textContent = "Next →";
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

  // ===== New / Open =====
  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "1rem";
  buttonRow.style.marginBottom = "1rem";
  buttonRow.style.alignItems = "center";
  buttonRow.style.flexWrap = "wrap";

  const newChecklistBtn = document.createElement("button");
  newChecklistBtn.textContent = "🆕 New Checklist";
  newChecklistBtn.onclick = () => loadStructuredChecklist(session.file);
  buttonRow.appendChild(newChecklistBtn);

  const openLabel = document.createElement("label");
  openLabel.textContent = "📂 Open JSON Checklist";
  openLabel.classList.add("button-like");

  const loadJsonInput = document.createElement("input");
  loadJsonInput.type = "file";
  loadJsonInput.accept = ".json";
  loadJsonInput.style.display = "none";
  loadJsonInput.onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const loadedData = JSON.parse(String(event.target.result || "{}"));
      // Load as “one-shot session”
      renderChecklistFromData(loadedData);
    };
    reader.readAsText(f);
  };

  openLabel.appendChild(loadJsonInput);
  buttonRow.appendChild(openLabel);
  container.appendChild(buttonRow);

  // ===== Render sections (single or all) =====
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
    title.textContent = sectionObj.section;
    sectionDiv.appendChild(title);

    sectionObj.items.forEach((item, itemIndex) => {
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
        <strong>${escapeHtml(item.test)}</strong><br>
        ${expectedHtml}
        ${detailsHtml}
      `;
      row.appendChild(label);

      const desc = document.createElement("textarea");
      desc.classList.add("description-field");
      desc.placeholder = "Optional scenario or setup steps";
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

  // ===== Save buttons =====
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "💾 Save Checklist Report (Markdown)";
  saveBtn.onclick = () => {
    persistUiToSession();
    saveStructuredChecklist();
  };
  container.appendChild(saveBtn);

  const saveJsonBtn = document.createElement("button");
  saveJsonBtn.textContent = "🗄 Save Checklist as JSON";
  saveJsonBtn.onclick = () => {
    persistUiToSession();
    saveChecklistAsJSON();
  };
  container.appendChild(saveJsonBtn);
}

function persistUiToSession() {
  const session = window.__cgoChecklistSession;
  if (!session) return;

  // meta
  session.meta = {
    title: document.getElementById("meta-title")?.value || session.meta.title || "",
    date: document.getElementById("meta-date")?.value || session.meta.date || "",
    tester: document.getElementById("meta-tester")?.value || session.meta.tester || "",
    device: document.getElementById("meta-device")?.value || session.meta.device || "",
    androidVersion: document.getElementById("meta-android")?.value || session.meta.androidVersion || "",
    appVersion: document.getElementById("meta-app")?.value || session.meta.appVersion || "",
    buildVariant: document.getElementById("meta-build")?.value || session.meta.buildVariant || ""
  };

  // items (only the sections currently rendered are in DOM)
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


export function saveChecklistAsJSON() {
  const session = window.__cgoChecklistSession;
  if (!session) throw new Error("No checklist session loaded");

  const full = {
    meta: session.meta,
    sections: session.sections
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
  const session = window.__cgoChecklistSession;
  if (!session) throw new Error("No checklist session loaded");

  const meta = session.meta || {};
  const title = meta.title || "Checklist";

  const lines = [
    `# ${title}\n`,
    `\n## Test Session`,
    `- **Date:** ${meta.date || ""}`,
    `- **Tester:** ${meta.tester || ""}`,
    `- **Device:** ${meta.device || ""}`,
    meta.androidVersion ? `- **Android Version:** ${meta.androidVersion}` : null,
    meta.appVersion ? `- **App Version:** ${meta.appVersion}` : null,
    meta.buildVariant ? `- **Build Variant:** ${meta.buildVariant}` : null,
    `\n---\n`
  ].filter(Boolean);

  session.sections.forEach((section) => {
    lines.push(`\n## ${section.section}`);

    section.items.forEach((it) => {
      const status = it.state || "Not marked";
      lines.push(`- **${it.test}** — ${status}${it.note ? `: ${it.note}` : ""}`);
      if (it.expected) lines.push(`  - _Expected:_ ${it.expected}`);
      if (it.details) lines.push(`  - _Details:_ ${it.details}`);
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


export function renderChecklistFromData(data) {
  const container = document.getElementById("content");
  if (!container) throw new Error("Missing #content container");
  container.innerHTML = "";

  // Keep behavior identical to your previous version:
  // create a blob URL and reload via loadStructuredChecklist(url)
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  loadStructuredChecklist(url);
}

export function loadChecklist() {
  loadStructuredChecklist();
}

/**
 * Optional: keep backward compatibility with any inline onclick="loadChecklist()"
 * by attaching functions to window.
 */
export function registerChecklistGlobals() {
  window.escapeHtml = escapeHtml;
  window.loadStructuredChecklist = loadStructuredChecklist;
  window.saveChecklistAsJSON = saveChecklistAsJSON;
  window.saveStructuredChecklist = saveStructuredChecklist;
  window.renderChecklistFromData = renderChecklistFromData;
  window.loadChecklist = loadChecklist;
}
