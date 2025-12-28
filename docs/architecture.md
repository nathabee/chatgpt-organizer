# Architecture — ChatGPT Organizer

This document describes the architecture of the ChatGPT Organizer Chrome extension,
its main components, and how data flows between them.

The extension is built using **Chrome Manifest V3** and follows the standard
**Panel ↔ Background ↔ Content Script** model.

---

## Overview

The extension is composed of three primary runtime contexts:

1. **Panel (UI)**
2. **Background (service worker)**
3. **Content Script (page context)**

Each context has a strict responsibility. No context is overloaded with duties it
should not own.

```

┌────────────┐
│   Panel    │  (UI, user actions)
└─────┬──────┘
│ chrome.runtime.sendMessage
▼
┌────────────┐
│ Background │  (routing, auth, network)
└─────┬──────┘
│ chrome.tabs.sendMessage
▼
┌────────────┐
│  Content   │  (DOM access, scraping, scrolling)
│  Script    │
└────────────┘

```

---

## Manifest V3 constraints

This extension uses **Manifest V3**, which imposes the following constraints:

- Background logic runs in a **service worker**
- No persistent in-memory state can be relied on
- All long-running work must be:
  - event-driven, or
  - performed in content scripts

Design consequences:

- The background acts as a **router and executor**, not a controller with state.
- All UI state lives in the panel.
- All DOM access lives in the content script.

---

## Panel (src/panel)

### Responsibilities

The panel is responsible for:

- Rendering the conversation list
- Managing selection state
- Displaying progress and status
- Enforcing safe UX for destructive actions
- Initiating scans and delete operations

### What the panel does NOT do

- It does not access the page DOM
- It does not perform network requests
- It does not manage authentication
- It does not scroll or manipulate the ChatGPT UI directly

### Key files

- `panel.html` — UI structure
- `panel.css` — presentation
- `panel.ts` — state, UX logic, messaging

---

## Background (src/background.ts)

### Responsibilities

The background service worker acts as a **privileged broker**.

It is responsible for:

- Routing messages between panel and content script
- Determining the active ChatGPT tab
- Fetching session/auth information
- Executing network requests (delete operations)
- Throttling and guarding destructive operations

### Design decisions

- All network calls (PATCH delete) live in the background
- Authentication tokens are fetched only when needed
- A re-entrancy guard prevents multiple delete executions
- The background never inspects or manipulates DOM

### Why delete is done here

- Content scripts should not perform authenticated fetches
- Panel should not hold tokens
- Background is the only context designed for this privilege level

---

## Content Script (src/content.ts)

### Responsibilities

The content script is the **only component allowed to touch the page DOM**.

It is responsible for:

- Scraping visible conversation items
- Performing deep scans by auto-scrolling the sidebar
- Deduplicating conversations across virtualized UI
- Emitting progress events during deep scans

### Scan modes

#### Quick Scan
- Reads conversations currently present in the DOM
- Fast, non-intrusive
- Limited to what the UI has loaded

#### Deep Scan (auto-scroll)
- Programmatically scrolls the sidebar container
- Collects conversations incrementally
- Stops when no new items appear
- Supports cancellation
- Reports progress back to the panel

### What the content script does NOT do

- It does not store long-term state
- It does not execute deletes
- It does not access cookies or tokens
- It does not call backend APIs directly

---

## Message contracts (src/shared/messages.ts)

All communication is explicit and typed.

### Characteristics

- No implicit side effects
- Clear request/response shapes
- Progress events are fire-and-forget
- Background never assumes UI state

### Example flow (Deep Scan)

1. Panel → Background: `DEEP_SCAN_START`
2. Background → Content: `DEEP_SCAN_START`
3. Content → Panel: `DEEP_SCAN_PROGRESS` (repeated)
4. Content → Background → Panel: final scan result

---

## Data flow summary

### Scan conversations

```

Panel → Background → Content Script → Background → Panel

```

### Execute delete

```

Panel → Background → ChatGPT backend

```

### Deep scan progress

```

Content Script → Panel (runtime message)

```

---

## Safety principles

This extension follows strict safety rules:

- Destructive actions are always explicit
- No background automation without user intent
- No silent batch deletes
- UI is disabled during critical operations
- No mixing scan and delete operations

---

## Non-goals

The extension intentionally does NOT:

- Use undocumented REST APIs for listing conversations
- Persist a full conversation database
- Bypass ChatGPT UI behavior
- Hide destructive actions behind shortcuts or automation

---

## Rationale

The architecture favors:

- Stability over cleverness
- Explicit UX over automation
- DOM-based scanning over brittle API scraping
- Clear separation of concerns

This keeps the extension robust against UI changes and
maintainable as Chrome MV3 evolves.

--- 