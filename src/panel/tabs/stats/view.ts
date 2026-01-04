// src/panel/tabs/stats/view.ts
import type { Dom } from "../../app/dom";
import type { StatsReport } from "./model";

function fmtTs(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function fmtNum(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "0";
  return digits ? n.toFixed(digits) : String(Math.round(n));
}

function esc(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build a simple horizontal bar list. */
function renderBars(
  el: HTMLElement,
  items: Array<{ label: string; value: number; hint?: string }>,
  opts?: { valueLabel?: (n: number) => string }
) {
  const max = Math.max(1, ...items.map((x) => x.value));
  const fmt = opts?.valueLabel ?? ((n: number) => String(n));

  const out: string[] = [];
  out.push(`<div class="statsBars">`);

  for (const it of items) {
    const pct = Math.max(0, Math.min(100, (it.value / max) * 100));
    const title = it.hint ? esc(it.hint) : `${esc(it.label)}: ${it.value}`;

    out.push(
      `<div class="statsBarItem" title="${title}">` +
        `<div class="statsBarLabel">${esc(it.label)}</div>` +
        `<div class="statsBarTrack"><div class="statsBarFill" style="width:${pct.toFixed(1)}%"></div></div>` +
        `<div class="statsBarValue">${esc(fmt(it.value))}</div>` +
      `</div>`
    );
  }

  out.push(`</div>`);
  el.innerHTML = out.join("");
}

/** Heatmap: last N weeks, GitHub-style 7 rows (Mon..Sun), columns are weeks. */
function renderHeatmap(
  el: HTMLElement,
  dayCounts: Array<{ day: string; count: number }>,
  opts?: { weeks?: number }
) {
  const weeks = Math.max(8, Math.min(opts?.weeks ?? 16, 52));

  // map YYYY-MM-DD -> count
  const map = new Map<string, number>();
  for (const x of dayCounts) map.set(x.day, Number(x.count || 0));

  // today (local) => strip time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // find Monday of the current week (Mon=1..Sun=0)
  const dow = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const thisMon = new Date(today);
  thisMon.setDate(today.getDate() - dow);

  // start Monday N weeks back
  const start = new Date(thisMon);
  start.setDate(thisMon.getDate() - (weeks - 1) * 7);

  // build cells for weeks*7 days
  const cells: string[] = [];
  let max = 0;

  // compute max for intensity scaling
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const c = map.get(key) || 0;
      if (c > max) max = c;
    }
  }
  max = Math.max(1, max);

  function level(c: number): number {
    // 0..4
    if (c <= 0) return 0;
    const r = c / max;
    if (r <= 0.25) return 1;
    if (r <= 0.50) return 2;
    if (r <= 0.75) return 3;
    return 4;
  }

  let total = 0;
  let knownDays = 0;

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      const c = map.get(key) || 0;
      if (map.has(key)) knownDays++;
      total += c;

      const cls = `statsHeatCell statsHeat${level(c)}`;
      const title = `${key} · ${c} created`;
      cells.push(`<div class="${cls}" title="${esc(title)}"></div>`);
    }
  }

  el.innerHTML =
    `<div class="statsHeatmapWrap">` +
      `<div class="statsHeatmapHeader">` +
        `<div class="statsHeatmapTitle">Last ${weeks} weeks</div>` +
        `<div class="statsHeatmapHint">Total created: ${total} · Max/day: ${max}</div>` +
      `</div>` +
      `<div class="statsHeatmapGrid">${cells.join("")}</div>` +
    `</div>`;
}

export function createStatsView(dom: Dom) {
  function setStatus(text: string) {
    dom.statsStatusEl.textContent = text;
  }

  function render(report: StatsReport) {
    const t = report.totals;

    // Snapshot totals
    dom.statsSingleChatsEl.textContent = String(t.singleChats);
    dom.statsProjectsEl.textContent = String(t.projects);
    dom.statsProjectChatsEl.textContent = String(t.projectChats);
    dom.statsTotalChatsEl.textContent = String(t.totalChats);

    dom.statsArchivedChatsEl.textContent = String(t.archivedChats);
    dom.statsAvgChatsPerProjectEl.textContent = fmtNum(t.avgChatsPerProject, 1);

    dom.statsLastCacheUpdateEl.textContent = fmtTs(t.lastCacheUpdateTs);
    dom.statsLimitsHintEl.textContent = t.limitsHint;

    // Deletes
    dom.statsDeletedChatsEl.textContent = String(report.deletes.deletedChats);
    dom.statsDeletedProjectsEl.textContent = String(report.deletes.deletedProjects);

    // Activity graphs
    const a = report.activity;

    // Heatmap: created per day (last 16 weeks)
    renderHeatmap(dom.statsCreatedHeatmapEl, a.createdPerDay, { weeks: 16 });

    // Lifetime histogram
    const L = a.lifetime;
    renderBars(dom.statsLifetimeHistEl, [
      { label: "0d", value: L.sameDay, hint: "Updated the same day it was created" },
      { label: "1–2d", value: L.d1_2 },
      { label: "3–7d", value: L.d3_7 },
      { label: "8–30d", value: L.d8_30 },
      { label: "31d+", value: L.d31p },
      { label: "unknown", value: L.unknown, hint: "Missing createTime/updateTime (or invalid order)" },
    ]);

    // Projects graphs
    const p = report.projects;

    renderBars(dom.statsProjectSizeHistEl, [
      { label: "0", value: p.sizeBuckets.empty, hint: "Empty projects" },
      { label: "1–5", value: p.sizeBuckets.small },
      { label: "6–20", value: p.sizeBuckets.medium },
      { label: "21–100", value: p.sizeBuckets.large },
      { label: "101+", value: p.sizeBuckets.huge },
    ]);

    // Top projects as bar list
    if (p.topProjects.length) {
      renderBars(
        dom.statsTopProjectsEl,
        p.topProjects.map((x) => ({
          label: x.title,
          value: x.chats,
          hint: `${x.title} · ${x.chats} chats`,
        })),
        { valueLabel: (n) => String(n) }
      );
    } else {
      dom.statsTopProjectsEl.innerHTML = `<div class="muted">No projects loaded.</div>`;
    }
  }

  return { setStatus, render };
}
