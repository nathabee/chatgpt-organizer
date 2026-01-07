// src/background/http/apiClient.ts


import * as debugTrace from "../../shared/debugTrace";
import { ensureDevConfigLoaded, getDevConfigSnapshot } from "../util/devConfig";
import { ensureApiConfigLoaded, getApiConfigSnapshot } from "../util/apiConfig";
import { logTrace, logWarn, logError } from "../util/log";
import { safePathFromUrl } from "../util/urls"; // you already export this

export class ApiError extends Error {
  status?: number;
  method: string;
  urlPath: string;
  bodyPreview?: string;

  constructor(args: { message: string; status?: number; method: string; urlPath: string; bodyPreview?: string }) {
    super(args.message);
    this.status = args.status;
    this.method = args.method;
    this.urlPath = args.urlPath;
    this.bodyPreview = args.bodyPreview;
  }
}

type ApiReq = {
  url: string;
  method?: string;
  accessToken?: string;
  json?: any; // request body (object)
  headers?: Record<string, string>;
};

function isClientWarn(status?: number) {
  return typeof status === "number" && status >= 400 && status < 500;
}

async function debugAppend(line: string, meta: any) {
  const on = await debugTrace.isEnabled().catch(() => false);
  if (!on) return;
  await debugTrace.append([{ scope: "background", kind: "debug", message: line, ok: true, meta }]).catch(() => {});
}

export async function apiFetch(req: ApiReq): Promise<Response> {
  await ensureDevConfigLoaded();
  await ensureApiConfigLoaded();

  const cfg = getApiConfigSnapshot();
  const method = (req.method || "GET").toUpperCase();
  const urlPath = safePathFromUrl(req.url);

  const headers: Record<string, string> = {
    ...(req.headers || {}),
  };
  if (req.accessToken) headers.Authorization = `Bearer ${req.accessToken}`;

  let body: string | undefined;
  if (req.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(req.json);
  }

  // Trace start (only when enabled)
  await logTrace("[api] request", { origin: cfg.origin, method, url: urlPath, hasBody: !!body });

  await debugAppend(`HTTP ${method} ${urlPath}`, { origin: cfg.origin });

  let resp: Response;
  try {
    resp = await fetch(req.url, { method, credentials: "include", headers, body });
  } catch (e: any) {
    const err = new ApiError({
      message: e?.message || "Network error",
      method,
      urlPath,
    });
    logError("[api] network error", { method, url: urlPath, error: err.message });
    throw err;
  }

  if (resp.ok) {
    await logTrace("[api] ok", { method, url: urlPath, status: resp.status });
    return resp;
  }

  const txt = await resp.text().catch(() => "");
  const preview = txt.slice(0, 600);

  const err = new ApiError({
    message: preview || `HTTP ${resp.status}`,
    status: resp.status,
    method,
    urlPath,
    bodyPreview: preview,
  });

  // ALWAYS log failures
  if (isClientWarn(resp.status)) {
    logWarn("[api] http failed", { method, url: urlPath, status: resp.status, preview });
  } else {
    logError("[api] http failed", { method, url: urlPath, status: resp.status, preview });
  }

  throw err;
}

export async function apiJson<T>(req: ApiReq): Promise<T> {
  const resp = await apiFetch(req);
  try {
    return (await resp.json()) as T;
  } catch (e: any) {
    const method = (req.method || "GET").toUpperCase();
    const urlPath = safePathFromUrl(req.url);
    logError("[api] json parse failed", { method, url: urlPath, error: e?.message || String(e) });
    throw new ApiError({ message: "Failed to parse JSON", method, urlPath });
  }
}

export async function apiText(req: ApiReq): Promise<string> {
  const resp = await apiFetch(req);
  return await resp.text().catch(() => "");
}


export async function fetchJsonAuthed<T>(url: string, accessToken: string): Promise<T> {
  return await apiJson<T>({ url, method: "GET", accessToken });
}

 