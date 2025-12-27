// src/background.ts


import { MSG, type AnyRequest, type AnyResponse } from "./shared/messages";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Opens the side panel for the current tab.
    await chrome.sidePanel.open({ tabId: tab.id });
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "panel/panel.html",
      enabled: true
    });
  } catch (e) {
    // If sidePanel is unsupported or fails, we just do nothing.
    console.warn("sidePanel.open failed:", e);
  }
});

// Panel -> Background -> Content (active tab)
chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === MSG.PING) {
      const res: AnyResponse = { ok: true };
      sendResponse(res);
      return;
    }

    if (msg?.type === MSG.LIST_CONVERSATIONS) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        sendResponse({ ok: true, conversations: [] } satisfies AnyResponse);
        return;
      }

      // Ask the content script to scrape conversations.
      const res = await chrome.tabs.sendMessage(tab.id, msg).catch(() => null);
      if (res && res.ok) {
        sendResponse(res as AnyResponse);
      } else {
        sendResponse({ ok: true, conversations: [] } satisfies AnyResponse);
      }
      return;
    }

    sendResponse({ ok: true } satisfies AnyResponse);
  })();

  return true; // keep the message channel open
});
