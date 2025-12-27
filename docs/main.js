// Load and render structured checklist JSON with metadata
// helper to avoid accidental HTML injection
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Load and render structured checklist JSON with metadata
async function loadStructuredChecklist(file = "App_Test_checklist.json") {
  const res = await fetch(file);
  const json = await res.json();

  console.log("Loaded JSON:", json);
  
  const meta = json.meta || {};
  const data = json.sections || json; // fallback if no meta wrapper

  console.log("Using data:", data);

  const container = document.getElementById("content");
  container.innerHTML = `<h2>✅ Interactive App Test Checklist</h2>`;

  // ====== Metadata Form ======
  const metaBox = document.createElement("div");
  metaBox.classList.add("meta-box");
  metaBox.innerHTML = `
    <h3>📝 Test Session Info</h3>
    <label>Date: <input type="date" id="meta-date" value="${meta.date || new Date().toISOString().split('T')[0]}"></label>
    <label>Tester: <input type="text" id="meta-tester" value="${meta.tester || ''}"></label>
    <label>Device: <input type="text" id="meta-device" value="${meta.device || ''}"></label>
    <label>Android Version: <input type="text" id="meta-android" value="${meta.androidVersion || ''}"></label>
    <label>App Version: <input type="text" id="meta-app" value="${meta.appVersion || ''}"></label>
    <label>Build Variant: <input type="text" id="meta-build" value="${meta.buildVariant || ''}"></label>
  `;
  container.appendChild(metaBox);

  // ====== Button Row ======
  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "1rem";
  buttonRow.style.marginBottom = "1.5rem";
  buttonRow.style.alignItems = "center";
  buttonRow.style.flexWrap = "wrap";

  const newChecklistBtn = document.createElement("button");
  newChecklistBtn.textContent = "🆕 New App Test Checklist";
  newChecklistBtn.onclick = () => loadStructuredChecklist("App_Test_checklist.json");
  buttonRow.appendChild(newChecklistBtn);

  const openLabel = document.createElement("label");
  openLabel.textContent = "📂 Open App JSON Checklist";
  openLabel.classList.add("button-like");

  const loadJsonInput = document.createElement("input");
  loadJsonInput.type = "file";
  loadJsonInput.accept = ".json";
  loadJsonInput.style.display = "none";
  loadJsonInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const loadedData = JSON.parse(event.target.result);
        renderChecklistFromData(loadedData);
      };
      reader.readAsText(file);
    }
  };

  openLabel.appendChild(loadJsonInput);
  buttonRow.appendChild(openLabel);
  container.appendChild(buttonRow);

  // ====== Checklist Rendering ======
  data.forEach((section, secIndex) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.classList.add("checklist-section");

    const title = document.createElement("h3");
    title.textContent = section.section;
    sectionDiv.appendChild(title);

    section.items.forEach((item, itemIndex) => {
      const row = document.createElement("div");
      row.classList.add("checklist-item");

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

      // 🔹 Optional description field (editable textarea)
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
      options.forEach(opt => {
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
      if (item.note) note.value = item.note;
      row.appendChild(note);

      sectionDiv.appendChild(row);
    });

    container.appendChild(sectionDiv);
  });

  // ====== Save Buttons ======
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "💾 Save Checklist Report (Markdown)";
  saveBtn.onclick = saveStructuredChecklist;
  container.appendChild(saveBtn);

  const saveJsonBtn = document.createElement("button");
  saveJsonBtn.textContent = "🗄 Save Checklist as JSON";
  saveJsonBtn.onclick = saveChecklistAsJSON;
  container.appendChild(saveJsonBtn);
}

function getMetaFromFields() {
  return {
    date: document.getElementById("meta-date")?.value || "",
    tester: document.getElementById("meta-tester")?.value || "",
    device: document.getElementById("meta-device")?.value || "",
    androidVersion: document.getElementById("meta-android")?.value || "",
    appVersion: document.getElementById("meta-app")?.value || "",
    buildVariant: document.getElementById("meta-build")?.value || ""
  };
}

function saveChecklistAsJSON() {
  const meta = getMetaFromFields();
  const sections = document.querySelectorAll(".checklist-section");
  const structured = [];

  sections.forEach((section) => {
    const heading = section.querySelector("h3").textContent;
    const items = [];
    section.querySelectorAll(".checklist-item").forEach((item) => {
      const p = item.querySelector("p");
      const testText = p ? p.innerHTML.split("<br>")[0] : "";
      const expected = p?.querySelector(".expected")?.innerText || "";
      const details = p?.querySelector(".details")?.innerText || "";

      const selected = item.querySelector("input[type='radio']:checked");
      const note = item.querySelector(".note-field").value;
      const descField = item.querySelector(".description-field");

      items.push({
        test: testText.replace(/<[^>]+>/g, ""),
        expected,
        details,               // ✅ new field persisted
        description: descField?.value || "",
        state: selected ? selected.value : "",
        note: note || ""
      });
    });
    structured.push({ section: heading, items });
  });

  const full = { meta, sections: structured };
  const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `App_Test_Checklist_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}


function saveStructuredChecklist() {
  const meta = getMetaFromFields();
  const sections = document.querySelectorAll(".checklist-section");
  let lines = [
    `# App Test Checklist\n`,
    `\n## ️Test Session`,
    `- **Date:** ${meta.date}`,
    `- **Tester:** ${meta.tester}`,
    `- **Device:** ${meta.device}`,
    `- **Android Version:** ${meta.androidVersion}`,
    `- **App Version:** ${meta.appVersion}`,
    `- **Build Variant:** ${meta.buildVariant}`,
    `\n---\n`
  ];

  sections.forEach(section => {
    const heading = section.querySelector("h3").textContent;
    lines.push(`\n## ${heading}`);

    const items = section.querySelectorAll(".checklist-item");
    items.forEach(item => {
      const p = item.querySelector("p");
      const testLabel = p ? p.innerText.split("\n")[0] : "Untitled test";
      const expected = p?.querySelector(".expected")?.innerText || "";
      const details = p?.querySelector(".details")?.innerText || "";

      const selected = item.querySelector("input[type='radio']:checked");
      const note = item.querySelector(".note-field").value;
      const status = selected ? selected.value : "Not marked";

      lines.push(`- **${testLabel}** — ${status}${note ? `: ${note}` : ""}`);
      if (expected) lines.push(`  - _Expected:_ ${expected}`);
      if (details)  lines.push(`  - _Details:_ ${details}`);
    });
  });

  const content = lines.join("\n");
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `App_Test_Checklist_${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}


function renderChecklistFromData(data) {
  const container = document.getElementById("content");
  container.innerHTML = "";
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  loadStructuredChecklist(url);
}

function loadChecklist() {
  loadStructuredChecklist();
}

 

function scrollToContent() {
  const contentDiv = document.getElementById("content");
  contentDiv.scrollIntoView({ behavior: "smooth" });
}

async function loadMarkdown(filePath, anchor = "") {
  // Normalize to absolute URL within the site
  const url = new URL(filePath, window.location.href);

  const res = await fetch(url.pathname + url.search);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url.pathname}: ${res.status}`);
  }
  const md = await res.text();

  const container = document.getElementById("content");
  const html = marked.parse(md);
  container.innerHTML = `<div class="markdown">${html}</div>`;

  // Re-render mermaid diagrams
  if (window.mermaid) {
    const mermaidBlocks = container.querySelectorAll("code.language-mermaid");
    mermaidBlocks.forEach((block, index) => {
      const parent = block.closest("pre");
      const replacement = document.createElement("div");
      replacement.className = "mermaid";
      replacement.id = `mermaid-${index}`;
      replacement.textContent = block.textContent;
      parent.replaceWith(replacement);
      window.mermaid.init(undefined, `#${replacement.id}`);
    });
  }

  // If there's an anchor (either from the URL or link), scroll to it
  if (anchor) {
    // Strip leading '#'
    const id = anchor.replace(/^#/, "");
    const target =
      container.querySelector(`#${CSS.escape(id)}`) ||
      container.querySelector(`[name="${CSS.escape(id)}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  } else {
    scrollToContent();
  }
}

// Centralized navigation for .md links
function navigateToMd(href) {
  const url = new URL(href, window.location.href);

  // Only hijack same-origin .md links
  if (url.origin === window.location.origin && url.pathname.endsWith(".md")) {
    // Preserve any #anchor
    const anchor = url.hash || "";
    // Update history (use hash to avoid 404s on GH Pages deep links)
    const hash = `${url.pathname}${url.search}${anchor}`;
    history.pushState({ md: url.pathname, anchor }, "", `#${hash}`);
    loadMarkdown(url.pathname + url.search, anchor);
    return true; // handled
  }
  return false; // let the browser do its thing
}

document.addEventListener("DOMContentLoaded", () => {
  // 1) Intercept clicks in the TOC (.doc-list)
  document.querySelector(".doc-list")?.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    if (navigateToMd(a.getAttribute("href"))) {
      e.preventDefault();
    }
  });

  // 2) Intercept clicks inside rendered Markdown (#content)
  document.getElementById("content").addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;

    // Allow external links or non-md links to behave normally (open new tab if target=_blank)
    if (navigateToMd(href)) {
      e.preventDefault();
    }
  });

  // 3) On first load, if there is a hash that points to an .md, load it
  //    e.g. https://user.github.io/#/docs/intro.md#section
  if (location.hash) {
    // Remove leading '#' and optional leading '/'
    const raw = location.hash.replace(/^#\/?/, "");
    // Split path and anchor
    const [pathAndQuery, anchor = ""] = raw.split("#");
    // Only auto-load if looks like .md
    if (pathAndQuery.endsWith(".md")) {
      loadMarkdown(pathAndQuery, anchor ? `#${anchor}` : "");
      return;
    }
  }

  // Optional: load a default doc on first visit
 loadMarkdown("presentation.md");
});

// 4) Back/Forward support
window.addEventListener("popstate", (e) => {
  const state = e.state;
  if (state?.md) {
    loadMarkdown(state.md, state.anchor || "");
  } else if (location.hash) {
    const raw = location.hash.replace(/^#\/?/, "");
    const [pathAndQuery, anchor = ""] = raw.split("#");
    if (pathAndQuery.endsWith(".md")) {
      loadMarkdown(pathAndQuery, anchor ? `#${anchor}` : "");
    }
  }
});


document.getElementById("backToTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Optional: show button only after scrolling down
window.addEventListener("scroll", () => {
  const btn = document.getElementById("backToTop");
  if (window.scrollY > 200) {
    btn.style.display = "block";
  } else {
    btn.style.display = "none";
  }
});


