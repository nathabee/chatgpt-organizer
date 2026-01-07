// src/background/util/urls.ts

import { getApiConfigSnapshot } from "./apiConfig";
import type { AnyRequest } from "../../shared/messages";

export function isTargetUrl(url?: string): boolean {
  const { origin } = getApiConfigSnapshot();
  return !!url && url.startsWith(origin + "/");
}

export async function getActiveTargetTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !isTargetUrl(tab.url)) return null;
  return tab;
}

export async function sendToTab<TReq extends AnyRequest, TRes>(tabId: number, msg: TReq): Promise<TRes> {
  return (await chrome.tabs.sendMessage(tabId, msg)) as TRes;
}


export function safePathFromUrl(u: string): string {
  try {
    const x = new URL(u);
    return x.pathname + (x.search ? x.search : "");
  } catch {
    return u;
  }
}
