// src/background/util/log.ts
import { getDevConfigSnapshot } from "./devConfig";

function prefix(level: string) {
  return `[CGO][${level}]`;
}

function traceOn(): boolean {
  return !!getDevConfigSnapshot().traceScope;
}

// Trace/info only when traceScope is enabled
export function logTrace(...args: any[]) {
  if (!traceOn()) return;
  console.log(prefix("trace"), ...args);
}

export function logInfo(...args: any[]) {
  if (!traceOn()) return;
  console.log(prefix("info"), ...args);
}

// Warn/errors are ALWAYS
export function logWarn(...args: any[]) {
  console.warn(prefix("warn"), ...args);
}

export function logError(...args: any[]) {
  console.error(prefix("error"), ...args);
}
