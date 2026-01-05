// src/panel/tabs/logs/tab.ts
import type { Dom } from "../../app/dom";
import type { createBus } from "../../app/bus";
import { getBusy, setBusy } from "../../app/state";
import { clampInt } from "../../app/format";

import { createLogsModel } from "./model";
import { createLogsView } from "./view";

import * as actionLog from "../../../shared/actionLog";
import * as debugTrace from "../../../shared/debugTrace";
import type { DevConfig } from "../../../shared/devConfig";
import { DEV_CONFIG_KEY, DEFAULT_DEV_CONFIG } from "../../../shared/devConfig";

type Bus = ReturnType<typeof createBus>;


async function loadDevConfig(): Promise<DevConfig> {
  const obj = await chrome.storage.local.get(DEV_CONFIG_KEY);
  const raw = obj[DEV_CONFIG_KEY] as Partial<DevConfig> | undefined;

  return {
    traceScope: raw?.traceScope ?? DEFAULT_DEV_CONFIG.traceScope,
    stopAfterOutOfScopeProjects:
      typeof raw?.stopAfterOutOfScopeProjects === "number" && raw.stopAfterOutOfScopeProjects >= 0
        ? Math.floor(raw.stopAfterOutOfScopeProjects)
        : DEFAULT_DEV_CONFIG.stopAfterOutOfScopeProjects,
  };
}

async function saveDevConfig(next: DevConfig): Promise<void> {
  await chrome.storage.local.set({ [DEV_CONFIG_KEY]: next });
}

async function applyConfigToUI(dom: Dom) {
  if (!dom.cfgTraceScopeEl || !dom.cfgStopAfterOutOfScopeEl) return;
  const cfg = await loadDevConfig();
  dom.cfgTraceScopeEl.checked = cfg.traceScope;
  dom.cfgStopAfterOutOfScopeEl.value = String(cfg.stopAfterOutOfScopeProjects);
}

function setCfgStatus(dom: Dom, text: string) {
  if (!dom.cfgStatusEl) return;
  dom.cfgStatusEl.textContent = text;
  window.setTimeout(() => {
    if (dom.cfgStatusEl && dom.cfgStatusEl.textContent === text) dom.cfgStatusEl.textContent = "";
  }, 1200);
}

async function readUI(dom: Dom): Promise<DevConfig> {
  const prev = await loadDevConfig();
  if (!dom.cfgTraceScopeEl || !dom.cfgStopAfterOutOfScopeEl) return prev;

  const stopN = Math.max(0, Math.floor(Number(dom.cfgStopAfterOutOfScopeEl.value || "0")));
  return {
    traceScope: !!dom.cfgTraceScopeEl.checked,
    stopAfterOutOfScopeProjects: Number.isFinite(stopN) ? stopN : prev.stopAfterOutOfScopeProjects,
  };
}

export function createLogsTab(dom: Dom, _bus: Bus) {
  const model = createLogsModel();
  const view = createLogsView(dom);

   

  async function refreshAudit() {
    view.setAuditStatus("Loading…");
    setBusy(dom, true);

    try {
      const limit = clampInt(dom.logsLimitEl.value, 10, 5000, 200);
      const res = await actionLog.list({ limit, reverse: true });
      model.set(res);
      view.renderAudit({ items: model.items, total: model.total });
      view.setAuditStatus(`Showing ${model.items.length} (newest first)`);
    } catch (e: any) {
      view.setAuditStatus(`Failed: ${e?.message || e}`);
    } finally {
      setBusy(dom, false);
    }
  }

  async function refreshDebug() {
    view.setDebugStatus("Loading…");
    setBusy(dom, true);

    try {
      const limit = clampInt(dom.debugLimitEl.value, 10, 5000, 200);
      const res = await debugTrace.list({ limit, reverse: true });
      view.renderDebug(res);
      view.setDebugStatus(`Showing ${res.items.length} (newest first)`);
    } catch (e: any) {
      view.setDebugStatus(`Failed: ${e?.message || e}`);
    } finally {
      setBusy(dom, false);
    }
  }

  async function bootDebugToggle() {
    const on = await debugTrace.isEnabled();
    view.setDebugChecked(on);
  }

  async function setDebug(on: boolean) {
    // OFF wipes everything by design
    await debugTrace.setEnabled(on);
    view.setDebugChecked(on);

    if (!on) {
      view.setDebugStatus("Debug OFF. Traces wiped.");
      dom.debugOutEl.textContent = "";
      return;
    }

    view.setDebugStatus("Debug ON.");
    await refreshDebug();
  }

  async function doTrimAudit() {
    const keepLast = clampInt(dom.logsTrimKeepEl.value, 0, 50000, 2000);

    view.setAuditStatus("Trimming…");
    setBusy(dom, true);
    try {
      const r = await actionLog.trim({ keepLast });
      await refreshAudit();
      view.setAuditStatus(`Trimmed. Remaining: ${r.total}`);
    } catch (e: any) {
      view.setAuditStatus(`Trim failed: ${e?.message || e}`);
    } finally {
      setBusy(dom, false);
    }
  }

  async function doClearAudit() {
    view.setAuditStatus("Clearing…");
    setBusy(dom, true);
    try {
      await actionLog.clear();
      await refreshAudit();
      view.setAuditStatus("Cleared.");
    } catch (e: any) {
      view.setAuditStatus(`Clear failed: ${e?.message || e}`);
    } finally {
      setBusy(dom, false);
    }
  }

  async function doExportAudit() {
    view.setAuditStatus("Exporting…");
    try {
      const json = await actionLog.exportJson({ pretty: true });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `chatgpt-organizer-audit-${Date.now()}.json`;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      view.setAuditStatus("Exported.");
    } catch (e: any) {
      view.setAuditStatus(`Export failed: ${e?.message || e}`);
    }
  }

  async function doClearDebug() {
    view.setDebugStatus("Clearing…");
    setBusy(dom, true);
    try {
      await debugTrace.clear();
      await refreshDebug();
      view.setDebugStatus("Cleared.");
    } catch (e: any) {
      view.setDebugStatus(`Clear failed: ${e?.message || e}`);
    } finally {
      setBusy(dom, false);
    }
  }

  async function doExportDebug() {
    view.setDebugStatus("Exporting…");
    try {
      const json = await debugTrace.exportJson({ pretty: true });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `chatgpt-organizer-debug-${Date.now()}.json`;
      a.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      view.setDebugStatus("Exported.");
    } catch (e: any) {
      view.setDebugStatus(`Export failed: ${e?.message || e}`);
    }
  }

  function bind() {
    // audit
    dom.btnLogsRefresh.addEventListener("click", () => {
      if (getBusy()) return;
      refreshAudit().catch(() => { });
    });

    dom.btnLogsTrim.addEventListener("click", () => {
      if (getBusy()) return;
      doTrimAudit().catch(() => { });
    });

    dom.btnLogsClear.addEventListener("click", () => {
      if (getBusy()) return;
      doClearAudit().catch(() => { });
    });

    dom.btnLogsExport.addEventListener("click", () => {
      if (getBusy()) return;
      doExportAudit().catch(() => { });
    });

    // debug
    dom.logsCbDebugEl.addEventListener("change", () => {
      if (getBusy()) return;
      setDebug(dom.logsCbDebugEl.checked).catch(() => { });
    });

    dom.btnDebugRefresh.addEventListener("click", () => {
      if (getBusy()) return;
      refreshDebug().catch(() => { });
    });

    dom.btnDebugClear.addEventListener("click", () => {
      if (getBusy()) return;
      doClearDebug().catch(() => { });
    });

    dom.btnDebugExport.addEventListener("click", () => {
      if (getBusy()) return;
      doExportDebug().catch(() => { });
    });
    // config (optional)
    if (dom.cfgTraceScopeEl && dom.cfgStopAfterOutOfScopeEl && dom.btnCfgResetDefaults) {
      dom.cfgTraceScopeEl.addEventListener("change", async () => {
        const cfg = await readUI(dom);
        await saveDevConfig(cfg);
        setCfgStatus(dom, "Saved");
      });

      dom.cfgStopAfterOutOfScopeEl.addEventListener("change", async () => {
        const cfg = await readUI(dom);
        await saveDevConfig(cfg);
        dom.cfgStopAfterOutOfScopeEl!.value = String(cfg.stopAfterOutOfScopeProjects);
        setCfgStatus(dom, "Saved");
      });

      dom.btnCfgResetDefaults.addEventListener("click", async () => {
        await saveDevConfig(DEFAULT_DEV_CONFIG);
        await applyConfigToUI(dom);
        setCfgStatus(dom, "Reset");
      });
    }


  }

  return {
    id: "logs" as const,
    bind,
    mount() {
      bootDebugToggle().catch(() => { });
      refreshAudit().catch(() => { });
      refreshDebug().catch(() => { });
      applyConfigToUI(dom).catch(() => { });

    },
    unmount() { },
    dispose() { },
  };
}
