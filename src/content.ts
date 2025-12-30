// src/content.ts
import { MSG, type AnyRequest } from "./shared/messages";

/**
 * v0.0.12
 * We no longer scrape sidebar DOM for listing chats or projects.
 * Content script stays minimal (kept for future features / ping).
 */

chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  if (msg?.type === MSG.PING) {
    sendResponse({ ok: true });
    return;
  }

  sendResponse({ ok: false, error: "No content-side handlers in v0.0.12." });
});
