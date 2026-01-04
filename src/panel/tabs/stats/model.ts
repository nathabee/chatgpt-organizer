// src/panel/tabs/stats/model.ts
import type { CacheSnapshot } from "../../app/cache";
import type { ConversationItem, ProjectItem } from "../../../shared/types";


export type StatsDeleteCounts = {
    deletedChats: number;
    deletedProjects: number;
};

export type LifetimeBuckets = {
    sameDay: number;   // 0 days
    d1_2: number;      // 1–2
    d3_7: number;      // 3–7
    d8_30: number;     // 8–30
    d31p: number;      // 31+
    unknown: number;   // missing timestamps
};

export type StatsSnapshotTotals = {
    singleChats: number;
    projects: number;
    projectChats: number;
    totalChats: number;

    archivedChats: number;
    avgChatsPerProject: number;

    lastCacheUpdateTs: number; // 0 if never
    limitsHint: string;
};

export type DayCount = { day: string; count: number }; // YYYY-MM-DD
export type StatsActivity = {
    createdKnown: number;
    updatedKnown: number;
    createdPerDayTop: Array<{ day: string; count: number }>;
    lifetime: LifetimeBuckets;
    createdPerDay: DayCount[];  // full series (sorted asc)

};

export type StatsProjects = {
    projectCount: number;
    emptyProjects: number;
    sizeBuckets: {
        empty: number;
        small: number;  // 1–5
        medium: number; // 6–20
        large: number;  // 21–100
        huge: number;   // 101+
    };
    topProjects: Array<{ title: string; gizmoId: string; chats: number }>;
};

export type StatsReport = {
    totals: StatsSnapshotTotals;
    activity: StatsActivity;
    projects: StatsProjects;
    deletes: StatsDeleteCounts;
};

function parseIsoTs(iso?: string | null): number {
    if (!iso) return 0;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
}

function fmtDay(iso?: string | null): string {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
}

function allChats(snap: CacheSnapshot): ConversationItem[] {
    const out: ConversationItem[] = [];
    for (const c of snap.singleChats) out.push(c);
    for (const p of snap.projects) {
        for (const c of p.conversations || []) out.push(c);
    }
    return out;
}

function countArchived(chats: ConversationItem[]): number {
    let n = 0;
    for (const c of chats) if (c.isArchived === true) n++;
    return n;
}

function buildLimitsHint(meta: CacheSnapshot["meta"]): string {
    const bits: string[] = [];
    if (typeof meta.singleLimit === "number") bits.push(`single limit ${meta.singleLimit}`);
    if (typeof meta.projectsLimit === "number") bits.push(`projects limit ${meta.projectsLimit}`);
    if (typeof meta.projectsChatsLimit === "number") bits.push(`chats/project limit ${meta.projectsChatsLimit}`);
    return bits.length ? `Limits: ${bits.join(" · ")}` : "Limits: —";
}

function lastUpdateTs(meta: CacheSnapshot["meta"]): number {
    const a = Number(meta.singleUpdatedTs || 0);
    const b = Number(meta.projectsUpdatedTs || 0);
    return Math.max(a, b);
}

function computeLifetimeBuckets(chats: ConversationItem[]): LifetimeBuckets {
    const buckets: LifetimeBuckets = {
        sameDay: 0,
        d1_2: 0,
        d3_7: 0,
        d8_30: 0,
        d31p: 0,
        unknown: 0,
    };

    const dayMs = 24 * 60 * 60 * 1000;

    for (const c of chats) {
        const cTs = parseIsoTs(c.createTime);
        const uTs = parseIsoTs(c.updateTime);

        if (!cTs || !uTs || uTs < cTs) {
            buckets.unknown++;
            continue;
        }

        const days = Math.floor((uTs - cTs) / dayMs);

        if (days <= 0) buckets.sameDay++;
        else if (days <= 2) buckets.d1_2++;
        else if (days <= 7) buckets.d3_7++;
        else if (days <= 30) buckets.d8_30++;
        else buckets.d31p++;
    }

    return buckets;
}

function computeCreatedPerDayTop(chats: ConversationItem[], topN = 12): Array<{ day: string; count: number }> {
    const map = new Map<string, number>();

    for (const c of chats) {
        const day = fmtDay(c.createTime);
        if (!day) continue;
        map.set(day, (map.get(day) || 0) + 1);
    }

    const arr = Array.from(map.entries()).map(([day, count]) => ({ day, count }));
    arr.sort((a, b) => b.count - a.count || (a.day < b.day ? 1 : -1));
    return arr.slice(0, topN);
}

function computeProjectsStats(projects: ProjectItem[]): StatsProjects {
    const projectCount = projects.length;
    let emptyProjects = 0;

    const sizeBuckets = {
        empty: 0,
        small: 0,
        medium: 0,
        large: 0,
        huge: 0,
    };

    const topProjects = projects
        .map((p) => ({
            title: p.title || p.gizmoId,
            gizmoId: p.gizmoId,
            chats: (p.conversations || []).length,
        }))
        .sort((a, b) => b.chats - a.chats)
        .slice(0, 10);

    for (const p of projects) {
        const n = (p.conversations || []).length;
        if (n === 0) {
            emptyProjects++;
            sizeBuckets.empty++;
        } else if (n <= 5) sizeBuckets.small++;
        else if (n <= 20) sizeBuckets.medium++;
        else if (n <= 100) sizeBuckets.large++;
        else sizeBuckets.huge++;
    }

    return { projectCount, emptyProjects, sizeBuckets, topProjects };
}

function computeCreatedPerDaySeries(chats: ConversationItem[]): Array<{ day: string; count: number }> {
    const map = new Map<string, number>();

    for (const c of chats) {
        const day = fmtDay(c.createTime);
        if (!day) continue;
        map.set(day, (map.get(day) || 0) + 1);
    }

    const arr = Array.from(map.entries()).map(([day, count]) => ({ day, count }));
    // ascending by day
    arr.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    return arr;
}


export function createStatsModel() {
    let deletes: StatsDeleteCounts = { deletedChats: 0, deletedProjects: 0 };

    function setDeletes(next: StatsDeleteCounts) {
        deletes = {
            deletedChats: Math.max(0, Number(next.deletedChats || 0)),
            deletedProjects: Math.max(0, Number(next.deletedProjects || 0)),
        };
    }

    function compute(snap: CacheSnapshot): StatsReport {
        const chats = allChats(snap);

        const totals: StatsSnapshotTotals = {
            singleChats: snap.counts.singleChats,
            projects: snap.counts.projects,
            projectChats: snap.counts.projectChats,
            totalChats: snap.counts.totalChats,

            archivedChats: countArchived(chats),
            avgChatsPerProject: snap.counts.projects > 0
                ? snap.counts.projectChats / Math.max(1, snap.counts.projects)
                : 0,

            lastCacheUpdateTs: lastUpdateTs(snap.meta),
            limitsHint: buildLimitsHint(snap.meta),
        };

        let createdKnown = 0;
        let updatedKnown = 0;
        for (const c of chats) {
            if (parseIsoTs(c.createTime)) createdKnown++;
            if (parseIsoTs(c.updateTime)) updatedKnown++;
        }

        const activity: StatsActivity = {
            createdKnown,
            updatedKnown,
            createdPerDayTop: computeCreatedPerDayTop(chats, 12),
            createdPerDay: computeCreatedPerDaySeries(chats),
            lifetime: computeLifetimeBuckets(chats),
        };


        const projects = computeProjectsStats(snap.projects);

        return { totals, activity, projects, deletes };
    }

    return { setDeletes, compute };
}
