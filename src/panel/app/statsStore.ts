// src/panel/app/statsStore.ts


export const STATS_KEY = "cgo_stats_v1";

export type StatsStored = {
  deletedChats: number;
  deletedProjects: number;
};

function norm(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export async function getStats(): Promise<StatsStored> {
  try {
    const res = await chrome.storage.local.get(STATS_KEY);
    const raw = (res?.[STATS_KEY] || {}) as Partial<StatsStored>;
    return {
      deletedChats: norm(raw.deletedChats),
      deletedProjects: norm(raw.deletedProjects),
    };
  } catch {
    return { deletedChats: 0, deletedProjects: 0 };
  }
}

export async function setStats(next: StatsStored): Promise<void> {
  await chrome.storage.local.set({
    [STATS_KEY]: {
      deletedChats: norm(next.deletedChats),
      deletedProjects: norm(next.deletedProjects),
    } satisfies StatsStored,
  });
}

export async function incDeletedChats(by = 1): Promise<StatsStored> {
  const cur = await getStats();
  const next = { ...cur, deletedChats: cur.deletedChats + Math.max(1, norm(by)) };
  await setStats(next);
  return next;
}

export async function incDeletedProjects(by = 1): Promise<StatsStored> {
  const cur = await getStats();
  const next = { ...cur, deletedProjects: cur.deletedProjects + Math.max(1, norm(by)) };
  await setStats(next);
  return next;
}
