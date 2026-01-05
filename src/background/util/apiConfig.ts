// src/background/util/apiConfig.ts

import type { ApiConfig } from "../../shared/apiConfig";
import { API_CONFIG_KEY, DEFAULT_API_CONFIG } from "../../shared/apiConfig";

let cache: ApiConfig = { ...DEFAULT_API_CONFIG };
let loaded = false;
let loading: Promise<void> | null = null;

function cleanOrigin(x: any): string {
  const s = String(x || "").trim();
  // Basic normalization: strip trailing slash.
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function normalize(raw: any): ApiConfig {
  const origin = cleanOrigin(raw?.origin) || DEFAULT_API_CONFIG.origin;

  const pickPath = (k: keyof ApiConfig): string => {
    const v = raw?.[k];
    return typeof v === "string" && v.startsWith("/") ? v : (DEFAULT_API_CONFIG[k] as string);
  };

  return {
    origin,
    pathAuthSession: pickPath("pathAuthSession"),
    pathConversations: pickPath("pathConversations"),
    pathConversation: pickPath("pathConversation"),
    pathGizmosRoot: pickPath("pathGizmosRoot"),
    pathGizmosSidebar: pickPath("pathGizmosSidebar"),
    pathGizmoConversations: pickPath("pathGizmoConversations"),
    pathUiConversation: pickPath("pathUiConversation"),
    pathUiGizmo: pickPath("pathUiGizmo"),
  };
}

export async function ensureApiConfigLoaded(): Promise<void> {
  if (loaded) return;

  if (!loading) {
    loading = (async () => {
      if (
        typeof chrome === "undefined" ||
        !chrome?.storage?.local ||
        typeof chrome.storage.local.get !== "function"
      ) {
        loaded = true;
        return;
      }

      const obj = await chrome.storage.local.get(API_CONFIG_KEY);
      cache = normalize(obj?.[API_CONFIG_KEY]);
      loaded = true;
    })().finally(() => {
      loading = null;
    });
  }

  await loading;
}

export function getApiConfigSnapshot(): ApiConfig {
  return cache;
}

export async function getApiConfig(): Promise<ApiConfig> {
  await ensureApiConfigLoaded();
  return cache;
}

(function bindStorageListenerSafely() {
  try {
    if (
      typeof chrome === "undefined" ||
      !chrome?.storage?.onChanged ||
      typeof chrome.storage.onChanged.addListener !== "function"
    ) return;

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      const ch = changes[API_CONFIG_KEY];
      if (!ch) return;
      cache = normalize(ch.newValue);
      loaded = true;
    });
  } catch {
    // never crash SW at eval time
  }
})();
