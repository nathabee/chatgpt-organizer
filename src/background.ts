// src/background.ts
import { MSG, type AnyRequest } from "./shared/messages";
import type { ConversationItem, ProjectItem } from "./shared/types";


/* -----------------------------------------------------------
 * open panel
 * ----------------------------------------------------------- */
// Open the side panel when the user clicks the extension icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {
    // ignore if not supported (older Chrome)
  });


/* -----------------------------------------------------------
 * URL / time helpers
 * ----------------------------------------------------------- */

function isChatGPTUrl(url?: string): boolean {
  return !!url && url.startsWith("https://chatgpt.com/");
}

async function getActiveChatGPTTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !isChatGPTUrl(tab.url)) return null;
  return tab;
}

async function sendToTab<TReq extends AnyRequest, TRes>(
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
 * Session
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

async function fetchJsonAuthed<T>(url: string, accessToken: string): Promise<T> {
  const resp = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt || `HTTP ${resp.status}`);
  }

  return (await resp.json()) as T;
}

/* -----------------------------------------------------------
 * Delete helpers (kept)
 * ----------------------------------------------------------- */

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

async function deleteWithRetry(
  accessToken: string,
  id: string,
  throttleMs: number
): Promise<{ ok: boolean; status?: number; error?: string; attempt: number; lastOpMs: number }> {
  const maxAttempts = 3;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    const t0 = nowMs();
    const r = await deleteConversation(accessToken, id);
    const lastOpMs = nowMs() - t0;

    if (r.ok) return { ...r, attempt, lastOpMs };

    const status = r.status;
    const is429 = status === 429;
    const is5xx = typeof status === "number" && status >= 500 && status <= 599;
    const isNetworkish = !status && !!r.error;

    const canRetry =
      (is429 && attempt < maxAttempts) ||
      (is5xx && attempt < 2) ||
      (isNetworkish && attempt < 2);

    if (!canRetry) return { ...r, attempt, lastOpMs };

    let backoffMs = throttleMs;
    if (is429) backoffMs = randInt(5000, 15000);
    else if (is5xx) backoffMs = randInt(2000, 5000);
    else if (isNetworkish) backoffMs = randInt(1000, 3000);

    backoffMs += randInt(0, 400);

    await sleep(backoffMs);
    attempt++;
  }

  return { ok: false, error: "Retry loop exhausted", attempt: maxAttempts, lastOpMs: 0 };
}

async function deleteProject(
  accessToken: string,
  gizmoId: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const resp = await fetch(`https://chatgpt.com/backend-api/gizmos/${encodeURIComponent(gizmoId)}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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
 * Mapping helpers
 * ----------------------------------------------------------- */

function normalizeChatHref(id: string): string {
  return `https://chatgpt.com/c/${id}`;
}

function convoFromApiRow(row: any, gizmoId: string | null): ConversationItem | null {
  const id = String(row?.id || "");
  if (!id) return null;

  const title = String(row?.title || "").trim() || "Untitled";
  const createTime = row?.create_time ? String(row.create_time) : undefined;
  const updateTime = row?.update_time ? String(row.update_time) : undefined;

  return {
    id,
    title,
    href: normalizeChatHref(id),
    gizmoId,
    createTime,
    updateTime,
  };
}

/* -----------------------------------------------------------
 * API: list all chats (includes project chats too, but we keep gizmoId=null here)
 * ----------------------------------------------------------- */

async function listAllChatsBackend(args: {
  accessToken: string;
  limit: number;
  pageSize: number;
}): Promise<{ conversations: ConversationItem[]; total?: number }> {
  const { accessToken, limit, pageSize } = args;

  const collected = new Map<string, ConversationItem>();
  let offset = 0;
  let total: number | undefined;

  const t0 = nowMs();
  let safety = 0;

  while (collected.size < limit && safety < 200) {
    safety++;

    const pageLimit = Math.max(1, Math.min(100, pageSize));
    const url =
      `https://chatgpt.com/backend-api/conversations` +
      `?offset=${offset}` +
      `&limit=${pageLimit}` +
      `&order=updated` +
      `&is_archived=false` +
      `&is_starred=false`;

    const data = await fetchJsonAuthed<any>(url, accessToken);

    if (typeof data?.total === "number") total = data.total;

    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) break;

    for (const row of items) {
      const it = convoFromApiRow(row, null);
      if (!it) continue;
      collected.set(it.id, it);
      if (collected.size >= limit) break;
    }

    offset += items.length;

    chrome.runtime.sendMessage({
      type: MSG.LIST_ALL_CHATS_PROGRESS,
      found: collected.size,
      offset,
    });

    if (items.length < pageLimit) break;

    await sleep(90 + randInt(0, 120));
  }

  chrome.runtime.sendMessage({
    type: MSG.LIST_ALL_CHATS_DONE,
    total: collected.size,
    elapsedMs: nowMs() - t0,
  });

  return { conversations: Array.from(collected.values()), total };
}

/* -----------------------------------------------------------
 * API: list gizmo/projects from snorlax sidebar (paged)
 * ----------------------------------------------------------- */

async function fetchGizmosSnorlaxSidebarPaged(args: {
  accessToken: string;
  limitProjects: number;
  conversationsPerGizmo: number;
  ownedOnly: boolean;
}): Promise<Array<{ gizmoId: string; title: string; href: string }>> {
  const { accessToken, limitProjects, conversationsPerGizmo, ownedOnly } = args;

  const out: Array<{ gizmoId: string; title: string; href: string }> = [];
  let cursor: string | null = null;
  let safety = 0;

  while (out.length < limitProjects && safety < 80) {
    safety++;

    const url =
      `https://chatgpt.com/backend-api/gizmos/snorlax/sidebar` +
      `?conversations_per_gizmo=${encodeURIComponent(String(conversationsPerGizmo))}` +
      `&owned_only=${ownedOnly ? "true" : "false"}` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");

    const data = await fetchJsonAuthed<any>(url, accessToken);

    const items = Array.isArray(data?.items) ? data.items : [];
    for (const it of items) {
      const gizmo = it?.gizmo?.gizmo;
      const gizmoId = String(gizmo?.id || "");
      if (!gizmoId) continue;

      const title =
        String(gizmo?.display?.name || gizmo?.short_url || gizmoId).trim() || "Untitled";

      const shortUrl = String(gizmo?.short_url || "").trim();
      // Correct: /g/<short_url> is what chatgpt uses in the URL bar.
      // We do NOT pretend /g/<gizmoId>/project exists.
      const href = shortUrl ? `https://chatgpt.com/g/${shortUrl}` : `https://chatgpt.com/`;

      out.push({ gizmoId, title, href });
      if (out.length >= limitProjects) break;
    }

    const nextCursor = typeof data?.cursor === "string" ? data.cursor : null;
    if (!nextCursor) break;
    cursor = nextCursor;
  }

  // de-dupe by gizmoId
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.gizmoId) ? false : (seen.add(p.gizmoId), true)));
}

async function fetchGizmoConversationsPaged(args: {
  accessToken: string;
  gizmoId: string;
  limitConversations: number;
}): Promise<ConversationItem[]> {
  const { accessToken, gizmoId, limitConversations } = args;

  const convos = new Map<string, ConversationItem>();
  let cursor: string | null = null;
  let safety = 0;

  while (convos.size < limitConversations && safety < 120) {
    safety++;

    const url =
      `https://chatgpt.com/backend-api/gizmos/${encodeURIComponent(gizmoId)}/conversations` +
      (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "");

    const data = await fetchJsonAuthed<any>(url, accessToken);

    const items = Array.isArray(data?.items) ? data.items : [];
    for (const row of items) {
      const it = convoFromApiRow(row, gizmoId);
      if (!it) continue;
      convos.set(it.id, it);
      if (convos.size >= limitConversations) break;
    }

    const next = typeof data?.cursor === "string" ? data.cursor : null;
    if (!next || next === cursor) break;
    cursor = next;

    if (!items.length) break;

    await sleep(90 + randInt(0, 120));
  }

  return Array.from(convos.values());
}

async function listGizmoProjectsWithConversations(args: {
  accessToken: string;
  limitProjects: number;
  conversationsPerGizmo: number;
  perProjectLimit: number;
}): Promise<ProjectItem[]> {
  const { accessToken, limitProjects, conversationsPerGizmo, perProjectLimit } = args;

  const gizmos = await fetchGizmosSnorlaxSidebarPaged({
    accessToken,
    limitProjects,
    conversationsPerGizmo,
    ownedOnly: true,
  });

  const projects: ProjectItem[] = [];
  let totalConversations = 0;
  const t0 = nowMs();

  for (let i = 0; i < gizmos.length; i++) {
    const g = gizmos[i];

    const conversations = await fetchGizmoConversationsPaged({
      accessToken,
      gizmoId: g.gizmoId,
      limitConversations: perProjectLimit,
    });

    totalConversations += conversations.length;

    projects.push({
      gizmoId: g.gizmoId,
      title: g.title,
      href: g.href,
      conversations,
    });

    chrome.runtime.sendMessage({
      type: MSG.LIST_GIZMO_PROJECTS_PROGRESS,
      foundProjects: i + 1,
      totalProjects: gizmos.length,
      foundConversations: totalConversations,
    });

    await sleep(120 + randInt(0, 180));
  }

  chrome.runtime.sendMessage({
    type: MSG.LIST_GIZMO_PROJECTS_DONE,
    totalProjects: projects.length,
    totalConversations,
    elapsedMs: nowMs() - t0,
  });

  return projects;
}

/* -----------------------------------------------------------
 * Guards
 * ----------------------------------------------------------- */

let executeRunning = false;
let listChatsRunning = false;
let listProjectsRunning = false;

/* -----------------------------------------------------------
 * Message handler
 * ----------------------------------------------------------- */

chrome.runtime.onMessage.addListener((msg: AnyRequest, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === MSG.PING) {
      sendResponse({ ok: true });
      return;
    }

    // LIST ALL CHATS (backend)
    if (msg?.type === MSG.LIST_ALL_CHATS) {
      if (listChatsRunning) {
        sendResponse({ ok: false, error: "A chat listing is already running." } as any);
        return;
      }
      listChatsRunning = true;

      try {
        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          sendResponse({ ok: false, error: "Not logged in (no access token)." } as any);
          return;
        }

        const limit = Math.max(1, Math.min(50000, Number((msg as any).limit ?? 50)));
        const pageSize = Math.max(1, Math.min(100, Number((msg as any).pageSize ?? 50)));

        const { conversations, total } = await listAllChatsBackend({
          accessToken: session.accessToken,
          limit,
          pageSize,
        });

        sendResponse({ ok: true, conversations, total } as any);
        return;
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || "Failed to list chats." } as any);
        return;
      } finally {
        listChatsRunning = false;
      }
    }

    // LIST PROJECTS (backend)
    if (msg?.type === MSG.LIST_GIZMO_PROJECTS) {
      if (listProjectsRunning) {
        sendResponse({ ok: false, error: "A projects listing is already running." } as any);
        return;
      }
      listProjectsRunning = true;

      try {
        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          sendResponse({ ok: false, error: "Not logged in (no access token)." } as any);
          return;
        }

        const limitProjects = Math.max(1, Math.min(5000, Number((msg as any).limit ?? 50)));
        const conversationsPerGizmo = Math.max(
          1,
          Math.min(50, Number((msg as any).conversationsPerGizmo ?? 5))
        );
        const perProjectLimit = Math.max(1, Math.min(50000, Number((msg as any).perProjectLimit ?? 5000)));

        const projects = await listGizmoProjectsWithConversations({
          accessToken: session.accessToken,
          limitProjects,
          conversationsPerGizmo,
          perProjectLimit,
        });

        sendResponse({ ok: true, projects } as any);
        return;
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || "Failed to list projects." } as any);
        return;
      } finally {
        listProjectsRunning = false;
      }
    }

    // EXECUTE DELETE (unchanged)
    if (msg?.type === MSG.EXECUTE_DELETE) {
      const ids: string[] = (msg as any).ids || [];
      const clean = ids.filter(Boolean);

      if (!clean.length) {
        sendResponse({ ok: false, error: "No ids provided." } as any);
        return;
      }

      if (executeRunning) {
        sendResponse({ ok: false, error: "An execute delete is already running." } as any);
        return;
      }
      executeRunning = true;

      const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const startedAt = nowMs();

      try {
        const throttleMs = Math.max(150, Math.min(5000, Number((msg as any).throttleMs ?? 600)));

        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          chrome.runtime.sendMessage({
            type: MSG.EXECUTE_DELETE_DONE,
            runId,
            total: clean.length,
            okCount: 0,
            failCount: clean.length,
            elapsedMs: nowMs() - startedAt,
            throttleMs,
          });

          sendResponse({
            ok: true,
            loggedIn: false,
            meHint: session.meHint,
            note: "Not logged in (or access token not available).",
            throttleMs,
            results: clean.map((id: string) => ({ id, ok: false, error: "Not logged in" })),
          } as any);
          return;
        }

        const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];
        let okCount = 0;
        let failCount = 0;

        for (let idx = 0; idx < clean.length; idx++) {
          const id = clean[idx];

          if (idx > 0) {
            const jitter = randInt(0, 300);
            await sleep(throttleMs + jitter);
          }

          const r = await deleteWithRetry(session.accessToken, id, throttleMs);
          results.push({ id, ok: r.ok, status: r.status, error: r.error });

          if (r.ok) okCount++;
          else failCount++;

          chrome.runtime.sendMessage({
            type: MSG.EXECUTE_DELETE_PROGRESS,
            runId,
            i: idx + 1,
            total: clean.length,
            id,
            ok: r.ok,
            status: r.status,
            error: r.error,
            attempt: r.attempt,
            elapsedMs: nowMs() - startedAt,
            lastOpMs: r.lastOpMs,
          });
        }

        chrome.runtime.sendMessage({
          type: MSG.EXECUTE_DELETE_DONE,
          runId,
          total: clean.length,
          okCount,
          failCount,
          elapsedMs: nowMs() - startedAt,
          throttleMs,
        });

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

    // DELETE PROJECTS
    if (msg?.type === MSG.DELETE_PROJECTS) {
      const gizmoIds: string[] = ((msg as any).gizmoIds || []).filter(Boolean);

      if (!gizmoIds.length) {
        sendResponse({ ok: false, error: "No gizmoIds provided." } as any);
        return;
      }

      try {
        const session = await fetchSession();
        if (!session.loggedIn || !session.accessToken) {
          sendResponse({ ok: false, error: "Not logged in (no access token)." } as any);
          return;
        }

        const results: Array<{ gizmoId: string; ok: boolean; status?: number; error?: string }> = [];

        for (let i = 0; i < gizmoIds.length; i++) {
          const gizmoId = gizmoIds[i];

          // small polite delay between deletes (avoid bursts)
          if (i > 0) await sleep(250 + randInt(0, 250));

          const r = await deleteProject(session.accessToken, gizmoId);
          results.push({ gizmoId, ok: r.ok, status: r.status, error: r.error });
        }

        sendResponse({ ok: true, results } as any);
        return;
      } catch (e: any) {
        sendResponse({ ok: false, error: e?.message || "Failed to delete projects." } as any);
        return;
      }
    }

    // optional: still route to content script for anything else you kept
    const tab = await getActiveChatGPTTab();
    if (tab?.id) {
      try {
        const res = await sendToTab(tab.id, msg as any);
        sendResponse(res as any);
        return;
      } catch {
        // fallthrough
      }
    }


    sendResponse({ ok: false, error: "Unknown message." } as any);
  })();

  return true;
});
