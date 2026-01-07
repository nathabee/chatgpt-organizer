# Version History — ChatGPT Organizer

This document tracks functional and architectural changes of the ChatGPT Organizer
Chrome extension.

Versions are listed with the **newest at the top**.

---

## MINOR VERSION

### v0.1 — Focus: Organization, Visibility, Control *(planned)*

This minor version marks the end of the experimental 0.0.x phase and shifts the
extension from **cleanup tooling** to **long-term chat organization**.

#### Vision

ChatGPT Organizer becomes a **curation tool**, not just a deletion helper.

The focus is on:

* structuring chats into projects,
* understanding what exists,
* and keeping long histories manageable over time.

#### Planned Epics

##### 1. Organize Tab (Drag & Drop Project Filing)

A new dedicated tab to **move chats into projects**.

* Select one or multiple chats
* Assign them to an existing project
* Optional drag & drop for single-chat moves
* Clear separation between:

  * selection
  * destination
  * execution

No destructive actions in this tab.

---

##### 2. Search & Bulk Actions

Power-user oriented discovery tools.

* Search chats by title
* Filter by project / unassigned
* Bulk move search results into a project
* Designed for handling **hundreds of chats at once**

---

##### 3. Logs Tab (Action Archive)

Since deletions and moves cannot be undone via the ChatGPT API,
the extension provides **full traceability instead of fake safety**.

* Append-only action log:

  * deletions
  * project removals
  * bulk moves
* Timestamped
* Shows chat titles, ids, project names
* Log is:

  * stored locally
  * trimmed only on user demand

This becomes the user’s **audit trail**.

---

##### 4. Stats & Overview Tab

High-level visibility into the account.

* Total chats
* Total projects
* Chats per project
* Empty / small projects
* Large projects (cleanup candidates)

Read-only, zero risk.
 

---

## v0.0 — Experimental  Phase *(completed)*


### What 0.0.x Can Do

* Scrape visible and full ChatGPT chat lists
* Deep scan long histories
* Select chats manually or in bulk
* Execute ChatGPT REST delete requests
* Show:

  * live scan progress
  * execution progress
  * confirmation previews
* Discover ChatGPT projects
* Show project → conversation counts
* Delete empty or selected projects
* Local project notes (browser storage)
  



---

## PATCHES
 



## v0.1.9 — Epic: Create Projects & Stabilize Tracing

### Scope

Introduce **project creation** and **empty-project support**, while **cleaning and standardizing tracing, logging, and API boundaries** across the background architecture.

---

## Goals

* Enable **project creation** from Organize / Projects
* Show **empty projects** (newly created projects have no conversations)
* Make **trace / debug / logs reliable enough to analyze API behavior**
* Reduce coupling and regressions by clarifying responsibilities

---

## Logging & Tracing (Final Model)

| Layer                                               | Purpose                                     | Persistence          | Controlled by |
| --------------------------------------------------- | ------------------------------------------- | -------------------- | ------------- |
| **Console trace (`logTrace / logWarn / logError`)** | Dev-time flow & errors                      | No                   | `traceScope`  |
| **Debug trace (`debugTrace`)**                      | Deep API inspection (payloads, schemas)     | Yes (storage → JSON) | Debug toggle  |
| **Action log (`actionLog`)**                        | User-visible history (delete, move, create) | Yes (storage)        | Feature logic |

### Rules (kept simple)

* **Console logs** → developer feedback only
* **Debug trace** → inspect HTTP reality
* **Action log** → what the extension did for the user

---

## Architecture Rules (Enforced)

### API (`api/*`)

* Example: `createProjectApi`
* Pure HTTP + parsing
* No logging
* No `chrome.runtime`
* Returns structured result

### Controllers (`controllers/*`)

* Orchestrate multiple API calls
* Apply scope rules
* Emit progress / done events
* Minimal `logTrace / logWarn`

### Executors (`executors/*`)

* Run destructive or long operations
* Emit progress + done
* Handle retries
* Use `logTrace / logWarn / logError`

### Index (`background/index.ts`)

* Dispatch only
* No HTTP knowledge
* No parsing
* No API details

---

## Key Functional Changes

* **Create Project** now works using the correct `snorlax/upsert` payload
  (including required `sharing` structure)
* **Empty projects are now listed** (no longer filtered out)
* API tracing made sufficient to reverse-engineer payload requirements
* Controller logic cleaned without breaking logs or progress

---

## Code Structure Impact

* Clear split:

  * `api/`
  * `controllers/`
  * `executors/`
  * `panel/`
* Reduced cross-layer leakage
* Fewer regressions during refactors

---

## Open Problem (Next Work)

* Avoid full refresh after **create / move**
* Update cache in-place and re-render (same approach as delete)

---



## v0.1.8 — Epic: Organize Tab (Move Chats into Projects)

### Goals

* Provide a clear workflow to **move selected chats into a chosen project**.
* Keep interaction simple, visual, and safe.

### Planned deliverables

#### 1) Organize tab UI (two-column layout)

* **Left column:** source chats (select many)

  * Supports listing from:

    * single chats
    * project chats (grouped or flat)
  * Multi-select via checkboxes
* **Right column:** destination project selector

  * Choose exactly **one** target project

#### 2) Move action

* Button: **Move to project**
* Behavior:

  * validates: at least 1 chat selected + exactly 1 destination selected
  * executes move requests (new backend executor)
  * progress + per-item success/failure logging
  * updates local model + cache after successful moves

#### 3) Guardrails + feedback

* Clear confirmation gating (similar to delete pattern)
* Progress indicator + results log
* Failure logging into Logs tab

#### 4) Optional (if time)

* “Filter left list” (search box)
* “Show only loaded data” vs “fetch missing” (later)

### Dependencies / prerequisites from v0.1.6

* Reuse timestamp + conversation parsing utilities
* Reuse global scope concept later for filtering what appears in Organize

---
 

## v0.1.7 — Epic: 

### v0.1.7 — Epic: Config-Driven API URLs

#### Goals

* Remove all hardcoded `https://chatgpt.com` URLs from the codebase
* Centralize every API endpoint + UI link pattern behind a single **API config** (single source of truth)
* Make the extension ready for future host variations by changing config only (not code)

#### What changes

**1) New API configuration layer**

* Add `ApiConfig` in `src/shared/apiConfig.ts`

  * `origin` (example: `https://chatgpt.com`)
  * path templates for:

    * auth session
    * conversations list + conversation by id
    * gizmos/projects root + sidebar + conversations
    * UI href patterns (`/c/{id}`, `/g/{shortUrl}`)

**2) Background config loader (cached, storage-backed)**

* Add `src/background/util/apiConfig.ts`

  * loads/syncs `ApiConfig` from `chrome.storage.local`
  * keeps an in-memory snapshot for fast access
  * updates snapshot on storage changes

**3) URL builders replace string concatenation**

* Add `src/background/util/apiUrls.ts`

  * builds full URLs from `ApiConfig` (origin + paths)
  * supports path template expansion (`{id}`, `{shortUrl}`)
  * provides helpers like:

    * `apiAuthSessionUrl()`
    * `apiConversationsUrl(query)`
    * `apiConversationUrl(id)`
    * `apiGizmosSidebarUrl(query)`
    * `apiGizmoConversationsUrl(gizmoId, cursor)`
    * `uiConversationHref(id)`
    * `uiGizmoHref(shortUrl)`

**4) Refactor API callers to use builders**

* `session.ts` uses `apiAuthSessionUrl()`
* `conversations.ts` uses `apiConversationsUrl()` / `apiConversationUrl()` / `uiConversationHref()`
* `gizmos.ts` uses `apiGizmosSidebarUrl()` / `apiGizmoConversationsUrl()` / `uiGizmoHref()` and `pathGizmosRoot`

**5) URL detection becomes host-aware**

* Replace `isChatGPTUrl()` / `getActiveChatGPTTab()` with generic:

  * `isTargetUrl()`
  * `getActiveTargetTab()`
* Any “fallback route to content script” now targets the configured origin.

**6) Trace adapts to config (debug clarity)**

* Debug trace entries include:

  * the active `origin`
  * the configured endpoint path template
  * the resolved request path/query (no more hardcoded `/gizmos/...` strings)

#### UI / Logs tab additions

* Logs tab (or Dev/Logs area) gains visibility into the current API configuration:

  * active `origin`
  * active endpoint paths (read-only display is enough for now)
* Optional (if you implement it in this version): allow editing the config values in logs/dev settings for testing.
 
---
 
## v0.1.6 — Epic: Global Scope Controls + Timestamp Groundwork (No Organize)

### Goals

* Establish a **global “Scope” concept** (date-based) that will later drive consistent filtering.
* Add **instrumentation** to verify what ChatGPT’s backend timestamps actually do (single + projects).
* Keep the release focused: **no Organize UI yet**.

### Delivered

#### 1) Global Scope UI foundation

* Added a global **Scope date** control (date input + label).
* Scope is stored at the panel level (UI-level source of truth).
* Scope intended semantics: **date at 00:00 local time** (day-granularity).

#### 2) Timestamp parsing + normalization utilities

* Added robust parsing for time fields that can be:

  * ISO strings (`2025-12-05T08:44:00Z`)
  * numeric strings
  * epoch seconds
  * epoch milliseconds
* Unified logic around “updated time” = `update_time` fallback to `create_time`.

#### 3) Scope-first paging algorithm for projects (implemented but not fully wired yet)

* Implemented “scope-first / time-first” paging logic for gizmo conversations:

  * Check first page newest item
  * Stop paging once items fall below cutoff
  * Keep only in-scope conversations (intended)
  * Skip caching empty projects (intended)

#### 4) Debug tracing to diagnose scope flow + backend behavior

* Added console/debug trace points showing:

  * whether `sinceUpdatedMs` exists or is `undefined`
  * first item timestamps per gizmo project fetch
* Result of tracing: **scope cutoff wasn’t being passed** (sinceUpdatedMs shows `undefined`), so scope filtering was not active.

#### 5) Verified timestamp behavior experimentally (important findings)

Based on your controlled edits:

* Adding a message to a chat:

  * updates **conversation `update_time`**
  * does **not** change `create_time`
* Moving a chat between projects:

  * updates **conversation `update_time`**
* Renaming a project:

  * does **not** update conversation timestamps

**Conclusion:** project/container metadata is unreliable for “updated”; only conversation timestamps are trustworthy.


 
---

 

### v0.1.5 — Epic: Global Scope Date

#### Goal

Introduce a **single global “updated since” scope date** that controls **all data retrieval** (single chats and projects).

Data is no longer fetched implicitly or per-tab.
Users must explicitly choose a scope and refresh.

---

#### Rationale

* Numeric limits alone are misleading for large histories
* Fetching without a clear temporal scope wastes time and bandwidth
* A single global scope guarantees consistency across:

  * Single chats
  * Projects
  * Search
  * Stats

---

#### Core Changes

**1. Global scope controller**

* New global scope: **Updated since YYYY-MM-DD**
* Visible at the top of the panel
* Persisted in extension storage
* Default suggested value: *today − 3 months* (not auto-fetched)

**2. Explicit refresh workflow**

* Data is fetched **only** via:

  * Scope → Refresh
  * Scope → Change → Apply (with confirmation)
* Refresh is global:

  * Single chats
  * Projects
* UI is locked during refresh

**3. Removal of legacy list buttons**

* Removed from:

  * Single chats
  * Projects
  * Search
* Search becomes **read-only over cached data**
* Empty cache shows a clear message:

  * “No data loaded. Select a scope and refresh.”

**4. Cache & state alignment**

* Cache metadata now reflects:

  * Scope date
  * Last update timestamp
* Stats and Search operate strictly on cached data
* No silent background fetches

---

#### UI / UX Notes

* Scope label reflects **actual cache state**

  * No “fake” scope shown when cache is empty
* Calendar dialog:

  * Pre-filled with current scope
  * Validation warning before refresh
* Refresh icon available next to scope label

---
 

### v0.1.4 — Epic: Stats Tab

#### Goal

Introduce a **read-only Statistics tab** that provides insight into chat and project usage, based primarily on the **current cache snapshot**, with minimal persistent storage.

Statistics must be:

* fast (no extra API calls),
* honest (reflect only loaded data),
* non-blocking (no recalculation during listing),
* explicit about their limits.

---

## Data sources

### 1. Cache-derived snapshot (primary)

All core statistics are computed **only from the in-panel cache**, populated by:

* **Single → List single chats**
* **Projects → List projects**

No additional API calls are made by the Stats tab.

Cache arrays used:

* `cache.singleChats`
* `cache.projects[].conversations`

### 2. Persistent counters (minimal storage)

A small persistent record is stored in extension storage:

* `deletedChatsCount`
* `deletedProjectsCount`

These counters are incremented when delete actions succeed.

All other stats are derived from cache only.

---

## Snapshot totals (always visible)

Computed on demand from cache:

* **Single chats**
  `cache.singleChats.length`

* **Projects**
  `cache.projects.length`

* **Project chats**
  `sum(p.conversations.length)`

* **Total chats**
  `singleChats + projectChats`

* **Archived chats**
  `count(allChats where isArchived === true)`

* **Average chats per project**
  `projectChats / max(1, projects)`

Additional snapshot indicators:

* Largest project (by loaded chat count)
* Top projects (by loaded chat count)
* Limits used (single limit / projects limit / chats per project)
* **Last updated** timestamp (when cache was last refreshed)

---

## Activity statistics (cache-based)

### Chat creation activity (GitHub-style)

**What it shows**

* Number of chats created per day.

**Axes**

* X: date (day)
* Y: count of chats created that day

**Meaning**

Shows periods of activity and inactivity in ChatGPT usage.

**Note**

Based only on loaded chats. Older history requires increasing list limits.

---

### Chat lifetime distribution

**Metric**

* `lifetime = updateTime − createTime`

**Visualization**

* Histogram (buckets such as: 0d, 1–2d, 3–7d, 8–30d, 30d+)

**Meaning**

Shows whether chats are mostly short-lived or maintained over time.

---

## Project structure statistics

### Project size distribution

**Visualization**

* Histogram of number of chats per project

**Meaning**

Shows whether projects tend to stay small or grow large.

---

### Top projects (snapshot)

**Visualization**

* Bar chart of projects with the highest loaded chat counts

**Meaning**

Highlights where most activity is concentrated.

---

## Delete activity (persistent counters)

Stored in extension storage:

* Total conversations deleted
* Total projects deleted

Displayed as simple totals:

> “Deleted by this extension on this device”

Deletes are also logged in the audit log for detailed traceability.

---

## Performance & lifecycle rules

* Stats are **not continuously recalculated**.
* Computation happens:

  * when the Stats tab is opened,
  * or when a section is expanded.
* No work is done while Single / Projects listing is running.
* Graph rendering is deferred until the corresponding section is expanded.
* No recalculation blocks other tabs.

---

## Scope & limitations (explicit in UI)

Stats are based on **currently loaded cache only**.

The UI clearly states:

> “Statistics are computed from loaded chats and projects.
> Increase limits in Single / Projects and list again to include more history.”

---

## Non-goals (explicitly out of scope)

* No background tracking of full history
* No cross-device sync
* No reconstruction of deleted history
* No automatic periodic snapshots (yet)

---

 

### v0.1.3 — Epic: Search Tab

#### Goal

Add a **Search** tab that filters and explores conversations using the **in-panel cache** already loaded from:

* **Single → List single chats**
* **Projects → List projects** (including their conversations)

Search does **not** call the API by itself. It only works on what is currently loaded.

#### What changed

**1) Introduced a shared cache snapshot**

* Single and Projects listings write their results into a shared cache (`singleChats`, `projects[].conversations`)
* The Search tab reads from that cache and automatically re-renders when the cache changes

This keeps Search fast, predictable, and consistent with what the user has actually loaded.

**2) Search is live and cache-driven**

* Query matches against:

  * conversation `title`
  * `snippet` (when present)
  * conversation `id`
  * for project chats: also the project `title` (and optionally `gizmoId`)
* Results show:

  * conversation title
  * project name in parentheses for project conversations
  * optional small badges for metadata (e.g., archived + dates)

**3) Clear empty state**

If nothing is loaded yet, Search shows:

* “No data loaded yet. Use Single/Projects and click List.”

**4) Collapsible filters and Info panel**

* **Extra filters** (collapsed by default) to keep the Search tab compact:

  * Scope: All / Singles / Projects
  * Archived: Include / Exclude / Only
  * Updated: within + optional before/after dates
  * Created: within + optional before/after dates
* **Info** (collapsed by default):

  * explains Search uses local cache
  * shows loaded counts + current limits
  * includes buttons to trigger the same listing actions as Single/Projects to refresh the cache

**5) Live updates**

When Single/Projects loads new data (or deletes data), the cache updates and:

* Search refreshes automatically
* counts and results update without manual refresh

#### Notes / constraints

* Search coverage depends on what was loaded via limits in Single/Projects.
* Some metadata fields are often empty in real usage (e.g., starred/pinned depending on UI availability), so filters should only exist for fields that are reliably populated by the API.

---

### v0.1.2 — Epic: Placeholder Tabs + Logs + Debug Trace

#### Goals

* Add the new tab skeletons (UI only) so the architecture is ready for the next epics:

  * Organize
  * Search
  * Logs
  * Stats
* Provide **real traceability**:

  * an **Audit Log** (always on, append-only) for actions like deletes/moves
  * a separate **Debug Trace** (developer toggle) for inspecting API payloads without polluting the audit trail

---

#### Features

**1. Placeholder tabs (UI only)**

* Added tabs and empty placeholder views:

  * Organize (future: move chats into projects)
  * Search (future: discovery + bulk actions)
  * Stats (future: overview / distribution)
* No functionality yet — just visible navigation + basic layout.

---

**2. Logs tab (Audit Log UI)**

The Logs tab is now the dedicated place to view and manage the local audit trail.

* **Refresh**: reload entries from storage
* **Show (limit)**: choose how many entries to display (newest first)
* **Trim keep last (N)**: configure the keep limit
* **Trim**: applies the keep-last rule (manual, user-controlled)
* **Export JSON**: downloads the audit log as a JSON file
* **Clear**: wipes the audit log

Audit log is **append-only by design** (until the user trims/clears).

---

**3. Debug Trace (separate storage + separate lifecycle)**

Debug traces are **not mixed** with audit log entries.

* Debug is controlled via a **Debug toggle** inside the Logs tab:

  * **ON**: debug traces may be written
  * **OFF**: immediately wipes all debug traces and stops new debug writes

Debug traces are meant for temporary inspection, not long-term history.

---

**4. Auto debug while ON (API sample capture)**

When Debug is ON, the extension automatically captures a small debug sample:

* One debug entry set per **“List single chats”** run
* Source: background call to `GET /backend-api/conversations`
* Captures:

  * first item keys (shape discovery)
  * shallow preview of the first item (safe subset)

This is intentionally small to avoid spamming storage.

---

#### Storage

**Audit Log**

* Stored in `chrome.storage.local`
* Key: `cgo.actionLog`
* Object type: `ActionLogEntry[]`

**Debug Trace**

* Stored in `chrome.storage.local`
* Key: `cgo.debugTrace`
* Object type: `ActionLogEntry[]` (same entry shape, different storage + lifecycle)

Debug OFF => `cgo.debugTrace` is cleared immediately.

---

 

### v0.1.1 — Epic: Architecture Restructure

#### Goals

* Split the codebase into **clear, testable modules** with explicit responsibilities.
* Reduce “god files” and make future features (organize, logs, stats, moves) easier to extend.
* Establish consistent structure across **background**, **panel**, and **shared** layers.

#### What changed

**1. Background split**

The old single background implementation was decomposed into a structured module tree:

* **API layer**: backend calls & pagination logic
* **Executors**: long-running operations (delete chats, delete projects, move chats)
* **Session**: authentication/session fetch + token handling
* **Guards**: run locks to prevent concurrent executions
* **Utilities**: URL helpers, time helpers, etc.

Example structure:

```
src/background/
├── api/
│   ├── conversations.ts
│   └── gizmos.ts
├── executors/
│   ├── deleteConversations.ts
│   ├── deleteProjects.ts
│   └── moveConversations.ts
├── guards/
│   └── runLocks.ts
├── http/
│   └── fetchJsonAuthed.ts
├── logs/
│   └── actionLog.ts
├── session/
│   └── session.ts
├── util/
│   ├── time.ts
│   └── urls.ts
└── index.ts
```

**2. Panel split into Tabs (model/view/tab)**

Panel logic was refactored so each tab follows the same pattern:

* `model.ts`: state + operations
* `view.ts`: DOM rendering only
* `tab.ts`: glue (bind events, call model/view, handle progress via bus)

Example:

> Put state + operations in `tabs/<tab>/model.ts`, UI rendering in `tabs/<tab>/view.ts`, glue in `tabs/<tab>/tab.ts`.

Panel structure now:

```
src/panel/
├── app/
│   ├── bus.ts
│   ├── dom.ts
│   ├── format.ts
│   ├── state.ts
│   └── tabs.ts
├── tabs/
│   ├── single/
│   │   ├── model.ts
│   │   ├── tab.ts
│   │   └── view.ts
│   ├── projects/
│   │   ├── model.ts
│   │   ├── tab.ts
│   │   └── view.ts
│   ├── logs/
│   ├── organize
│   ├── search
│   └── stats
├── panel.ts
├── panel.html
└── panel.css
```

**3. Shared split (types + messages)**

Shared was restructured into explicit protocol modules, with a clean “barrel” export.

```
src/shared/
├── types/
│   ├── conversations.ts
│   ├── projects.ts
│   ├── logs.ts
│   └── index.ts
│
├── messages/
│   ├── msg.ts              ← constants only (MSG)
│   ├── conversations.ts    ← list chats protocol
│   ├── projects.ts         ← list/delete projects protocol
│   ├── logs.ts             ← ping + execute-delete protocol
│   └── index.ts            ← re-exports (barrel)
```

#### Notes

* This epic is **structural**: behavior should remain the same (no intentional regressions).
* Some future tabs/files are intentionally present but still empty (placeholders for the next epics).

---

### v0.1.0 — Epic: Lock Previous v0.0.x

#### Goals

* Freeze the completed v0.0.x patch history into the first **minor release line**.
* Create a stable baseline (v0.1.0) before starting the major architecture refactor in v0.1.x.

#### What changed

* Created the first minor release **v0.1.0**
* Confirmed that all v0.0.x epics/features are included unchanged
* Established the new development track for architecture changes in **v0.1.1+**

### v0.0.15 — Epic: Dual Progress for Project Cleanup

#### Goals

* Make long cleanup runs readable at a glance
* Show separate progress for:

  * conversations deletion
  * projects deletion

#### Features

**1. Conversations progress (Projects tab)**

* Progress bar + live counts for deleted chats during project cleanup

**2. Projects progress**

* Separate progress bar + live counts while deleting selected projects

**3. Event-driven updates**

* New background progress events for project deletion:

  * progress per project
  * final summary

**4. Resilient UX**

* Progress keeps updating even if individual deletes fail
* Clear summary: projects ok/failed + chats ok/failed


---

### v0.0.14 — Epic: Fix Project Delete Message Wiring

#### Goals

* Make “Delete selected projects” work end-to-end without regressions

#### Fixes

* Add missing `DELETE_PROJECTS` message contract in `shared/messages.ts`
* Add background handler for project deletion:

  * `DELETE /backend-api/gizmos/<gizmoId>`
* Keep existing chat listing + project listing logic unchanged
* Ensure panel receives structured per-project results (ok/status/error)
---

### v0.0.13 — Epic: New UX Structure + Project Delete Flow (Partial)

#### Goals

* Rename/Delete view evolution into a clearer structure:

  * “Single chats” (non-project area)
  * “Projects” (projects + their chats)
* Add a “delete project” path (after deleting its conversations)

#### Features

* New panel UI with:

  * Single chats tab (selection + delete)
  * Projects tab (expand conversations)
  * Project-level checkbox to select a whole project
  * Conversation-level checkboxes inside a project
* Execute delete for conversations remains soft-delete (`PATCH is_visible:false`) with retry/backoff + progress

#### Known issue

* Project deletion step fails with **“Unknown message.”**

  * Conversations delete correctly
  * Project delete request is not routed/handled in background

---


### v0.0.12 — Epic: Backend Listing (Stable)

#### Goals

* List **all chats** reliably without depending on sidebar DOM scraping
* List **all Projects** and fetch **their conversations**

#### Features

* Backend session token fetch via `https://chatgpt.com/api/auth/session`
* Chat listing via `GET /backend-api/conversations` (paged)
* Project listing via `GET /backend-api/gizmos/snorlax/sidebar` (paged)
* Project conversations via `GET /backend-api/gizmos/<gizmoId>/conversations` (paged)
* Progress events for long scans (projects + chats)

---

### v0.0.11 — Epic: Project Deep Scan (Loop Projects + Standalone Chats)

#### Goals

* Retrieve **project → conversations** beyond what is currently visible in the sidebar
* Retrieve **standalone (non-project) chats** more completely
* Add **limits + progress + cancel** so it never runs forever

#### Features

**1. Project Deep Scan (loop through projects)**

* New scan mode that:

  * opens “See more” overlay to get the full project list
  * iterates projects up to a limit (default **50**)
  * for each project:

    * navigate/click into the project context
    * expand the project (if needed)
    * scrape visible nested conversations
    * store results and continue
* Output: a merged list of `ProjectItem { title, href, conversations[] }`

**2. Standalone Chats Deep Scan (not in project context)**

* New scan mode to better collect chats that are **not associated with a project**
* Uses auto-scroll until:

  * limit reached (default **50**, configurable)
  * or “no new items” threshold is hit

**3. Limits control (avoid hours-long runs)**

* Add a control in the panel:

  * default `50`
  * options like `50 / 100 / 200 / 400`
* Used by:

  * Project Deep Scan
  * Standalone Deep Scan

**4. Progress + cancel for long scans**

* Show progress while scanning:

  * current project index / total projects
  * conversations collected so far
  * “step” for scrolling scans
* Add cancel support for:

  * project loop scan
  * standalone deep scan

**5. Button naming cleanup (UI clarity)**

* Rename buttons so they describe what they really do:

  * “List standalone chats (visible)”
  * “List standalone chats (scroll)”
  * “List projects (visible)”
  * “Deep scan projects (loop)”
* Delete actions remain unchanged.

**6. Safety / stability rules**

* Never run two long operations at once (scan lock)
* Per-project delays + jitter
* Timeouts per project navigation so a single broken project doesn’t stall the whole run
* Always return partial results with a note if interrupted/canceled



---

### v0.0.10 — Epic: Reliable Scraping (Chats + Projects)

#### Goals

* Make “Projects” scraping **match the real sidebar DOM** (New project row + expandable projects + See more)
* Extract **as much structured data as possible** without heavy navigation loops
* Keep the delete workflow untouched (selection, confirm box, execute progress)

#### Features

**1. Projects sidebar support (new DOM)**

* Detect the Projects expando section reliably
* Ignore the **“New project”** pseudo-row (not an anchor)
* Identify real projects via:

  * `a[data-sidebar-item="true"][href^="/g/"][href$="/project"]`

**2. Auto-expand visible projects (best-effort)**

* Before scraping projects, click every collapsed chevron:

  * `button.icon[data-state="closed"]`
* This exposes the nested conversations for the visible projects in the sidebar

**3. “See more” overlay handling (best-effort)**

* Find and click the Projects “See more” row
* Detect the overlay root (dialog/menu/radix wrapper fallback)
* Scrape all overlay project links and merge them with sidebar projects

  * Sidebar entries win (they contain conversations)

**4. Report clarity**

* Return a `note` when:

  * overlay could not be opened
  * overlay opened but conversations are not accessible there
* Panel shows: `Done: X project(s) (note…)`

**5. No UI refactor**

* Panel layout stays the same in 0.0.10
* Focus is scraper correctness + stability

---
 

### v0.0.9 — Epic: Read ChatGPT Projects

#### Goals

* Show **all visible ChatGPT projects** in the extension
* Remove the “only 5 projects” limitation
* Allow browsing project → conversations comfortably

#### Features

**1. New Projects tab behavior**

* If ChatGPT projects are detected:

  * show them instead of the local-only projects list
* If not detected:

  * show a clear message:
    “Open ChatGPT and expand Projects (click ‘See more’)”

**2. Project list**

* One card per project:

  * project name
  * number of conversations
* Expand/collapse project in the panel

**3. Conversation list per project**

* Show all conversations in that project
* Click opens the chat in a new tab
* Optional checkbox (future use)

**4. No language dependency**

* Detection based on DOM structure
* No string matching on “Projects”, “New Project”, etc.

--- 

## v0.0.8 — Panel tabs  Projects  

### Key changes
* Tab bar: “Delete” | “Projects”
* Persist active tab 
* Basic CRUD: add/edit/delete project
 
---

## v0.0.7 — Progression in delete

### Key changes

* **Live deletion progress (no more “stuck on deleting…”)**

  * Adds a progress bar + live status line while deleting
  * Shows current position (`i/N`), ok/failed counts, last operation duration, elapsed time

* **Per-conversation delete log**

  * Each conversation deletion is logged as it completes:

    * success: title/id + HTTP status + duration
    * failure: title/id + status + attempt count + error message

* **Immediate UI update while deleting**

  * Successfully deleted conversations are removed from the “Found” list immediately
  * Selection/counts update live (no need to wait for a full re-scan)

* **More reliable long runs under MV3**

  * Panel no longer relies on a single long `sendResponse()` to finish
  * Background emits progress and completion events (`EXECUTE_DELETE_PROGRESS`, `EXECUTE_DELETE_DONE`), so the UI keeps updating even when the final response is lost

* **Retries + backoff for real-world rate limiting**

  * Automatic retry policy for transient failures:

    * 429: backoff (5–15s + jitter), retry up to 2 times
    * 5xx: backoff (2–5s), retry once
    * network errors: retry once
  * Batch runs finish cleaner instead of leaving a big tail of failures

* **Run identity**

  * Each delete run gets a `runId`
  * Progress messages are tied to that run to avoid mixing outputs between runs



---

## v0.0.6 — Safe Execute UX + Deep Scan foundation

### Key changes

- **Minimum safe UX for “Execute delete”**
  - Single execute action (no dry-run UI exposed)
  - Explicit confirmation block:
    - Count of conversations
    - Preview of first 5 titles + “and X more…”
    - One confirmation checkbox
    - Confirm / Cancel buttons
  - No typing “DELETE”, no multi-step dialogs

- **Deep Scan (auto-scroll)**
  - New “Deep scan (auto-scroll)” action
  - Content script automatically scrolls the ChatGPT sidebar
  - Incremental collection with deduplication
  - Progress feedback (“Collected N… step X”)
  - Cancel support

- **Busy-state protection**
  - Disable scan, selection, and execute actions while:
    - deep scan is running
    - delete execution is running
  - Prevents re-entrancy and accidental mixed actions

- **Execute delete hardening**
  - Background-side re-entrancy guard
  - Throttled PATCH requests with jitter
  - Structured per-ID results (ok / failed / status)

- **UI simplification**
  - Removed “Select all” / “Select none” buttons
  - Kept a single “Toggle all” control
  - Removed visible dry-run + report UI (code retained internally)

---

## v0.0.5 — Dry-run preview + Execute delete (ChatGPT API)

### Key changes

* **Dry-run delete preview**

  * “Delete selected (dry-run)” button
  * Generates a detailed report showing:

    * conversation title
    * conversation ID
    * conversation URL
  * Confirms login state and prepares the exact ChatGPT API requests
  * No deletion performed during dry-run

* **Execute delete (real action)**

  * “Delete selected (execute)” button
  * Performs **soft-delete** via ChatGPT REST API
    (`PATCH /backend-api/conversation/{id}` → `is_visible: false`)
  * Throttled execution (e.g. ~600 ms between requests)
  * Per-conversation result reporting (ok / failed, HTTP status)

* **Safety mechanisms**

  * Explicit confirmation step before execution:

    * number of selected conversations
    * preview list
    * confirmation checkbox acknowledging irreversible action in extension
  * Clear separation between dry-run and execute actions
  * Clear report button to reset output

* **Result reporting**

  * Execution summary:

    * success / failure counts
    * per-ID status
  * User guidance note:

    * ChatGPT UI may require manual page refresh to reflect deletions

* **Architecture**

  * Background script handles authenticated API calls
  * No token leakage (authorization headers redacted in UI)
  * All actions remain local to the browser (no external servers)

---

## v0.0.4 — Network-backed dry-run delete

### Key changes

* **Network-backed dry-run delete**

  * Verifies login state via `chatgpt.com/api/auth/session`
  * Builds the exact HTTP requests that would be sent for deletion
  * Uses `PATCH /backend-api/conversation/{id}` with `{ is_visible: false }`
  * Requests are prepared but **never executed**

* **Combined dry-run reporting**

  * Local dry-run report (selected titles, ids, URLs)
  * Network dry-run preview appended below
  * Clearly marked as **DRY-RUN ONLY**

* **Safety guarantees**

  * Access token is never exposed in UI (redacted)
  * No destructive request is sent
  * Failure modes reported explicitly (not logged in, no response, etc.)

---

## v0.0.3 — Local dry-run + selection UX

### Key changes

* **Conversation selection**

  * Checkbox per conversation
  * Selected count displayed
  * Visual highlight for selected rows

* **Selection helpers**

  * Select all
  * Select none
  * Toggle-all checkbox with indeterminate state

* **Local dry-run**

  * Generates a textual report listing:

    * conversation titles
    * ids
    * URLs
  * No network calls involved
  * Purely informational

---

## v0.0.2 — Interactive panel + scraping

### Key changes

* **Side panel UI**

  * Custom panel available on `chatgpt.com`
  * Manual “Scan conversations” action

* **Content-script scraping**

  * Extracts conversations from ChatGPT sidebar
  * Deduplicates by conversation id
  * Normalizes conversation URLs

* **Panel rendering**

  * Lists conversation titles and links
  * Live count of discovered conversations

---

## v0.0.1 — Initial prototype

### Key changes

* **Extension skeleton**

  * Manifest v3
  * Background service worker
  * Content script
  * Side panel wiring

* **Message bus**

  * Typed message protocol between panel, background, and content script

* **Basic scan**

  * Proof-of-concept conversation discovery from DOM

---

 
