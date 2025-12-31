// src/background/util/url.ts


import type { AnyRequest } from "../../shared/messages";

export function isChatGPTUrl(url?: string): boolean {
  return !!url && url.startsWith("https://chatgpt.com/");
}

export async function getActiveChatGPTTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !isChatGPTUrl(tab.url)) return null;
  return tab;
}

export async function sendToTab<TReq extends AnyRequest, TRes>(
  tabId: number,
  msg: TReq
): Promise<TRes> {
  return (await chrome.tabs.sendMessage(tabId, msg)) as TRes;
}

export function normalizeChatHref(id: string): string {
  return `https://chatgpt.com/c/${id}`;
}
