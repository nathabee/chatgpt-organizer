// src/background/util/apiUrls.ts

import { getApiConfigSnapshot } from "./apiConfig";

export function apiUrl(path: string): string {
  const { origin } = getApiConfigSnapshot();
  return origin + path;
}

export function apiPath(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(params[k] ?? ""));
}

export function apiAuthSessionUrl(): string {
  const { pathAuthSession } = getApiConfigSnapshot();
  return apiUrl(pathAuthSession);
}

export function apiConversationsUrl(query: Record<string, string | number | boolean | undefined>): string {
  const { pathConversations } = getApiConfigSnapshot();
  const u = new URL(apiUrl(pathConversations));
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export function apiConversationUrl(id: string): string {
  const { pathConversation } = getApiConfigSnapshot();
  return apiUrl(apiPath(pathConversation, { id }));
}

export function apiGizmosSidebarUrl(query: Record<string, string | number | boolean | undefined>): string {
  const { pathGizmosSidebar } = getApiConfigSnapshot();
  const u = new URL(apiUrl(pathGizmosSidebar));
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export function apiGizmoConversationsUrl(gizmoId: string, cursor?: string | null): string {
  const { pathGizmoConversations } = getApiConfigSnapshot();
  const base = apiUrl(apiPath(pathGizmoConversations, { id: gizmoId }));
  if (!cursor) return base;
  const u = new URL(base);
  u.searchParams.set("cursor", cursor);
  return u.toString();
}

export function uiConversationHref(id: string): string {
  const { origin, pathUiConversation } = getApiConfigSnapshot();
  return origin + apiPath(pathUiConversation, { id });
}

export function uiGizmoHref(shortUrl: string): string {
  const { origin, pathUiGizmo } = getApiConfigSnapshot();
  return origin + apiPath(pathUiGizmo, { shortUrl });
}
