## ChatGPT Organizer (CGO)

<a href="https://nathabee.github.io/chatgpt-organizer/index.html">
  <img src="./docs/cgo.svg" alt="CGO Logo" width="300" style="vertical-align:middle; margin-right:20px;">
</a>

<img src="./docs/icon.svg" alt="CGO Icon" width="60" style="vertical-align:middle; margin-right:20px;">

**ChatGPT Organizer** is a browser extension that gives you **visibility and control** over your own ChatGPT conversations.

It started as a cleanup tool.
As of **v0.1.x**, it is evolving into a **long-term organization and inspection tool**.

The philosophy is simple:

> **Show what exists. Let the user decide. Execute explicitly.**

No server. No sync. No automation behind your back.

---

## What this extension does (and does not)

### Does

* Runs entirely in your browser
* Uses your existing ChatGPT login session
* Retrieves chats and projects via the same backend APIs the ChatGPT UI uses
* Fetches data **only when explicitly requested**
* Keeps a local, auditable action log
* Stores all data locally (cache + stats counters)

### Does NOT

* Store credentials
* Sync data anywhere
* Access other accounts
* Modify chats automatically
* Pretend deletions are reversible
* Fetch data silently in the background

---

## UI Overview

**Search tab**
![ChatGPT Organizer UI search tab](docs/screenshots/screenshot-chatgpt-organizer-search.png)

**Projects tab**
![ChatGPT Organizer UI project tab](docs/screenshots/screenshot-chatgpt-organizer-projects.png)

**Logs tab**
![ChatGPT Organizer UI logs and debug tab](docs/screenshots/screenshot-chatgpt-organizer-logs.png)

**Stats tab**
![ChatGPT Organizer UI stats tab 1](docs/screenshots/screenshot-chatgpt-organizer-stats-1.png)
![ChatGPT Organizer UI stats tab 2](docs/screenshots/screenshot-chatgpt-organizer-stats-2.png)

The side panel is organized into **explicit tabs**, each with a single responsibility.

---

## Tabs at a glance

| Tab          | Status        | Purpose                                                      |
| ------------ | ------------- | ------------------------------------------------------------ |
| **Single**   | ✅ Active      | Inspect and delete standalone (non-project) chats            |
| **Projects** | ✅ Active      | Inspect projects and conversations, delete chats or projects |
| **Search**   | ✅ Active      | Search across *loaded cache only* (singles + projects)       |
| **Stats**    | ✅ Active      | Read-only statistics derived from the current cache          |
| **Logs**     | ✅ Active      | Audit log and debug trace                                    |
| **Organize** | ⏳ Placeholder | Future: move / reorganize chats into projects                |

---


## Core features (current)

### Single chats

* Inspect standalone chats retrieved within the selected scope
* Checkbox selection with live counters
* Bulk delete with:

  * explicit confirmation
  * throttling
  * progress feedback
  * per-item results
* Cache is updated immediately after deletions

### Projects

* Inspect all projects retrieved within the selected scope
* Expand projects to see conversations
* Select:

  * individual conversations
  * entire projects
* Deletion flow:

  1. conversations are deleted first
  2. project is deleted afterwards (only if empty)
* Separate progress tracking for chats vs projects

### Search

Search is **cache-driven**, not magic.

* Searches only what is currently loaded from the cache
* No backend calls
* Live updates when cache changes
* Matches against:

  * conversation title
  * conversation id
  * project title (for project chats)

Empty state is explicit:

> “No data loaded. Select a scope and refresh.”

---

## Stats tab

The **Stats tab is strictly read-only**.

It computes statistics from the **current cache snapshot only**.

### Snapshot totals

* Number of:

  * single chats
  * projects
  * project chats
  * total chats
* Archived chats (if present in cache)
* Average chats per project
* Last cache update timestamp
* Active limits used during retrieval

### Activity

* Chat creation activity over the **retrieved time range**

  * Not hard-coded to “last 16 weeks”
  * Heatmap spans from the oldest retrieved chat to the newest
* Distribution of chat lifetime:

  * same day
  * 1–2 days
  * 3–7 days
  * 8–30 days
  * 31+ days
  * unknown (missing timestamps)

### Project structure

* Project size distribution
* Top projects by loaded conversation count

### Persistent counters

* Number of deleted chats (this device)
* Number of deleted projects (this device)

Everything else is derived — no hidden tracking.

---

## Logs

There are **two intentionally separate logs**.

### Audit log

* Append-only by default
* Records:

  * deletions
  * project removals
  * bulk operations
* Stored locally
* User can:

  * limit view
  * trim
  * export
  * clear manually

### Debug trace

* Developer-oriented
* Explicit ON/OFF toggle
* OFF = wiped immediately
* Captures **small API shape samples only**
* Never stores full payloads

No fake “undo”.
Only traceability.

---

## Installation from GitHub Release (ZIP)

You **do not need to be a developer** to install ChatGPT Organizer.

1. Go to the **GitHub Releases** page

2. Download the latest **ZIP archive**

3. Extract it somewhere on your computer

4. Open Chrome and go to:

   ```
   chrome://extensions
   ```

5. Enable **Developer mode**

6. Click **Load unpacked**

7. Select the extracted folder (containing `manifest.json`)

Open ChatGPT → open the side panel.

This is the **intended installation path for normal users**.

---

## Development (optional)

Only needed if you want to modify or build the extension yourself.

```bash
npm install
npm run build
```

Build output goes to:

```
dist/
```

Load the extension from `dist/` via **Load unpacked**.

---

## Status

**v0.1.5 — Active development**

Core architecture is stable.
Scope-based retrieval and cache-driven inspection are now in place.

Placeholder tabs are intentional and visible so future features slot in without rewrites.

---

## Documentation & project page

<a href="https://nathabee.github.io/chatgpt-organizer/index.html">
  <img src="./docs/visitgithubpage.svg" alt="CGO Docs" width="300" style="vertical-align:middle;">
</a>

---

## License

MIT — see `LICENSE`

---
 