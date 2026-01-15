// src/panel/tabs/settings/view.ts

import type { Dom } from "../../app/dom";
import type { SettingsApiConfig, SettingsDevConfig } from "./model";

export function createSettingsView(dom: Dom) {


  function setGeneralStatus(text: string) {
    dom.settingsGeneralStatusEl.textContent = text || "";
  }

  function setApiStatus(text: string) {
    dom.apiOriginStatusEl.textContent = text || "";
  }

  function setDevStatus(text: string) {
    dom.cfgStatusEl.textContent = text || "";
  }

  function setShowDevToolsChecked(checked: boolean) {
    dom.cfgShowDevToolsEl.checked = checked;
  }

function setDevToolsVisible(visible: boolean) {
    // Tabs
    dom.tabLogs.classList.toggle("is-hidden", !visible);
    dom.tabStats.classList.toggle("is-hidden", !visible);

    // Settings sections
    dom.devConfigDetailsEl.classList.toggle("is-hidden", !visible);
    dom.settingsConnectionBoxEl.classList.toggle("is-hidden", !visible);

    // Optional: collapse when hiding (prevents “re-open on next toggle” surprises)
    if (!visible) {
      dom.devConfigDetailsEl.open = false;
      dom.settingsConnectionBoxEl.open = false;
    }
  }


  function setApiConfig(api: SettingsApiConfig) {
    dom.apiOriginEl.value = api.origin || "";
  }

  function setDevConfig(dev: SettingsDevConfig) {
    dom.cfgTraceScopeEl.checked = !!dev.traceScope;
    dom.cfgStopAfterOutOfScopeEl.value = String(dev.stopAfterOutOfScopeProjects ?? 0);

    dom.cfgActionLogMaxEl.value = String(dev.actionLogMax ?? 5000);
    dom.cfgDebugTraceMaxEl.value = String(dev.debugTraceMax ?? 2000);
    dom.cfgFailureLogsPerRunEl.value = String(dev.failureLogsPerRun ?? 50);
  }

  function setDebugEnabledChecked(checked: boolean) {
    dom.logsCbDebugEl.checked = checked;
  }

  function setAbout(version: string, githubUrl: string) {
    dom.settingsVersionEl.textContent = version || "—";
    dom.settingsGitHubLinkEl.href = githubUrl || "#";
    dom.settingsGitHubLinkEl.hidden = !githubUrl;
  }

  function setBusy(disabled: boolean) {
    // We allow toggling "show dev tools" even while busy.
    dom.cfgShowDevToolsEl.disabled = false;

    dom.apiOriginEl.disabled = disabled;
    dom.btnApiOriginReset.disabled = disabled;

    dom.cfgTraceScopeEl.disabled = disabled;
    dom.cfgStopAfterOutOfScopeEl.disabled = disabled;
    dom.cfgActionLogMaxEl.disabled = disabled;
    dom.cfgDebugTraceMaxEl.disabled = disabled;
    dom.cfgFailureLogsPerRunEl.disabled = disabled;
    dom.btnCfgResetDefaults.disabled = disabled;

    dom.logsCbDebugEl.disabled = disabled;
  }

  return {
    setGeneralStatus,
    setApiStatus,
    setDevStatus,
    setShowDevToolsChecked,
    setDevToolsVisible,
    setApiConfig,
    setDevConfig,
    setDebugEnabledChecked,
    setAbout,
    setBusy,
  };
}
