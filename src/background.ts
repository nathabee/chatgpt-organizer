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
  return (await chrome.tabs.sendMessage(tabId, msg)) as TRes;
}

async function fetchSession(): Promise<{ loggedIn: boolean; accessToken?: string; meHint?: string }> {
  try {
    const resp = await fetch("https://chatgpt.com/api/auth/session", {
      method: "GET",
      credentials: "include",
    });

    if (!resp.ok) return { loggedIn: false };

    const data = (await resp.json().catch(() => null)) as any;
    const accessToken = data?.accessToken as string | undefined;

    // The shape can vary; we keep this optional.
    const email = data?.user?.email as string | undefined;
    const name = data?.user?.name as string | undefined;
    const meHint = email || name;

    return { loggedIn: !!accessToken, accessToken, meHint };
  } catch {
    return { loggedIn: false };
  }
}

chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  (async () => {
    // Existing: list conversations (scraped by content script)
    if (msg?.type === MSG.LIST_CONVERSATIONS) {
      const tab = await getActiveChatGPTTab();
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active chatgpt.com tab." });
        return;
      }

      try {
        const res = await sendToTab(tab.id, msg);
        sendResponse(res);
      } catch {
        sendResponse({
          ok: false,
          error: "Could not reach content script. Reload the ChatGPT tab, then try again.",
        });
      }
      return;
    }

    // NEW: network-backed dry-run delete preview
    if (msg?.type === MSG.DRY_RUN_DELETE) {
      const ids = (msg.ids || []).filter(Boolean);
      if (!ids.length) {
        sendResponse({ ok: false, error: "No ids provided." });
        return;
      }

      const session = await fetchSession();
      if (!session.loggedIn || !session.accessToken) {
        sendResponse({
          ok: true,
          loggedIn: false,
          meHint: session.meHint,
          note: "Not logged in (or access token not available). Open chatgpt.com, ensure you are logged in, then retry.",
          requests: [],
        });
        return;
      }

      // Build the exact requests we WOULD send (but do not send them).
      // Based on widely observed behavior: PATCH conversation { is_visible: false }.
      const requests = ids.map((id) => ({
        method: "PATCH" as const,
        url: `https://chatgpt.com/backend-api/conversation/${id}`,
        headers: {
          "Content-Type": "application/json",
          // IMPORTANT: do not print the real token in UI logs. Keep redacted.
          Authorization: "Bearer <redacted>",
        },
        body: { is_visible: false },
      }));

      sendResponse({
        ok: true,
        loggedIn: true,
        meHint: session.meHint,
        note:
          "Dry-run only. Requests are prepared but NOT sent. Next step (v0.0.5): execute with throttling + confirmations.",
        requests,
      });
      return;
    }

    if (msg?.type === MSG.PING) {
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message." });
  })();

  return true;
});
