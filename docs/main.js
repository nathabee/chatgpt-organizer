// docs/main.js
import { registerChecklistGlobals } from "./checklist/checklist.js";

// Make checklist functions available globally (so existing buttons/handlers still work)
registerChecklistGlobals();

function scrollToContent() {
  const wrap = document.getElementById("contentWrap");
  if (!wrap) return;
  wrap.scrollTo({ top: 0, behavior: "smooth" });
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
    const anchor = url.hash || "";
    const hash = `${url.pathname}${url.search}${anchor}`;
    history.pushState({ md: url.pathname, anchor }, "", `#${hash}`);
    loadMarkdown(url.pathname + url.search, anchor);
    return true;
  }
  return false;
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

    if (navigateToMd(href)) {
      e.preventDefault();
    }
  });

  // 3) On first load, if there is a hash that points to an .md, load it
  if (location.hash) {
    const raw = location.hash.replace(/^#\/?/, "");
    const [pathAndQuery, anchor = ""] = raw.split("#");
    if (pathAndQuery.endsWith(".md")) {
      loadMarkdown(pathAndQuery, anchor ? `#${anchor}` : "");
      return;
    }
  }

  // Default doc on first visit
  loadMarkdown("user-manual.md");
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



document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("toggleDemo");
  const layout = document.querySelector(".layout");

  if (!btn || !layout) return;

  btn.addEventListener("click", () => {
    const collapsed = layout.classList.toggle("demo-collapsed");
    btn.textContent = collapsed ? "⤡" : "⤢";
    btn.title = collapsed ? "Expand demo" : "Collapse demo";
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const layout = document.querySelector(".layout");
  const btnSmaller = document.getElementById("demoSmaller");
  const btnBigger = document.getElementById("demoBigger");

  if (!layout || !btnSmaller || !btnBigger) return;

  // allowed sizes (left column)
  const sizes = ["0.5fr", "0.75fr", "1fr", "1.15fr", "1.3fr", "1.5fr"];
  let index = sizes.indexOf("1.15fr"); // default

  const apply = () => {
    layout.style.setProperty("--demo-col", sizes[index]);
  };

  btnSmaller.addEventListener("click", () => {
    if (index > 0) {
      index--;
      apply();
    }
  });

  btnBigger.addEventListener("click", () => {
    if (index < sizes.length - 1) {
      index++;
      apply();
    }
  });

  apply();
});
