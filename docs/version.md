# Version History — ChatGPT Organizer

This document tracks functional and architectural changes of the ChatGPT Organizer
Chrome extension.

Versions are listed with the **newest at the top**.


---

## v0.0.9 - Read existing ChatGPT projects


--

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

 
