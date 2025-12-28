// src/shared/storage.ts

// NEW v0.0.8: storage keys
const KEY_ACTIVE_TAB = "cgo.ui.activeTab";
const KEY_PROJECTS = "cgo.projects";

// NEW v0.0.8: project model
export type Project = {
  id: string;
  name: string;
  notes?: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
};

function uuid(): string {
  // crypto.randomUUID is available in modern Chromium
  // fallback keeps it deterministic enough for local IDs
  // NEW v0.0.8
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Generic helpers
async function getLocal<T>(key: string, fallback: T): Promise<T> {
  const obj = await chrome.storage.local.get(key);
  const v = obj?.[key];
  return (v ?? fallback) as T;
}

async function setLocal<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

/* -----------------------------------------------------------
 * NEW v0.0.8: active tab persistence
 * ----------------------------------------------------------- */

export type PanelTab = "delete" | "projects";

export async function getActiveTab(): Promise<PanelTab> {
  const v = await getLocal<string | undefined>(KEY_ACTIVE_TAB, undefined);
  return v === "projects" ? "projects" : "delete";
}

export async function setActiveTab(tab: PanelTab): Promise<void> {
  await setLocal(KEY_ACTIVE_TAB, tab);
}

/* -----------------------------------------------------------
 * NEW v0.0.8: projects CRUD
 * ----------------------------------------------------------- */

export async function listProjects(): Promise<Project[]> {
  const items = await getLocal<Project[]>(KEY_PROJECTS, []);
  // Normalize + stable sort (newest updated first)
  return (items || [])
    .filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
    .map((p) => ({
      ...p,
      createdAt: Number(p.createdAt || Date.now()),
      updatedAt: Number(p.updatedAt || p.createdAt || Date.now()),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addProject(input: { name: string; notes?: string }): Promise<Project> {
  const name = (input.name || "").trim();
  if (!name) throw new Error("Project name is required.");

  const now = Date.now();
  const proj: Project = {
    id: uuid(),
    name,
    notes: (input.notes || "").trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const all = await listProjects();
  all.unshift(proj);
  await setLocal(KEY_PROJECTS, all);
  return proj;
}

export async function updateProject(id: string, patch: { name?: string; notes?: string }): Promise<Project> {
  const all = await listProjects();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Project not found.");

  const cur = all[idx];
  const name = patch.name != null ? patch.name.trim() : cur.name;
  if (!name) throw new Error("Project name is required.");

  const notes = patch.notes != null ? patch.notes.trim() : (cur.notes || "");
  const next: Project = {
    ...cur,
    name,
    notes: notes || undefined,
    updatedAt: Date.now(),
  };

  all[idx] = next;
  await setLocal(KEY_PROJECTS, all);
  return next;
}

export async function deleteProject(id: string): Promise<void> {
  const all = await listProjects();
  const next = all.filter((p) => p.id !== id);
  await setLocal(KEY_PROJECTS, next);
}
