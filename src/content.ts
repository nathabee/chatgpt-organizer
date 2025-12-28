// src/content.ts

import { MSG, type AnyRequest } from "./shared/messages";
import type { ConversationItem } from "./shared/types";

/* -----------------------------------------------------------
 * Utilities (unchanged)
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

/* -----------------------------------------------------------
 * Core scrape logic (unchanged, reused by deep scan)
 * ----------------------------------------------------------- */

function scrapeConversations(): ConversationItem[] {
  // ChatGPT conversations generally have URLs like /c/<uuid>
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]')
  );

  const items: ConversationItem[] = anchors
    .map((a) => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/c\/([a-zA-Z0-9-]+)/);
      if (!m) return null;

      const rawTitle =
        (a.textContent || "").trim() ||
        a.getAttribute("aria-label")?.trim() ||
        "Untitled";

      return {
        id: m[1],
        title: rawTitle.replace(/\s+/g, " ").slice(0, 140),
        href: normalizeHref(href)
      } satisfies ConversationItem;
    })
    .filter((x): x is ConversationItem => Boolean(x));

  return uniqBy(items, (i) => i.id);
}

/* -----------------------------------------------------------
 * NEW v0.0.6 — Deep scan state + helpers
 * ----------------------------------------------------------- */

let deepScanCancelRequested = false;

/**
 * Try to locate the scroll container that holds the conversation list.
 * This is intentionally heuristic-based to survive minor DOM changes.
 */
function findSidebarScrollContainer(): HTMLElement | null {
  // Common patterns observed in ChatGPT UI:
  // - nav / aside containers
  // - elements with overflow-y: auto and many /c/ links inside
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("nav, aside, div")
  );

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

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/* -----------------------------------------------------------
 * NEW v0.0.6 — Automatic deep scan (auto-scroll)
 * ----------------------------------------------------------- */

async function deepScanConversations(options?: {
  maxSteps?: number;
  stepDelayMs?: number;
  noNewLimit?: number;
}): Promise<ConversationItem[]> {
  const {
    maxSteps = 120,
    stepDelayMs = 350,
    noNewLimit = 10
  } = options || {};

  const container = findSidebarScrollContainer();
  if (!container) {
    throw new Error("Sidebar scroll container not found");
  }

  deepScanCancelRequested = false;

  const collected = new Map<string, ConversationItem>();

  let lastCount = 0;
  let noNewCounter = 0;

  // Save scroll position (best effort restore)
  const initialScrollTop = container.scrollTop;

  for (let step = 0; step < maxSteps; step++) {
    if (deepScanCancelRequested) break;

    // Scrape current DOM slice
    const items = scrapeConversations();
    for (const it of items) {
      collected.set(it.id, it);
    }

    // Progress update to panel
    chrome.runtime.sendMessage({
      type: MSG.DEEP_SCAN_PROGRESS,
      found: collected.size,
      step
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

  // Restore scroll position (best effort)
  try {
    container.scrollTop = initialScrollTop;
  } catch {
    /* ignore */
  }

  return Array.from(collected.values());
}

/* -----------------------------------------------------------
 * Message handling
 * ----------------------------------------------------------- */

chrome.runtime.onMessage.addListener(
  (msg: AnyRequest, _sender, sendResponse) => {
    // Quick scan (existing behavior)
    if (msg?.type === MSG.LIST_CONVERSATIONS) {
      const conversations = scrapeConversations();
      sendResponse({ ok: true, conversations });
      return true;
    }

    // NEW v0.0.6 — Start deep scan
    if (msg?.type === MSG.DEEP_SCAN_START) {
      deepScanConversations(msg.options)
        .then((conversations) => {
          sendResponse({ ok: true, conversations });
        })
        .catch((err) => {
          sendResponse({ ok: false, error: String(err) });
        });
      return true; // async
    }

    // NEW v0.0.6 — Cancel deep scan
    if (msg?.type === MSG.DEEP_SCAN_CANCEL) {
      deepScanCancelRequested = true;
      sendResponse({ ok: true });
      return true;
    }

    return false;
  }
);
