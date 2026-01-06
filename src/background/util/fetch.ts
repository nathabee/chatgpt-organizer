// src/background/util/fetch.ts


import * as debugTrace from "../../shared/debugTrace";
import { ensureDevConfigLoaded, getDevConfigSnapshot } from "./devConfig";
import { ensureApiConfigLoaded, getApiConfigSnapshot } from "./apiConfig";

function safePath(u: string) {
  try {
    const x = new URL(u);
    return x.pathname + (x.search || "");
  } catch {
    return u;
  }
}

export function safePathFromUrl(u: string): string {
  try {
    const x = new URL(u);
    return x.pathname + (x.search ? x.search : "");
  } catch {
    return u;
  }
}


 

export async function tracedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : (input as any)?.toString?.() || String(input);

  await ensureDevConfigLoaded();
  await ensureApiConfigLoaded();

  const { traceScope } = getDevConfigSnapshot();

  // console tracing (optional)
  if (traceScope) {
    const cfg = getApiConfigSnapshot();
    console.log("[CGO][api]", {
      origin: cfg.origin,
      method: init?.method || "GET",
      url: safePath(url),
    });
  }

  // persisted debug trace (optional)
  const debugOn = await debugTrace.isEnabled().catch(() => false);
  if (debugOn) {
    const cfg = getApiConfigSnapshot();
    await debugTrace
      .append([
        {
          scope: "background",
          kind: "debug",
          message: `HTTP ${init?.method || "GET"} ${safePath(url)}`,
          ok: true,
          meta: { origin: cfg.origin },
        },
      ])
      .catch(() => {});
  }

  return fetch(url, init);
}
