// src/background/util/devConfig.ts
import type { DevConfig } from "../../shared/devConfig";
import { DEV_CONFIG_KEY, DEFAULT_DEV_CONFIG } from "../../shared/devConfig";

let cache: DevConfig = { ...DEFAULT_DEV_CONFIG };
let loaded = false;
let loading: Promise<void> | null = null;

function normalize(raw: any): DevConfig {
  const stop =
    typeof raw?.stopAfterOutOfScopeProjects === "number" && raw.stopAfterOutOfScopeProjects >= 0
      ? Math.floor(raw.stopAfterOutOfScopeProjects)
      : DEFAULT_DEV_CONFIG.stopAfterOutOfScopeProjects;

  return {
    traceScope: !!raw?.traceScope,
    stopAfterOutOfScopeProjects: stop,
  };
}

/**
 * Ensure cache is loaded at least once.
 * Safe to call many times; only hits storage once per SW lifetime.
 */
export async function ensureDevConfigLoaded(): Promise<void> {
  if (loaded) return;

  if (!loading) {
    loading = (async () => {
      // If chrome/storage is unavailable for any reason, keep defaults.
      if (
        typeof chrome === "undefined" ||
        !chrome?.storage?.local ||
        typeof chrome.storage.local.get !== "function"
      ) {
        loaded = true;
        return;
      }

      const obj = await chrome.storage.local.get(DEV_CONFIG_KEY);
      cache = normalize(obj?.[DEV_CONFIG_KEY]);
      loaded = true;
    })().finally(() => {
      loading = null;
    });
  }

  await loading;
}

/**
 * Fast snapshot (sync). Returns defaults until the first load finishes.
 */
export function getDevConfigSnapshot(): DevConfig {
  return cache;
}

/**
 * Preferred getter (async) that guarantees at least one load.
 * After first load, returns instantly from memory.
 */
export async function getDevConfig(): Promise<DevConfig> {
  await ensureDevConfigLoaded();
  return cache;
}

// Keep cache in sync when UI writes new values.
// IMPORTANT: this MUST NOT crash at top-level evaluation.
(function bindStorageListenerSafely() {
  try {
    if (
      typeof chrome === "undefined" ||
      !chrome?.storage?.onChanged ||
      typeof chrome.storage.onChanged.addListener !== "function"
    ) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      const ch = changes[DEV_CONFIG_KEY];
      if (!ch) return;

      cache = normalize(ch.newValue);
      loaded = true;
    });
  } catch {
    // swallow: never crash service worker at eval time
  }
})();
