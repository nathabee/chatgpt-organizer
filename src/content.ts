// src/content.ts


import { MSG, type AnyRequest } from "./shared/messages";
import type { ConversationItem } from "./shared/types";

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

function scrapeConversations(): ConversationItem[] {
  // ChatGPT conversations generally have URLs like /c/<uuid>
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]'));

  const items: ConversationItem[] = anchors
    .map((a) => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/\/c\/([a-zA-Z0-9-]+)/);
      if (!m) return null;

      // Title heuristics: visible text or aria-label.
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

  // Deduplicate by id
  return uniqBy(items, (i) => i.id);
}

chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  if (msg?.type === MSG.LIST_CONVERSATIONS) {
    const conversations = scrapeConversations();
    sendResponse({ ok: true, conversations });
    return true;
  }
  return false;
});
