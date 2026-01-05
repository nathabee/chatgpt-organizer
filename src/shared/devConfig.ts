// src/shared/devConfig.ts
export type DevConfig = {
  traceScope: boolean;
  stopAfterOutOfScopeProjects: number;
};

export const DEV_CONFIG_KEY = "cgo_dev_config" as const;

export const DEFAULT_DEV_CONFIG: DevConfig = {
  traceScope: false,
  stopAfterOutOfScopeProjects: 3,  
};
