// src/panel/tabs/settings/model.ts

export type SettingsDevConfig = {
  traceScope: boolean;
  stopAfterOutOfScopeProjects: number;

  actionLogMax: number;
  debugTraceMax: number;
  failureLogsPerRun: number;
};

export type SettingsApiConfig = {
  origin: string;
};

export function createSettingsModel() {
  let showDevTools = false;

  let api: SettingsApiConfig = { origin: "https://chatgpt.com" };

  let dev: SettingsDevConfig = {
    traceScope: false,
    stopAfterOutOfScopeProjects: 3,

    actionLogMax: 5000,
    debugTraceMax: 2000,
    failureLogsPerRun: 50,
  };

  let debugEnabled = false;

  let generalStatus = "";
  let apiStatus = "";
  let devStatus = "";

  function setShowDevTools(v: boolean) {
    showDevTools = v;
  }

  function setApi(next: Partial<SettingsApiConfig>) {
    api = { ...api, ...next };
  }

  function setDev(next: Partial<SettingsDevConfig>) {
    dev = { ...dev, ...next };
  }

  function setDebugEnabled(v: boolean) {
    debugEnabled = v;
  }

  function setStatus(next: Partial<{ general: string; api: string; dev: string }>) {
    if (typeof next.general === "string") generalStatus = next.general;
    if (typeof next.api === "string") apiStatus = next.api;
    if (typeof next.dev === "string") devStatus = next.dev;
  }

  return {
    get showDevTools() {
      return showDevTools;
    },
    get api() {
      return api;
    },
    get dev() {
      return dev;
    },
    get debugEnabled() {
      return debugEnabled;
    },

    get generalStatus() {
      return generalStatus;
    },
    get apiStatus() {
      return apiStatus;
    },
    get devStatus() {
      return devStatus;
    },

    setShowDevTools,
    setApi,
    setDev,
    setDebugEnabled,
    setStatus,
  };
}
