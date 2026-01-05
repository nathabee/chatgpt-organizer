// src/background/util/log.ts 
import { getDevConfigSnapshot } from "./devConfig";

export function trace(...args: any[]) {
  if (getDevConfigSnapshot().traceScope) {
    console.log("[CGO]", ...args);
  }
}

export function traceWarn(...args: any[]) {
  if (getDevConfigSnapshot().traceScope) {
    console.warn("[CGO]", ...args);
  }
}

/**
 * Errors are ALWAYS logged (even when trace is off).
 */
export function traceError(...args: any[]) {
  console.error("[CGO]", ...args);
}
