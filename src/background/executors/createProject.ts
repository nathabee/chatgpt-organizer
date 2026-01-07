// src/background/executors/createProject.ts

import { MSG } from "../../shared/messages";
import { nowMs } from "../util/time";
import { logTrace, logWarn, logError } from "../util/log";
import { createProjectApi } from "../api/projectsApi";

type Ok = {
  ok: true;
  gizmoId: string;
  title: string;
  href: string;
  shortUrl?: string;
};

type Fail = {
  ok: false;
  error: string;
  status?: number;
};

export async function executeCreateProject(args: {
  accessToken: string;
  name: string;
  description?: string;
  prompt_starters?: string[];
}): Promise<Ok | Fail> {
  const startedAt = nowMs();
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const name = String(args.name || "").trim();
  const description = typeof args.description === "string" ? args.description : "";
  const prompt_starters = Array.isArray(args.prompt_starters) ? args.prompt_starters : [];

  logTrace("EXECUTE_CREATE_PROJECT start", {
    runId,
    name,
    starters: prompt_starters.length,
  });

  // progress: starting
  chrome.runtime.sendMessage({
    type: MSG.CREATE_PROJECT_PROGRESS,
    runId,
    phase: "starting",
  } as any);

  if (!name) {
    const error = "Project name is required.";
    logWarn("EXECUTE_CREATE_PROJECT invalid input", { runId, error });

    chrome.runtime.sendMessage({
      type: MSG.CREATE_PROJECT_DONE,
      runId,
      ok: false,
      status: 400,
      elapsedMs: nowMs() - startedAt,
      error,
    } as any);

    return { ok: false, status: 400, error };
  }

  try {
    // progress: sending
    chrome.runtime.sendMessage({
      type: MSG.CREATE_PROJECT_PROGRESS,
      runId,
      phase: "sending",
    } as any);

    const r = await createProjectApi(args.accessToken, {
      name,
      description,
      prompt_starters,
    });

    // progress: parsing
    chrome.runtime.sendMessage({
      type: MSG.CREATE_PROJECT_PROGRESS,
      runId,
      phase: "parsing",
    } as any);

    const elapsedMs = nowMs() - startedAt;

    chrome.runtime.sendMessage({
      type: MSG.CREATE_PROJECT_DONE,
      runId,
      ok: r.ok,
      status: (r as any).status,
      gizmoId: (r as any).gizmoId,
      elapsedMs,
      error: (r as any).error,
    } as any);

    if (!r.ok) {
      // expected API failure (validation / HTTP error)
      logWarn("EXECUTE_CREATE_PROJECT failed", {
        runId,
        status: r.status,
        error: r.error,
        elapsedMs,
      });
      return { ok: false, status: r.status, error: r.error };
    }

    logTrace("EXECUTE_CREATE_PROJECT success", {
      runId,
      gizmoId: r.gizmoId,
      elapsedMs,
    });

    return {
      ok: true,
      gizmoId: r.gizmoId,
      title: r.title,
      href: r.href,
      shortUrl: r.shortUrl,
    };
  } catch (e: any) {
    // truly unexpected (should be rare)
    const elapsedMs = nowMs() - startedAt;
    const error = e?.message || "Unexpected error";
    const status = e?.status;

    logError("EXECUTE_CREATE_PROJECT crashed", {
      runId,
      status,
      error,
      elapsedMs,
    });

    chrome.runtime.sendMessage({
      type: MSG.CREATE_PROJECT_DONE,
      runId,
      ok: false,
      status,
      elapsedMs,
      error,
    } as any);

    return { ok: false, status, error };
  }
}
