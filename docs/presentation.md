# ChatGPT Organizer Overview

ChatGPT Organizer (CGO) is a browser extension designed to help you inspect and clean up your ChatGPT conversation history in a controlled way.

Long histories can become hard to manage and can make the ChatGPT web interface feel slower. CGO exists to make cleanup and inspection selective, transparent, and explicit.

---

## Motivation

As ChatGPT histories grow, the web UI does not scale well:

- Projects become hard to browse once their count grows beyond a small number
- Older conversations are difficult to reach without extensive scrolling
- The interface offers no global overview or filtering
- Cleanup requires either repetitive manual deletion or a destructive “delete all”

ChatGPT Organizer addresses these limitations by providing:
- explicit inspection of loaded data
- selective, reviewable actions
- visibility into progress and results


---

## What CGO does

- Runs as a Side Panel on `chatgpt.com`
- Loads conversations and projects from your current ChatGPT session
- Lets you select items with checkboxes and live counters
- Executes bulk actions with explicit confirmation and progress reporting
- Maintains a local action log so destructive operations remain traceable

Important: CGO only fetches data when you explicitly request it. It does not run silent background operations.

---

## What CGO does not do

- No credential storage
- No analytics, no telemetry
- No remote sync, no server backend
- No automatic actions
- No “undo” claims for destructive operations

---

## Design principles

- **Local-first**: everything happens in your browser
- **Explicit actions**: you trigger fetches and deletions deliberately
- **Safety by design**: confirmations, throttling, progress feedback
- **Transparency**: behavior is inspectable, logs are readable
- **Minimal dependencies**: no framework, no hidden infrastructure

---

## Technical overview

- Chrome / Chromium extension (Manifest V3)
- TypeScript + esbuild
- Side Panel UI (Chrome API)
- Content scripts operate within the logged-in `chatgpt.com` context
- Background service worker performs authenticated calls using your existing session

---

## Security and privacy

CGO:
- does not ask for ChatGPT credentials
- does not send your data anywhere
- operates only on `chatgpt.com`
- stores data locally (cache + statistics + logs)

---

## Try the demo

Use the interactive demo on the left.  
It simulates the real UI using mock data (no ChatGPT access).
