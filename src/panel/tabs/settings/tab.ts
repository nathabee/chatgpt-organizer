// src/panel/tabs/settings/tab.ts

import type { AnyEvent } from "../../../shared/messages";
import * as actionLog from "../../../shared/actionLog";
import * as debugTrace from "../../../shared/debugTrace";

import type { Dom } from "../../app/dom";
import type { createBus } from "../../app/bus";
import { clampInt } from "../../app/format";
import { getBusy } from "../../app/state";
import { CGO_VERSION } from "../../../shared/version";
import { storageGet, storageSet } from "../../../shared/platform/storage";

import {
  ensureDevConfigLoaded,
  getDevConfigSnapshot,
  setDevConfig,
  resetDevConfigDefaults,
  DEV_CONFIG_DEFAULTS,
  type DevConfig as StoredDevConfig,
} from "../../../shared/devConfigStore";

import { API_CONFIG_KEY, DEFAULT_API_CONFIG, type ApiConfig } from "../../../shared/apiConfig";

import { createSettingsModel, type SettingsDevConfig } from "./model";
import { createSettingsView } from "./view";

type Bus = ReturnType<typeof createBus>;

const SHOW_DEV_TOOLS_KEY = "cgo.settings.showDevTools"; // boolean in storage

function safeStr(x: any, fallback = ""): string {
  return typeof x === "string" ? x : fallback;
}

function normalizeOrigin(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}`; // origin only, no trailing slash
  } catch {
    return "";
  }
}

async function loadApiConfig(): Promise<ApiConfig> {
  const res = await storageGet([API_CONFIG_KEY]).catch(() => ({} as any));
  const raw = (res as any)?.[API_CONFIG_KEY];
  const origin = normalizeOrigin(safeStr(raw?.origin, DEFAULT_API_CONFIG.origin)) || DEFAULT_API_CONFIG.origin;

  // Only origin is user-editable right now; keep all paths from defaults.
  return { ...DEFAULT_API_CONFIG, ...raw, origin };
}

async function saveApiOrigin(origin: string): Promise<void> {
  const current = await loadApiConfig();
  const next: ApiConfig = { ...current, origin };
  await storageSet({ [API_CONFIG_KEY]: next }).catch(() => null);
}

async function setDebugEnabled(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const any = debugTrace as any;
  if (typeof any.setEnabled === "function") {
    await any.setEnabled(enabled);
    return { ok: true };
  }
  if (typeof any.enable === "function" && typeof any.disable === "function") {
    await (enabled ? any.enable() : any.disable());
    return { ok: true };
  }
  return { ok: false, error: "debugTrace has no setEnabled/enable/disable API." };
}



function getManifestVersion(): string {
  try {
    const rt: any = (globalThis as any)?.chrome?.runtime;
    const m = rt?.getManifest?.();
    const v = typeof m?.version === "string" ? m.version : "";
    if (v) return v;
  } catch {
    // ignore
  }
  // Demo / non-extension fallback
  return CGO_VERSION || "";
}


function toSettingsDevConfig(s: StoredDevConfig): SettingsDevConfig {
  return {
    traceScope: !!s.traceScope,
    stopAfterOutOfScopeProjects: Number(s.stopAfterOutOfScopeProjects ?? DEV_CONFIG_DEFAULTS.stopAfterOutOfScopeProjects),

    actionLogMax: Number(s.actionLogMax ?? DEV_CONFIG_DEFAULTS.actionLogMax),
    debugTraceMax: Number(s.debugTraceMax ?? DEV_CONFIG_DEFAULTS.debugTraceMax),
    failureLogsPerRun: Number(s.failureLogsPerRun ?? DEV_CONFIG_DEFAULTS.failureLogsPerRun),
  };
}

function toStoredDevConfigFromInputs(dom: Dom): StoredDevConfig {
  return {
    traceScope: !!dom.cfgTraceScopeEl.checked,
    stopAfterOutOfScopeProjects: clampInt(
      dom.cfgStopAfterOutOfScopeEl.value,
      0,
      5000,
      DEV_CONFIG_DEFAULTS.stopAfterOutOfScopeProjects
    ),

    actionLogMax: clampInt(dom.cfgActionLogMaxEl.value, 100, 50000, DEV_CONFIG_DEFAULTS.actionLogMax),
    debugTraceMax: clampInt(dom.cfgDebugTraceMaxEl.value, 100, 50000, DEV_CONFIG_DEFAULTS.debugTraceMax),
    failureLogsPerRun: clampInt(dom.cfgFailureLogsPerRunEl.value, 0, 50000, DEV_CONFIG_DEFAULTS.failureLogsPerRun),
  };
}

export function createSettingsTab(dom: Dom, bus: Bus) {
  const model = createSettingsModel();
  const view = createSettingsView(dom);

  async function loadShowDevToolsPref(): Promise<boolean> {
    const res = await storageGet([SHOW_DEV_TOOLS_KEY]).catch(() => ({} as any));
    return (res as any)?.[SHOW_DEV_TOOLS_KEY] === true;
  }

  async function saveShowDevToolsPref(v: boolean) {
    await storageSet({ [SHOW_DEV_TOOLS_KEY]: !!v }).catch(() => null);
  }

  /**
   * CRITICAL: apply Logs/Stats visibility immediately at panel boot.
   * Your panel calls settingsTab.bind() during startup, but does NOT mount Settings.
   * So we must not wait for loadAll() (which runs only on Settings mount).
   */
  async function initDevToolsVisibility() {
    const showDevTools = await loadShowDevToolsPref();

    model.setShowDevTools(showDevTools);
    view.setShowDevToolsChecked(showDevTools);
    view.setDevToolsVisible(showDevTools);

    // Keep status quiet on boot; no actionLog spam.
    void debugTrace.append({
      scope: "settings",
      kind: "debug",
      message: "boot:applyDevToolsVisibility",
      meta: { showDevTools },
    });
  }

  async function loadAll() {
    view.setBusy(getBusy());

    // Preference
    const showDevTools = await loadShowDevToolsPref();
    model.setShowDevTools(showDevTools);
    view.setShowDevToolsChecked(showDevTools);
    view.setDevToolsVisible(showDevTools);

    // Dev config
    await ensureDevConfigLoaded().catch(() => null);
    const devSnap = getDevConfigSnapshot();
    model.setDev(toSettingsDevConfig(devSnap));
    view.setDevConfig(model.dev);

    // API config (storage-backed)
    const api = await loadApiConfig();
    model.setApi({ origin: api.origin });
    view.setApiConfig(model.api);

    // Debug enabled state
    const dbgAny = debugTrace as any;
    const enabled = typeof dbgAny.isEnabled === "function" ? !!dbgAny.isEnabled() : !!dbgAny.enabled;

    model.setDebugEnabled(enabled);
    view.setDebugEnabledChecked(enabled);

    // About
    view.setAbout(getManifestVersion() || "—", "https://github.com/nathabee/chatgpt-organizer");

    view.setGeneralStatus("");
    view.setApiStatus("");
    view.setDevStatus("");
  }

  async function onToggleShowDevTools() {
    const checked = !!dom.cfgShowDevToolsEl.checked;

    model.setShowDevTools(checked);
    view.setDevToolsVisible(checked);
    await saveShowDevToolsPref(checked);

    void actionLog.append({
      kind: "run",
      scope: "settings",
      message: checked ? "Developer tools enabled (Logs/Stats visible)." : "Developer tools disabled (Logs/Stats hidden).",
      ok: true,
      meta: { showDevTools: checked },
    });

    void debugTrace.append({
      scope: "settings",
      kind: "debug",
      message: "ui:toggle showDevTools",
      meta: { showDevTools: checked },
    });

    view.setGeneralStatus(checked ? "Developer tools enabled." : "Developer tools disabled.");
    setTimeout(() => view.setGeneralStatus(""), 1200);
  }

  async function onApplyApiOrigin() {
    const raw = dom.apiOriginEl.value || "";
    const norm = normalizeOrigin(raw);

    if (!norm) {
      view.setApiStatus("Invalid origin. Example: https://chatgpt.com");
      return;
    }

    view.setApiStatus("Saving…");

    await saveApiOrigin(norm);

    model.setApi({ origin: norm });
    view.setApiConfig(model.api);

    void actionLog.append({
      kind: "run",
      scope: "settings",
      message: `ChatGPT origin updated: ${norm}`,
      ok: true,
      meta: { origin: norm },
    });

    void debugTrace.append({
      scope: "settings",
      kind: "debug",
      message: "apiOrigin:updated",
      meta: { origin: norm },
    });

    view.setApiStatus("Saved.");
    setTimeout(() => view.setApiStatus(""), 1200);
  }

  async function onResetApiOrigin() {
    dom.apiOriginEl.value = DEFAULT_API_CONFIG.origin;
    await onApplyApiOrigin();
  }

  async function onApplyDevConfigFromInputs() {
    const next = toStoredDevConfigFromInputs(dom);

    view.setDevStatus("Saving…");

    await setDevConfig(next);

    model.setDev(toSettingsDevConfig(next));
    view.setDevConfig(model.dev);

    void actionLog.append({
      kind: "run",
      scope: "settings",
      message: "Developer configuration updated.",
      ok: true,
      meta: next,
    });

    void debugTrace.append({
      scope: "settings",
      kind: "debug",
      message: "devConfig:updated",
      meta: next,
    });

    view.setDevStatus("Saved.");
    setTimeout(() => view.setDevStatus(""), 1200);
  }

  async function onResetDevDefaults() {
    view.setDevStatus("Resetting…");

    // 1) Reset stored dev config
    await resetDevConfigDefaults();
    await ensureDevConfigLoaded().catch(() => null);

    const snap = getDevConfigSnapshot();
    model.setDev(toSettingsDevConfig(snap));
    view.setDevConfig(model.dev);

    // 2) Reset debugTrace enabled (separate store!)
    // Default: OFF (and OFF wipes traces by design)
    const dbgRes = await setDebugEnabled(false);
    if (dbgRes.ok) {
      model.setDebugEnabled(false);
      view.setDebugEnabledChecked(false);
    } else {
      // If your debugTrace module doesn’t expose setEnabled, we still reset dev config,
      // but we report it. This is not a fatal error.
      void actionLog.append({
        kind: "error",
        scope: "settings",
        message: "Dev defaults reset, but failed to reset debug enabled state.",
        ok: false,
        error: dbgRes.error || "unknown error",
      });
    }

    void actionLog.append({
      kind: "run",
      scope: "settings",
      message: "Developer configuration reset to defaults (debug disabled).",
      ok: true,
      meta: { ...DEV_CONFIG_DEFAULTS, debugEnabled: false },
    });

    view.setDevStatus("Reset.");
    setTimeout(() => view.setDevStatus(""), 1200);
  }


  async function onToggleDebugEnabled() {
    const checked = !!dom.logsCbDebugEl.checked;

    view.setDevStatus("Saving…");

    const res = await setDebugEnabled(checked);
    if (!res.ok) {
      dom.logsCbDebugEl.checked = !checked;
      view.setDevStatus(`Save failed: ${res.error || "unknown error"}`);

      void actionLog.append({
        kind: "error",
        scope: "settings",
        message: "Failed to change debug trace enabled state.",
        ok: false,
        error: res.error || "unknown error",
        meta: { enabled: checked },
      });
      return;
    }

    model.setDebugEnabled(checked);

    void actionLog.append({
      kind: "run",
      scope: "settings",
      message: checked ? "Debug trace enabled." : "Debug trace disabled (debug traces cleared).",
      ok: true,
      meta: { enabled: checked },
    });

    void debugTrace.append({
      scope: "settings",
      kind: "debug",
      message: "debugTrace:enabledChanged",
      meta: { enabled: checked },
    });

    view.setDevStatus("Saved.");
    setTimeout(() => view.setDevStatus(""), 1200);
  }

  const off = bus.on((_msg: AnyEvent) => {
    // no event-driven updates needed right now
  });

  function bind() {
    // General
    dom.cfgShowDevToolsEl.addEventListener("change", () => {
      void onToggleShowDevTools();
    });

    // Connection
    dom.apiOriginEl.addEventListener("change", () => {
      if (getBusy()) return;
      void onApplyApiOrigin();
    });

    dom.btnApiOriginReset.addEventListener("click", () => {
      if (getBusy()) return;
      void onResetApiOrigin();
    });

    // Developer config
    dom.cfgTraceScopeEl.addEventListener("change", () => {
      if (getBusy()) return;
      void onApplyDevConfigFromInputs();
    });

    dom.cfgStopAfterOutOfScopeEl.addEventListener("change", () => {
      if (getBusy()) return;
      void onApplyDevConfigFromInputs();
    });

    dom.cfgActionLogMaxEl.addEventListener("change", () => {
      if (getBusy()) return;
      void onApplyDevConfigFromInputs();
    });

    dom.cfgDebugTraceMaxEl.addEventListener("change", () => {
      if (getBusy()) return;
      void onApplyDevConfigFromInputs();
    });

    dom.cfgFailureLogsPerRunEl.addEventListener("change", () => {
      if (getBusy()) return;
      void onApplyDevConfigFromInputs();
    });

    dom.btnCfgResetDefaults.addEventListener("click", () => {
      if (getBusy()) return;
      void onResetDevDefaults();
    });

    // Debug enabled (moved to Settings)
    dom.logsCbDebugEl.addEventListener("change", () => {
      if (getBusy()) return;
      void onToggleDebugEnabled();
    });

    // ✅ APPLY VISIBILITY AT STARTUP
    void initDevToolsVisibility().catch(() => null);
  }

  return {
    id: "settings" as const,
    refresh() {
      void loadAll().catch(() => null);
    },
    mount() {
      void loadAll().catch(() => null);
    },
    unmount() { },
    bind,
    dispose() {
      off();
    },
  };
}
