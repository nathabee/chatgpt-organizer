// src/content.ts

import { MSG, type AnyRequest } from "./shared/messages";
import type { ConversationItem, ProjectItem } from "./shared/types";

/* -----------------------------------------------------------
 * Utilities
 * ----------------------------------------------------------- */

function uniqBy<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function normalizeHref(href: string): string {
  try {
    const u = new URL(href, location.origin);
    return u.href;
  } catch {
    return href;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function fireTrustedClick(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

/* v0.0.11 */
async function withTimeout<T>(ms: number, work: Promise<T>): Promise<T> {
  let t: number | undefined;
  const timeout = new Promise<never>((_, rej) => {
    t = window.setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (t) window.clearTimeout(t);
  }
}

/* v0.0.11 */
function jitter(ms: number, spread = 180): number {
  return ms + Math.floor(Math.random() * spread);
}

/* v0.0.11 */
function findProjectAnchorByHref(hrefAbs: string): HTMLAnchorElement | null {
  const rel = (() => {
    try {
      const u = new URL(hrefAbs);
      return u.pathname;
    } catch {
      return null;
    }
  })();

  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[data-sidebar-item="true"][href^="/g/"][href$="/project"]')
  );

  // Prefer absolute match (rare in DOM), then relative path match
  for (const a of anchors) {
    const h = a.getAttribute("href") || "";
    if (normalizeHref(h) === hrefAbs) return a;
    if (rel && h === rel) return a;
  }

  return null;
}

async function expandAllVisibleProjectsInSection(section: Element): Promise<number> {
  // Expand chevron is "button.icon" inside the project anchor
  const projectAnchors = Array.from(
    section.querySelectorAll<HTMLAnchorElement>(
      'a[data-sidebar-item="true"][href^="/g/"][href$="/project"]'
    )
  );

  let clicked = 0;

  for (const a of projectAnchors) {
    const btn = a.querySelector<HTMLButtonElement>('button.icon[data-state]');
    if (!btn) continue;

    const state = btn.getAttribute("data-state");
    if (state === "open") continue;

    fireTrustedClick(btn);
    clicked++;
    await sleep(120 + Math.random() * 120);
  }

  return clicked;
}


/* -----------------------------------------------------------
 * Conversation scraping (single source of truth)
 * ----------------------------------------------------------- */

function extractConversationFromAnchor(a: HTMLAnchorElement): ConversationItem | null {
  const href = a.getAttribute("href") || "";
  const m = href.match(/\/c\/([a-zA-Z0-9-]+)/); // works for /c/<id> and /g/.../c/<id>
  if (!m) return null;

  const rawTitle =
    (a.textContent || "").trim() ||
    a.getAttribute("aria-label")?.trim() ||
    "Untitled";

  return {
    id: m[1],
    title: rawTitle.replace(/\s+/g, " ").slice(0, 140),
    href: normalizeHref(href),
  };
}

function scrapeConversations(): ConversationItem[] {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]'));
  const items = anchors
    .map(extractConversationFromAnchor)
    .filter((x): x is ConversationItem => Boolean(x));
  return uniqBy(items, (i) => i.id);
}

/* -----------------------------------------------------------
 * NEW v0.0.6 — Deep scan (auto-scroll)
 * ----------------------------------------------------------- */

let deepScanCancelRequested = false;
/* v0.0.11 */
let projectDeepScanCancelRequested = false;

/**
 * Heuristic: locate a scrollable container that contains /c/ links.
 * Important: We scroll the container, not the window.
 */
function findSidebarScrollContainer(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("nav, aside, div"));

  for (const el of candidates) {
    const style = getComputedStyle(el);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      el.querySelector('a[href*="/c/"]')
    ) {
      return el;
    }
  }
  return null;
}

/* v0.0.11 */
async function deepScanConversations(options?: {
  maxSteps?: number;
  stepDelayMs?: number;
  noNewLimit?: number;
  limit?: number; // stop once collected >= limit
}): Promise<ConversationItem[]> {
  const { maxSteps = 120, stepDelayMs = 350, noNewLimit = 10 } = options || {};

  const container = findSidebarScrollContainer();
  if (!container) throw new Error("Sidebar scroll container not found");

  deepScanCancelRequested = false;

  const collected = new Map<string, ConversationItem>();
  let lastCount = 0;
  let noNewCounter = 0;

  const initialScrollTop = container.scrollTop;
  /* v0.0.11 */
  const limit = Number.isFinite((options as any)?.limit) ? Number((options as any).limit) : 0;


  for (let step = 0; step < maxSteps; step++) {
    if (deepScanCancelRequested) break;

    const items = scrapeConversations();
    for (const it of items) collected.set(it.id, it);

    /* v0.0.11 */
    if (limit > 0 && collected.size >= limit) {
      chrome.runtime.sendMessage({ type: MSG.DEEP_SCAN_PROGRESS, found: collected.size, step });
      break;
    }

    chrome.runtime.sendMessage({ type: MSG.DEEP_SCAN_PROGRESS, found: collected.size, step });


    if (collected.size === lastCount) {
      noNewCounter++;
      if (noNewCounter >= noNewLimit) break;
    } else {
      noNewCounter = 0;
      lastCount = collected.size;
    }

    // Scroll down inside sidebar
    container.scrollTop += container.clientHeight * 0.9;

    // Wait for UI to load more items
    await sleep(stepDelayMs + Math.random() * 150);
  }

  // Restore scroll position (best-effort)
  try {
    container.scrollTop = initialScrollTop;
  } catch {
    /* ignore */
  }

  return Array.from(collected.values());
}

/* v0.0.11 */
async function scanOneProjectConversations(projectHrefAbs: string): Promise<ConversationItem[]> {
  const section = getProjectsSectionContainer();
  if (!section) return [];

  // Ensure visible projects expanded so nested lists exist where possible
  await expandAllVisibleProjectsInSection(section);

  const a = findProjectAnchorByHref(projectHrefAbs);
  if (!a) return [];

  // Click the project row to bring its context into view (best-effort)
  fireTrustedClick(a);

  // Give UI time to render / swap context
  await sleep(jitter(420));

  // Try expanding again after navigation
  await expandAllVisibleProjectsInSection(section);
  await sleep(120);

  // Re-scrape sidebar projects (now more likely to include nested convos)
  const sidebarProjects = scrapeProjectsInRoot(document);
  const found = sidebarProjects.find((p) => p.href === projectHrefAbs);

  return found?.conversations || [];
}


/* v0.0.11 */
async function deepScanProjectsLoop(options?: {
  limit?: number;
  perProjectTimeoutMs?: number;
  delayMs?: number;
}): Promise<{ projects: ProjectItem[]; note?: string; partial?: boolean }> {
  const limit = Math.max(1, Math.min(400, Number(options?.limit ?? 50)));
  const perProjectTimeoutMs = Math.max(3000, Math.min(60000, Number(options?.perProjectTimeoutMs ?? 12000)));
  const delayMs = Math.max(80, Math.min(5000, Number(options?.delayMs ?? 350)));

  projectDeepScanCancelRequested = false;

  // Step 1: get full project list from overlay
  const opened = await openAllProjectsOverlayBestEffort();
  const overlayRoot = getProjectsOverlayRoot();
  const overlayList = overlayRoot ? scrapeProjectsFromOverlay(overlayRoot) : [];

  const projectsToScan = overlayList.slice(0, limit);

  const out: ProjectItem[] = [];
  let convTotal = 0;

  for (let i = 0; i < projectsToScan.length; i++) {
    if (projectDeepScanCancelRequested) break;

    const p = projectsToScan[i];

    chrome.runtime.sendMessage({
      type: MSG.PROJECT_DEEP_SCAN_PROGRESS,
      projectIndex: i + 1,
      projectTotal: projectsToScan.length,
      conversationsFound: convTotal,
      step: `Scanning: ${p.title}`,
    });

    // Step 2: try to click/enter the project context and scrape nested convos (timeout protected)
    let conversations: ConversationItem[] = [];
    try {
      conversations = await withTimeout(
        perProjectTimeoutMs,
        scanOneProjectConversations(p.href)
      );
    } catch {
      conversations = [];
    }

    const merged: ProjectItem = {
      ...p,
      conversations: uniqBy(conversations, (c) => c.id),
    };

    out.push(merged);
    convTotal += merged.conversations.length;

    chrome.runtime.sendMessage({
      type: MSG.PROJECT_DEEP_SCAN_PROGRESS,
      projectIndex: i + 1,
      projectTotal: projectsToScan.length,
      conversationsFound: convTotal,
      step: `Done: ${p.title} (+${merged.conversations.length})`,
    });

    await sleep(jitter(delayMs));
  }

  const partial = projectDeepScanCancelRequested;

  return {
    projects: out,
    note: opened.note,
    partial,
  };
}

/* -----------------------------------------------------------
 * NEW v0.0.9 — Projects scraping + auto-open "See more"
 * ----------------------------------------------------------- */
/* v0.0.11 */
function parseProjectKeyFromHref(hrefAbs: string): string {
  try {
    const u = new URL(hrefAbs);
    const m = u.pathname.match(/\/g\/([^/]+)\/project/);
    if (m) return m[1];
    return u.pathname.replace(/\W+/g, "_").slice(-80) || hrefAbs;
  } catch {
    return hrefAbs;
  }
}


function scrapeProjectsInRoot(root: ParentNode): ProjectItem[] {
  // Only real project rows are anchors, not the "New project" div
  const projectLinks = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(
      'a[data-sidebar-item="true"][href^="/g/"][href$="/project"]'
    )
  );

  const projects: ProjectItem[] = [];

  for (const a of projectLinks) {
    const hrefAbs = normalizeHref(a.getAttribute("href") || "");
    if (!hrefAbs) continue;

    // Title is typically in ".truncate"
    const title =
      (a.querySelector(".truncate")?.textContent || a.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 140) || "Untitled";

    // Conversations live in next sibling container IF expanded
    const next = a.nextElementSibling as HTMLElement | null;

    const convoAnchors = next
      ? Array.from(
        next.querySelectorAll<HTMLAnchorElement>(
          'a[data-sidebar-item="true"][href^="/g/"][href*="/c/"]'
        )
      )
      : [];

    const conversations = uniqBy(
      convoAnchors
        .map(extractConversationFromAnchor)
        .filter((x): x is ConversationItem => Boolean(x)),
      (c) => c.id
    );

    projects.push({
      key: parseProjectKeyFromHref(hrefAbs),
      title,
      href: hrefAbs,
      conversations,
    });
  }

  return uniqBy(projects, (p) => p.href);
}

function getProjectsSectionContainer(): HTMLElement | null {
  // In ChatGPT sidebar, Projects is one "expando section"
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('div.group\\/sidebar-expando-section')
  );

  for (const sec of sections) {
    const label = sec.querySelector<HTMLElement>('h2.__menu-label');
    const labelText = (label?.textContent || "").trim().toLowerCase();

    // Prefer the real "Projects" section when possible
    if (labelText === "projects") return sec;

    // Fallback: any section that contains at least one /g/.../project anchor
    if (sec.querySelector('a[data-sidebar-item="true"][href^="/g/"][href$="/project"]')) return sec;
  }

  return null;
}



function findSeeMoreTrigger(section: Element): HTMLElement | null {
  // "See more" is a div.__menu-item.hoverable with aria-haspopup="menu"
  // and a nested ".truncate" containing the text.
  const labels = Array.from(section.querySelectorAll<HTMLElement>('div.__menu-item .truncate'));

  const seeMoreLabel = labels.find((el) => {
    const t = (el.textContent || "").trim().toLowerCase();
    return t === "see more";
  });

  return seeMoreLabel?.closest<HTMLElement>('div.__menu-item.hoverable[aria-haspopup="menu"]') || null;
}




/* v0.0.11 — robust overlay root detection (no role assumptions) */
function getProjectsOverlayRoot(): HTMLElement | null {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/g/"]')).filter((a) => {
    const href = a.getAttribute("href") || "";
    return href.includes("/project");
  });

  if (links.length < 6) return null;

  return bestOverlayContainerFromLinks(links);
}

/* v0.0.11 */
function bestOverlayContainerFromLinks(links: HTMLAnchorElement[]): HTMLElement | null {
  const scores = new Map<HTMLElement, number>();

  for (const a of links) {
    let el: HTMLElement | null = a;
    for (let i = 0; i < 12 && el; i++) {
      scores.set(el, (scores.get(el) || 0) + 1);
      el = el.parentElement;
    }
  }

  const candidates = Array.from(scores.entries())
    .map(([el, n]) => {
      const style = getComputedStyle(el);
      const pos = style.position;
      const z = Number(style.zIndex || 0);
      const rect = el.getBoundingClientRect();
      const area = Math.max(0, rect.width * rect.height);

      const overlayish = pos === "fixed" || pos === "absolute";
      return { el, n, overlayish, z, area };
    })
    .filter((x) => x.n >= 6)
    .sort((a, b) => {
      // prefer overlay-ish positioned containers
      if (a.overlayish !== b.overlayish) return a.overlayish ? -1 : 1;
      // then higher z-index if present
      if (b.z !== a.z) return b.z - a.z;
      // then more links
      if (b.n !== a.n) return b.n - a.n;
      // then larger area
      return b.area - a.area;
    });

  return candidates[0]?.el || null;
}



/* v0.0.11 */
function overlayLooksOpen(): boolean {
  const root = getProjectsOverlayRoot();
  if (!root) return false;
  const n = root.querySelectorAll('a[href*="/g/"]').length;
  return n >= 6;
}



async function waitForOverlayOpen(timeoutMs: number): Promise<boolean> {
  if (overlayLooksOpen()) return true;

  const start = Date.now();

  return await new Promise<boolean>((resolve) => {
    const tick = () => {
      if (overlayLooksOpen()) {
        obs.disconnect();
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        obs.disconnect();
        resolve(false);
      }
    };

    const obs = new MutationObserver(tick);
    obs.observe(document.documentElement, { childList: true, subtree: true });

    const t = window.setInterval(() => {
      tick();
      if (Date.now() - start > timeoutMs) window.clearInterval(t);
    }, 120);
  });
}



/* v0.0.11 */
async function openAllProjectsOverlayBestEffort(): Promise<{ opened: boolean; note?: string }> {
  if (overlayLooksOpen()) return { opened: true };

  const section = getProjectsSectionContainer();
  if (!section) return { opened: false, note: "Projects section not found in sidebar DOM." };

  const trigger = findSeeMoreTrigger(section);
  if (!trigger) return { opened: false, note: "No 'See more' item found in Projects section." };

  fireTrustedClick(trigger);

  // Try quickly a few times (overlay may be ephemeral)
  for (let i = 0; i < 6; i++) {
    if (overlayLooksOpen()) return { opened: true };
    await sleep(120);
  }

  // Fallback to observer wait
  const ok = await waitForOverlayOpen(8000);
  if (!ok) return { opened: false, note: "Clicked 'See more' but no overlay detected (timeout)." };

  return { opened: true };
}


function scrapeProjectsFromOverlay(root: ParentNode): ProjectItem[] {
  // Overlay list items may not have data-sidebar-item.
  /* v0.0.11 — overlay can have query params / not end with /project */
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="/g/"]')).filter((a) => {
    const href = a.getAttribute("href") || "";
    return href.includes("/project");
  });


  const projects: ProjectItem[] = [];

  for (const a of links) {
    const hrefAbs = normalizeHref(a.getAttribute("href") || "");
    if (!hrefAbs) continue;

    // Title is often in a nested .truncate or a span with dir=auto.
    const title =
      (a.querySelector(".truncate")?.textContent ||
        a.querySelector('span[dir="auto"]')?.textContent ||
        a.textContent ||
        a.getAttribute("aria-label") ||
        "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 140) || "Untitled";

    projects.push({
      key: parseProjectKeyFromHref(hrefAbs),
      title,
      href: hrefAbs,
      conversations: [],
    });
  }

  return uniqBy(projects, (p) => p.href);
}



async function scrapeProjects(openAll: boolean): Promise<{ projects: ProjectItem[]; note?: string }> {
  let note: string | undefined;

  const section = getProjectsSectionContainer();
  if (section) {
    // NEW: expand visible projects so we can scrape their nested conversations
    const n = await expandAllVisibleProjectsInSection(section);
    if (n > 0) await sleep(150);
  }

  // Sidebar scrape (now includes nested convos for expanded visible projects)
  const sidebar = scrapeProjectsInRoot(document);

  if (!openAll) return { projects: sidebar };

  // Best-effort open overlay to get full project list (no nested convos there)
  const r = await openAllProjectsOverlayBestEffort();
  if (r.note) note = r.note;

  const overlayRoot = getProjectsOverlayRoot();
  const overlay = overlayRoot ? scrapeProjectsFromOverlay(overlayRoot) : [];

  // Merge: prefer sidebar entries if same href (they include conversations)
  const merged = uniqBy([...sidebar, ...overlay], (p) => p.href);

  return { projects: merged, note };
}



/* -----------------------------------------------------------
 * Message handling
 * ----------------------------------------------------------- */

chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  (async () => {
    // Quick scan
    if (msg?.type === MSG.LIST_CONVERSATIONS) {
      const conversations = scrapeConversations();
      sendResponse({ ok: true, conversations });
      return;
    }

    // Deep scan start
    if (msg?.type === MSG.DEEP_SCAN_START) {
      try {
        const conversations = await deepScanConversations((msg as any).options);
        sendResponse({ ok: true, conversations });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
      return;
    }

    // Deep scan cancel
    if (msg?.type === MSG.DEEP_SCAN_CANCEL) {
      deepScanCancelRequested = true;
      sendResponse({ ok: true });
      return;
    }

    // Projects list (auto-open)
    if (msg?.type === MSG.LIST_PROJECTS) {
      try {
        const openAll = !!(msg as any).openAll;
        const { projects, note } = await scrapeProjects(openAll);
        sendResponse({ ok: true, projects, note });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
      return;
    }

    /* v0.0.11 — Project deep scan start */
    if (msg?.type === MSG.PROJECT_DEEP_SCAN_START) {
      try {
        const r = await deepScanProjectsLoop((msg as any).options);
        sendResponse({ ok: true, projects: r.projects, note: r.note, partial: r.partial });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
      return;
    }

    /* v0.0.11 — Project deep scan cancel */
    if (msg?.type === MSG.PROJECT_DEEP_SCAN_CANCEL) {
      projectDeepScanCancelRequested = true;
      sendResponse({ ok: true });
      return;
    }


    sendResponse({ ok: false, error: "Unknown message (content)." });
  })();

  return true; // async
});
