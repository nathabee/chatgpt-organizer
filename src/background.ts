// src/background.ts
 
import { MSG, type AnyRequest, type AnyResponse } from "./shared/messages";

function isChatGPTUrl(url?: string): boolean {
  return !!url && url.startsWith("https://chatgpt.com/");
}

async function getActiveChatGPTTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !isChatGPTUrl(tab.url)) return null;
  return tab;
}

async function sendToTab<TReq extends AnyRequest, TRes extends AnyResponse>(
  tabId: number,
  msg: TReq
): Promise<TRes> {
  return await chrome.tabs.sendMessage(tabId, msg) as TRes;
}

chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === MSG.LIST_CONVERSATIONS) {
      const tab = await getActiveChatGPTTab();
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active chatgpt.com tab." });
        return;
      }

      try {
        const res = await sendToTab(tab.id, msg);
        sendResponse(res);
      } catch (e) {
        // Most common: content script not injected / tab not matching / needs reload
        sendResponse({
          ok: false,
          error:
            "Could not reach content script. Reload the ChatGPT tab, then try again."
        });
      }
      return;
    }

    if (msg?.type === MSG.PING) {
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message." });
  })();

  return true; // keep the message channel open for async
});
