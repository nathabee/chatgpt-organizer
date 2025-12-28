// src/background.ts

import { MSG, type AnyRequest, type AnyResponse } from "./shared/messages";

/* -----------------------------------------------------------
 * URL / tab helpers
 * ----------------------------------------------------------- */

function isChatGPTUrl(url?: string): boolean {
  // Keep strict to manifest (host_permissions only chatgpt.com)
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

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function nowMs(): number {
  return Date.now();
}

/* -----------------------------------------------------------
 * Session + delete helpers
 * ----------------------------------------------------------- */

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

async function deleteConversation(
  accessToken: string,
  id: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
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

/* -----------------------------------------------------------
 * NEW v0.0.7: retry/backoff wrapper for delete
 * ----------------------------------------------------------- */

async function deleteWithRetry(
  accessToken: string,
  id: string,
  throttleMs: number
): Promise<{ ok: boolean; status?: number; error?: string; attempt: number; lastOpMs: number }> {
  const maxAttempts = 3; // attempt 1 + retries
  let attempt = 1;

  while (attempt <= maxAttempts) {
    const t0 = nowMs();
    const r = await deleteConversation(accessToken, id);
    const lastOpMs = nowMs() - t0;

    if (r.ok) return { ...r, attempt, lastOpMs };

    const status = r.status;

    // Decide whether to retry
    const is429 = status === 429;
    const is5xx = typeof status === "number" && status >= 500 && status <= 599;
    const isNetworkish = !status && !!r.error;

    const canRetry =
      (is429 && attempt < maxAttempts) ||
      (is5xx && attempt < 2) || // retry once for 5xx
      (isNetworkish && attempt < 2); // retry once for network error

    if (!canRetry) return { ...r, attempt, lastOpMs };

    // Backoff strategy
    let backoffMs = throttleMs;

    if (is429) backoffMs = randInt(5000, 15000);
    else if (is5xx) backoffMs = randInt(2000, 5000);
    else if (isNetworkish) backoffMs = randInt(1000, 3000);

    // Add some jitter always
    backoffMs += randInt(0, 400);

    await sleep(backoffMs);
    attempt++;
  }

  // Shouldn't reach
  return { ok: false, error: "Retry loop exhausted", attempt: maxAttempts, lastOpMs: 0 };
}

/* -----------------------------------------------------------
 * Guards
 * ----------------------------------------------------------- */

let executeRunning = false;

/* -----------------------------------------------------------
 * Message handler
 * ----------------------------------------------------------- */

chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === MSG.PING) {
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === MSG.LIST_CONVERSATIONS) {
      const tab = await getActiveChatGPTTab();
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active ChatGPT tab (chatgpt.com)." });
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

    if (msg?.type === MSG.DEEP_SCAN_START || msg?.type === MSG.DEEP_SCAN_CANCEL) {
      const tab = await getActiveChatGPTTab();
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active ChatGPT tab (chatgpt.com)." });
        return;
      }

      try {
        const res = await sendToTab(tab.id, msg as any);
        sendResponse(res);
      } catch {
        // Deep scan cancel is best-effort
        if (msg?.type === MSG.DEEP_SCAN_CANCEL) sendResponse({ ok: true } as any);
        else
          sendResponse({
            ok: false,
            error: "Could not reach content script. Reload the ChatGPT tab, then try again.",
          } as any);
      }
      return;
    }

    if (msg?.type === MSG.DRY_RUN_DELETE) {
      const ids = (msg.ids || []).filter(Boolean);
      if (!ids.length) {
        sendResponse({ ok: false, error: "No ids provided." } as any);
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
        } as any);
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
      } as any);
      return;
    }

    /* -----------------------------------------------------------
     * EXECUTE DELETE (real) — NEW v0.0.7 progress events + retry/backoff
     * ----------------------------------------------------------- */
    if (msg?.type === MSG.EXECUTE_DELETE) {
      const ids = (msg.ids || []).filter(Boolean);
      if (!ids.length) {
        sendResponse({ ok: false, error: "No ids provided." } as any);
        return;
      }

      if (executeRunning) {
        sendResponse({ ok: false, error: "An execute delete is already running." } as any);
        return;
      }
      executeRunning = true;

      const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`; // NEW v0.0.7
      const startedAt = nowMs();

      try {
        const throttleMs = Math.max(150, Math.min(5000, Number(msg.throttleMs ?? 600)));

        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          // Emit DONE so UI can settle even if panel relies on events
          chrome.runtime.sendMessage({
            type: MSG.EXECUTE_DELETE_DONE,
            runId,
            total: ids.length,
            okCount: 0,
            failCount: ids.length,
            elapsedMs: nowMs() - startedAt,
            throttleMs,
          });

          sendResponse({
            ok: true,
            loggedIn: false,
            meHint: session.meHint,
            note: "Not logged in (or access token not available).",
            throttleMs,
            results: ids.map((id) => ({ id, ok: false, error: "Not logged in" })),
          } as any);
          return;
        }

        const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];

        let okCount = 0;
        let failCount = 0;

        for (let idx = 0; idx < ids.length; idx++) {
          const id = ids[idx];

          // Base throttle between operations (backend may still force slower)
          if (idx > 0) {
            const jitter = randInt(0, 300);
            await sleep(throttleMs + jitter);
          }

          const r = await deleteWithRetry(session.accessToken, id, throttleMs);
          const entry = { id, ok: r.ok, status: r.status, error: r.error };
          results.push(entry);

          if (r.ok) okCount++;
          else failCount++;

          // NEW v0.0.7: progress event after each id
          chrome.runtime.sendMessage({
            type: MSG.EXECUTE_DELETE_PROGRESS,
            runId,
            i: idx + 1,
            total: ids.length,
            id,
            ok: r.ok,
            status: r.status,
            error: r.error,
            attempt: r.attempt,
            elapsedMs: nowMs() - startedAt,
            lastOpMs: r.lastOpMs,
          });
        }

        // NEW v0.0.7: done event
        chrome.runtime.sendMessage({
          type: MSG.EXECUTE_DELETE_DONE,
          runId,
          total: ids.length,
          okCount,
          failCount,
          elapsedMs: nowMs() - startedAt,
          throttleMs,
        });

        // Keep final response (panel may ignore it, but useful for debugging)
        sendResponse({
          ok: true,
          loggedIn: true,
          meHint: session.meHint,
          note: "Execute done. These are soft-deletes (visibility off). Refresh ChatGPT to confirm.",
          throttleMs,
          results,
        } as any);
        return;
      } finally {
        executeRunning = false;
      }
    }

    // NEW v0.0.9 — LIST PROJECTS (route to content script)
    if (msg?.type === MSG.LIST_PROJECTS) {
      const tab = await getActiveChatGPTTab();
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active ChatGPT tab (chatgpt.com)." });
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


    // DEFAULT : ERROR 
    sendResponse({ ok: false, error: "Unknown message." } as any);
  })();

  return true;
});
