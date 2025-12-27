# ChatGPT Organizer — Project Overview

**ChatGPT Organizer** is a browser extension designed to help users inspect, organize, and clean up their ChatGPT conversation history.

The project focuses on a practical problem:  
long conversation histories become hard to manage and can noticeably slow down the ChatGPT web interface, especially in browsers with limited memory handling.

---

## Motivation

ChatGPT currently allows users to:
- delete conversations one by one, or
- delete all conversations at once

What is missing is **controlled, selective cleanup**:
- delete conversations older than a given date
- review and unselect conversations before deletion
- understand what will be removed before committing

ChatGPT Organizer exists to fill that gap.

---

## What the extension does

### Current capabilities
- Runs as a **client-side browser extension**
- Adds a **Side Panel UI** to `chatgpt.com`
- Lists conversations from the active ChatGPT session
- Displays the number of detected conversations
- Requires no server and no external services

### Planned capabilities
- Filter conversations by **date range**
- Checkbox-based selection with a live counter
- Safe bulk deletion with:
  - dry-run mode
  - explicit user confirmation
  - throttling and progress feedback
- Keyword-based filtering (titles first, content later)
- Basic statistics (age distribution, volume over time)
- Optional archiving instead of deletion (if supported)

---

## Design principles

- **Local-first**: runs entirely in the browser
- **No tracking**: no analytics, no telemetry
- **Transparent**: readable, auditable source code
- **Incremental safety**: destructive actions are introduced carefully
- **Minimal dependencies**: no framework, no server

---

## Technical overview

- Browser extension (Chrome / Chromium, Manifest V3)
- TypeScript
- esbuild
- Side Panel UI (Chrome API)
- Content scripts operating in the user’s logged-in ChatGPT session

Firefox support is planned but requires UI adaptations due to differences in side panel support.

---

## Security and privacy

- The extension does **not** ask for ChatGPT credentials
- It does **not** send data anywhere
- It operates only on `chatgpt.com`
- All actions are performed within the browser context of the logged-in user

---

## Project status

🚧 **Early development**

The extension is functional at a basic level and under active development.  
APIs and UI may change as ChatGPT’s web interface evolves.

---

## Roadmap (high-level)

1. Stable conversation listing
2. Date range filtering
3. Selection and preview
4. Safe bulk deletion
5. Optional enhancements (search, stats, grouping)

---

## License

MIT — see `LICENSE`
```

---
 