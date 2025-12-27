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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

    const email = data?.user?.email as string | undefined;
    const name = data?.user?.name as string | undefined;
    const meHint = email || name;

    return { loggedIn: !!accessToken, accessToken, meHint };
  } catch {
    return { loggedIn: false };
  }
}

async function deleteConversation(accessToken: string, id: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const resp = await fetch(`https://chatgpt.com/backend-api/conversation/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ is_visible: false }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, error: txt || `HTTP ${resp.status}` };
    }

    return { ok: true, status: resp.status };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
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
      } catch {
        sendResponse({
          ok: false,
          error: "Could not reach content script. Reload the ChatGPT tab, then try again.",
        });
      }
      return;
    }

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

      const requests = ids.map((id) => ({
        method: "PATCH" as const,
        url: `https://chatgpt.com/backend-api/conversation/${id}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer <redacted>",
        },
        body: { is_visible: false },
      }));

      sendResponse({
        ok: true,
        loggedIn: true,
        meHint: session.meHint,
        note: "Dry-run only. Requests are prepared but NOT sent.",
        requests,
      });
      return;
    }

    // NEW: execute delete
    if (msg?.type === MSG.EXECUTE_DELETE) {
      const ids = (msg.ids || []).filter(Boolean);
      if (!ids.length) {
        sendResponse({ ok: false, error: "No ids provided." });
        return;
      }

      const throttleMs = Math.max(150, Math.min(5000, Number(msg.throttleMs ?? 600)));

      const session = await fetchSession();
      if (!session.loggedIn || !session.accessToken) {
        sendResponse({
          ok: true,
          loggedIn: false,
          meHint: session.meHint,
          note: "Not logged in (or access token not available).",
          throttleMs,
          results: ids.map((id) => ({ id, ok: false, error: "Not logged in" })),
        });
        return;
      }

      const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const r = await deleteConversation(session.accessToken, id);
        results.push({ id, ...r });

        // throttle between requests (not after the last)
        if (i < ids.length - 1) await sleep(throttleMs);
      }

      sendResponse({
        ok: true,
        loggedIn: true,
        meHint: session.meHint,
        note: "Execute done. These are soft-deletes (visibility off). Refresh ChatGPT to confirm.",
        throttleMs,
        results,
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
