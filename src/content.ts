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

async function deepScanConversations(options?: {
  maxSteps?: number;
  stepDelayMs?: number;
  noNewLimit?: number;
}): Promise<ConversationItem[]> {
  const { maxSteps = 120, stepDelayMs = 350, noNewLimit = 10 } = options || {};

  const container = findSidebarScrollContainer();
  if (!container) throw new Error("Sidebar scroll container not found");

  deepScanCancelRequested = false;

  const collected = new Map<string, ConversationItem>();
  let lastCount = 0;
  let noNewCounter = 0;

  const initialScrollTop = container.scrollTop;

  for (let step = 0; step < maxSteps; step++) {
    if (deepScanCancelRequested) break;

    // Scrape current DOM slice
    const items = scrapeConversations();
    for (const it of items) collected.set(it.id, it);

    // Progress event back to panel (best-effort)
    chrome.runtime.sendMessage({
      type: MSG.DEEP_SCAN_PROGRESS,
      found: collected.size,
      step,
    });

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

/* -----------------------------------------------------------
 * NEW v0.0.9 — Projects scraping + auto-open "See more"
 * ----------------------------------------------------------- */

function parseProjectKeyFromHref(hrefAbs: string): string {
  try {
    const u = new URL(hrefAbs);
    const m = u.pathname.match(/\/g\/([^/]+)\/project$/);
    if (m) return m[1];
    return u.pathname.replace(/\W+/g, "_").slice(-80) || hrefAbs;
  } catch {
    return hrefAbs;
  }
}

function scrapeProjectsInRoot(root: ParentNode): ProjectItem[] {
  const projectLinks = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('a[data-sidebar-item="true"][href$="/project"]')
  );

  const projects: ProjectItem[] = [];

  for (const a of projectLinks) {
    const hrefAbs = normalizeHref(a.getAttribute("href") || "");
    if (!hrefAbs) continue;

    const titleEl = a.querySelector(".truncate");
    const title =
      (titleEl?.textContent || a.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 140) || "Untitled";

    // Conversations are often in the next sibling container
    const next = a.nextElementSibling;
    const convoAnchors = next
      ? Array.from(next.querySelectorAll<HTMLAnchorElement>('a[data-sidebar-item="true"][href*="/c/"]'))
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

function getProjectsSectionContainer(): Element | null {
  // Language-agnostic: find an expando section that contains /project links.
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div.group\\/sidebar-expando-section'));
  for (const c of candidates) {
    if (c.querySelector('a[data-sidebar-item="true"][href$="/project"]')) return c;
  }
  return null;
}

function findSeeMoreLikeTrigger(section: Element): HTMLElement | null {
  // Pick last closed menu trigger inside projects section.
  const triggers = Array.from(section.querySelectorAll<HTMLElement>('[aria-haspopup="menu"][data-state="closed"]'));
  if (!triggers.length) return null;
  return triggers[triggers.length - 1];
}

 

function getProjectsOverlayRoot(): HTMLElement | null {
  // Prefer explicit overlay roles first
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  if (dialog) return dialog;

  const menu = document.querySelector<HTMLElement>('[role="menu"]');
  if (menu) return menu;

  // Radix popper wrapper (common)
  const radix = document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper]');
  if (radix) return radix;

  // Fallback: find a "top-layer looking" element with many /project links.
  // Avoid scanning "body *" (too expensive). We look at direct children of body.
  const bodyKids = Array.from(document.body.children) as HTMLElement[];
  const rich = bodyKids
    .map((el) => ({
      el,
      n: el.querySelectorAll?.('a[href$="/project"]').length ?? 0,
    }))
    .filter((x) => x.n >= 6)
    .sort((a, b) => b.n - a.n);

  if (rich[0]?.el) return rich[0].el;

  // Last resort: nothing obvious
  return null;
}

function overlayLooksOpen(): boolean {
  const root = getProjectsOverlayRoot();
  if (!root) return false;

  // If overlay is open, it usually contains a project list > 5.
  const n = root.querySelectorAll('a[href$="/project"]').length;
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

function fireTrustedClick(el: HTMLElement) {
  // Some UI libraries behave better with a pointer-style sequence.
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

async function openAllProjectsOverlayBestEffort(): Promise<{ opened: boolean; note?: string }> {
  // Already open? do nothing.
  if (overlayLooksOpen()) return { opened: true };

  const section = getProjectsSectionContainer();
  if (!section) return { opened: false, note: "Projects section not found in sidebar DOM." };

  const trigger = findSeeMoreLikeTrigger(section);
  if (!trigger) return { opened: false, note: "No 'See more' trigger detected (structure-based)." };

  // Click without focusing something else
  fireTrustedClick(trigger);

  const ok = await waitForOverlayOpen(8000);
  if (!ok) return { opened: false, note: "Tried to open full project list, but no overlay detected (timeout)." };

  return { opened: true };
}

function scrapeProjectsFromOverlay(root: ParentNode): ProjectItem[] {
  // Overlay list items may not have data-sidebar-item.
  // We accept any /g/.../project link.
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href$="/project"]')).filter((a) => {
    const href = a.getAttribute("href") || "";
    return href.includes("/g/") && href.endsWith("/project");
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

  // Sidebar first (gives you nested conversations for the first 5)
  const sidebar = scrapeProjectsInRoot(document);

  if (!openAll) return { projects: sidebar };

  const r = await openAllProjectsOverlayBestEffort();
  if (r.note) note = r.note;

  const overlayRoot = getProjectsOverlayRoot();
  const overlay = overlayRoot ? scrapeProjectsFromOverlay(overlayRoot) : [];

  // Merge: prefer sidebar version (it includes conversations)
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

    sendResponse({ ok: false, error: "Unknown message (content)." });
  })();

  return true; // async
});
