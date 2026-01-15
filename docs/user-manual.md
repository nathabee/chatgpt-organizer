# ChatGPT Organizer — User Manual

ChatGPT Organizer (CGO) is a browser extension that gives you visibility, control, and structure over your ChatGPT conversations.

This manual explains **how to use the extension step by step**, what each section does, and what actions are safe or destructive.

---

## 1. Getting Started

### 1.1 Open the Extension

1. Open **chatgpt.com**
2. Open the **ChatGPT Organizer** side panel
3. The interface contains:

   * **Scope bar** (top)
   * **Tabs** (Single Chats, Projects, Organize, Search, Settings, plus optional Logs and Stats)

### 1.2 Developer Tools Visibility

Some UI is hidden unless you enable developer tools.

* The **Logs** and **Stats** tabs may be hidden by default.
* In **Settings → General**, enable:

  * **Show developer tools (Logs, Stats, debug options)**

When disabled:

* **Logs** and **Stats** tabs are hidden.
* **Developer** section in Settings is hidden.
* **Connection** section in Settings is hidden (advanced option).

---

## 2. Scope & Data Fetching (Mandatory First Step)

Before most tabs are useful, you must **set a scope** and **refresh** to load data.

### 2.1 Scope Bar (Top Section)

The scope defines which chats are fetched:

* **Scope: Updated since …** (date lower bound)

This scope applies to:

* Single chats
* Projects
* Project chats

#### Controls

* **Change…**

  * Opens the *Set scope* dialog
  * Select **Updated since** date
* **Refresh**

  * Fetches Single + Projects using the current scope

#### Status Indicators

In the scope bar you see:

* **Single status** (`Idle`, `Fetching…`, `Done`, errors)
* **Projects status** (`Idle`, `Fetching…`, `Done`, errors)

Fetching can take time. While busy, buttons are disabled.

---

### 2.2 Fetch Info and Settings (Scope Bar Details)

Open **Fetch info and settings** to see:

**Cache snapshot**

* Single: loaded single chats count
* Projects: loaded projects count
* Project chats: loaded project chat count

#### “List single / List projects” buttons

These exist in the DOM but are currently hidden (`is-hidden`). They are not part of the normal workflow anymore.

---

## 3. Settings Tab (New Central Configuration)

The **Settings** tab replaces parts that used to live in Scope or Logs.

### 3.1 General

* **Show developer tools (Logs, Stats, debug options)**

  * Enables advanced UI.
  * When OFF: hides Logs/Stats tabs + hides advanced sections in Settings.

### 3.2 Fetching

Controls how much data is fetched and cached.

* **Single limit**
* **Projects limit**
* **Chats / project**

Important:

* **Search** and **Stats** work only on what is currently **loaded in the cache**.
* If you increase limits, you must **Refresh** again (scope bar) to load more.

### 3.3 Connection (Developer tools only)

This is an advanced setting and normally should not be changed.

* **ChatGPT origin**

  * Default: `https://chatgpt.com`
* **Reset**

  * Restores the default origin

Only useful if ChatGPT is served from a different host.

### 3.4 Developer (Developer tools only)

Advanced developer-only settings:

* **Trace scope (console)**
* **Stop after N out-of-scope projects**
* **Action log max stored entries**
* **Debug trace max stored entries**
* **Max failure entries per run**
* **Debug enabled (OFF wipes all debug traces)**
* **Reset defaults**

  * Resets developer config defaults (note: debug enabled is a separate system; if you want it reset too, treat it as part of the reset logic in code)

### 3.5 About

* Shows **Version**
* GitHub link

---

## 4. Tabs Overview

Main tabs:

* **Single Chats**
* **Projects**
* **Organize**
* **Search**
* **Settings**

Developer tools tabs (only visible when enabled in Settings → General):

* **Logs**
* **Stats**

All functional tabs operate on the **currently loaded cache** (from Refresh).

---

## 5. Single Chats Tab

**Purpose:** Manage chats **not attached to any Project**.

### What you can do

* View loaded single chats
* Select chats
* Permanently delete selected chats

### Key UI

* **Toggle all** (select/unselect visible items)
* **Delete selected (execute)** (destructive)

### Confirmation Flow (Required)

Before deletion:

* A confirmation box appears with:

  * Title + preview list
  * Checkbox: **I understand this can’t be undone here**
  * Buttons: **Yes, delete** / **Cancel**

Progress is shown with:

* Log output (`singleExecOut`)
* Progress bar (`singleExecProgressWrap`)

---

## 6. Projects Tab

**Purpose:** Manage projects and their loaded conversations.

### What you can do

* View projects and chats
* Create projects (via the mounted create project component)
* Select projects and/or chats
* Permanently delete selected projects + chats

### Key UI

* **Delete selected projects + chats (execute)** (destructive)
* Confirmation + preview required
* Progress indicators:

  * Chats progress bar
  * Projects progress bar

Important:

* Deleting a project deletes its chats (irreversible).

---

## 7. Organize Tab

**Purpose:** Move chats into a project (no deletion).

### Layout (4 panes)

1. **Source chats**
2. **Destination project**
3. **Action & confirmation**
4. **Logs & progress**

### 7.1 Source chats

* Choose source:

  * All loaded (single + project chats)
  * Single only
  * Projects only
* Filter chats
* Toggle all visible chats

### 7.2 Destination project

* Filter projects
* Select exactly one target project
* Clear target button
* Create project component also exists here

### 7.3 Move operation

Steps:

1. Select source chats
2. Select destination project
3. Click **Move to project**
4. Confirm

This modifies project membership and does not delete anything.

---

## 8. Search Tab

**Purpose:** Search within the loaded cache and filter results.

### Rule: Search uses loaded data only

If you do not find something:

* Increase **Fetching** limits in **Settings**
* **Refresh** scope again

### Search UI

Top bar:

* Search input
* **Clear**
* **Reset filters**
* Hidden buttons exist in DOM: **List single / List projects** (not part of normal workflow)

Filters:

* Scope (All / Single / Projects)
* Archived (Include / Exclude / Only)
* Updated within
* Created within
* Updated after/before (date)
* Created after/before (date)

Info box shows:

* Loaded counts (single/projects/project chats)
* Limit hint
* Result count
* Status

Results list updates based on filters.

---

## 9. Logs Tab (Developer tools only)

**Purpose:** Audit history and debug traces.

### 9.1 Audit log

Local history of extension actions.

Controls:

* Show limit
* Refresh
* Trim keep last
* Export JSON
* Clear

### 9.2 Debug trace

Developer debugging traces.

Controls:

* Show limit
* Refresh debug
* Export debug JSON
* Clear debug

Note:

* Debug enable/disable is managed in **Settings → Developer**.
* When debug is turned OFF, traces are wiped by design.

---

## 10. Stats Tab (Developer tools only)

**Purpose:** Read-only statistics computed from the current cache.

### Key Principle

Stats reflect only what is currently loaded.

Top bar:

* **Recalculate**
* Status
* Last cache update

Sections:

* Snapshot totals (single/projects/project chats/total/archived/avg chats per project)
* Activity (placeholders)
* Project structure (placeholders)
* Deletes (this device): persistent counters

---

## 11. Safety & Data Notes

* Destructive actions always require confirmation.
* No silent deletes.
* Fetching is user-triggered via Refresh.
* Search/Stats are cache-based; they do not fetch new data.

---

## 12. Typical Workflow

1. Set scope (**Change…**)
2. Refresh data (**Refresh**)
3. Adjust limits in **Settings → Fetching** if needed
4. Use **Single Chats** / **Projects**
5. Use **Organize** to move chats into projects
6. Use **Search** to verify and filter
7. Enable developer tools if you need Logs/Stats

---
 