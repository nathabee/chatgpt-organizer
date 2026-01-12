# ChatGPT Organizer — User Manual

ChatGPT Organizer (CGO) is a browser extension that gives you visibility, control, and structure over your ChatGPT conversations.

This manual explains **how to use the extension step by step**, what each section does, and what actions are safe or destructive.

---

## 1. Getting Started

### 1.1 Open the Extension

1. Open **chatgpt.com**
2. Open the **ChatGPT Organizer** side panel (Chrome extensions panel)
3. The main interface appears with:
   - Scope bar (top)
   - Tabs (Single, Projects, Organize, Search, Logs, Stats)

---

## 2. Scope & Data Fetching (Mandatory First Step)

Before using any tab, you must **select a scope and fetch data**.

### 2.1 Scope Bar (Top Section)

The scope defines **which chats are fetched from ChatGPT**.

**Scope = “Updated since …”**

This applies to:
- Single chats
- Projects
- Project chats

#### Controls

- **Change…**
  - Opens a dialog to select a date
  - Defines the lower bound for fetched chats
- **Refresh**
  - Fetches data using the current scope
  - Required after changing the scope

#### Status Indicators

During fetching:
- Buttons are disabled
- Status shows:
  - `Fetching…`
  - `Idle`
  - `Done`
- Fetching chatgpt.com **can take time** (network + API latency)

This is expected behavior.

---

### 2.2 Fetch Info and Settings

Open **“Fetch info and settings”** to see cache details.

Displayed information:
- Loaded single chats
- Loaded projects
- Loaded project chats

#### Limits

These limits affect **what is fetched and cached**:

- **Single limit**
- **Projects limit**
- **Chats per project**

Important:
- Search and Stats work **only on the loaded cache**
- Increasing limits requires another **Refresh**

---

## 3. Tabs Overview

Available tabs:

- Single Chats
- Projects
- Organize
- Search
- Logs
- Stats

Each tab works on the **currently loaded cache**.

---

## 4. Single Chats Tab

**Purpose:**  
Manage chats that are **not attached to any project**.

### What you can do

- View all loaded single chats
- Select individual or all chats
- Permanently delete selected chats

### Key Actions

- **Toggle all**
  - Selects / unselects visible chats
- **Delete selected (execute)**
  - Starts a destructive operation
  - Requires explicit confirmation

### Confirmation Flow

Before deletion:
- Preview list is shown
- You must check:
  - *“I understand this can’t be undone here.”*
- Then confirm deletion

Progress and execution status are displayed live.

---

## 5. Projects Tab

**Purpose:**  
Manage ChatGPT projects and their conversations.

### What you can do

- View projects and included chats
- Create new projects
- Select projects and/or chats
- Permanently delete projects and their chats

### Important Notes

- Deleting a project deletes **all its chats**
- Deletions are irreversible

### Execution Flow

- Select projects or chats
- Click **Delete selected projects + chats**
- Confirm explicitly
- Progress bars show execution state

---

## 6. Organize Tab

**Purpose:**  
Move chats into projects **without deleting anything**.

### Layout Overview

The view is split into four panes:

1. Source chats
2. Destination projects
3. Action & confirmation
4. Logs & progress

---

### 6.1 Source Chats

- Source can be:
  - All loaded chats
  - Single chats only
  - Project chats only
- Filter chats by text
- Select individual or all visible chats

---

### 6.2 Destination Project

- Select an existing project
- Or create a new project directly
- Only **one target project** can be active

---

### 6.3 Move Operation

Steps:
1. Select source chats
2. Select a destination project
3. Click **Move to project**
4. Confirm the operation

This action:
- Changes project membership
- Does **not delete chats**

Execution progress and logs are shown live.

---

## 7. Search Tab

**Purpose:**  
Search and filter chats across the loaded cache.

### Important Rule

Search works **only on loaded data**.  
If something is missing:
- Increase limits
- Refresh data

---

### Search Features

- Full text search
- Filters:
  - Scope (single / projects)
  - Archived state
  - Created / updated time ranges
  - Date ranges

### Actions

- Clear search
- Reset filters
- List single or project chats again

Results update instantly based on filters.

---

## 8. Logs Tab

**Purpose:**  
Audit and debugging visibility.

### 8.1 Audit Log

- Always enabled
- Tracks actions performed by the extension
- Stored locally

Actions:
- Refresh
- Trim
- Export as JSON
- Clear

---

### 8.2 Debug Trace

- Optional
- Disabled by default
- When disabled, debug data is wiped

Controls:
- Enable / disable debug
- Limit displayed entries
- Export debug JSON
- Clear debug logs

---

### Configuration Section

Advanced options:
- Trace scope (console)
- Stop after N out-of-scope projects
- Reset defaults

---

## 9. Stats Tab

**Purpose:**  
Read-only analytics based on the current cache.

### Key Principle

Stats reflect **only loaded data**.  
They are not global ChatGPT statistics.

---

### Available Statistics

- Total chats
- Single chats
- Projects
- Project chats
- Archived chats
- Average chats per project

Additional sections:
- Activity timelines (planned)
- Project size distribution (planned)
- Delete counters (stored locally)

Use **Recalculate** to refresh stats after data changes.

---

## 10. Safety & Data Notes

- All destructive actions require confirmation
- No silent deletes
- No background operations without user action
- Data is fetched on demand
- Logs and stats are stored locally

---

## 11. Typical Workflow

1. Set scope
2. Refresh data
3. Review Single / Projects
4. Organize chats into projects
5. Search and verify
6. Check stats
7. Review logs if needed

---

## 12. Final Notes

ChatGPT Organizer is designed for:
- Transparency
- Explicit actions
- User-controlled operations

Nothing is hidden. Nothing is automatic.  
You stay in control.

