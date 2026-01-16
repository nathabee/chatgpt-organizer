# Chrome Web Store — Phase 1 (Unlisted)

## prerequise
 
You are logged into **Chrome Web Store Dev Console**.
Developer account ✔
Payment ✔
Release 1.0.0 on GitHub ✔

 

## Step 1 — Create the extension entry

In the Dev Console:

**➜ “New Item”**
Upload **ONE ZIP** only:

* the **compiled extension zip**
* contains:

  * `manifest.json`
  * `background.js`
  * `content.js`
  * `panel/…`
  * `assets/icons`
* **NO demo**
* **NO source**
* **NO dist leftovers**

This ZIP must be exactly what Chrome will install.

If this ZIP is wrong, stop here and fix it first.

---

## Step 2 — Choose visibility (IMPORTANT)

You will be asked for visibility:

* **Unlisted** ✅ ← choose this
* Public ❌ (later, maybe)
* Private ❌

Unlisted means:

* Google review still happens
* No store listing
* You can share the link manually
* Perfect for first submission

---

## Step 3 — Store listing (minimal but correct)

### Name

**ChatGPT Organizer**

### Description (short)

> Organize, group, and manage your own ChatGPT conversations locally in your browser.

No marketing fluff. No promises.

### Detailed description

Explain **what it does**, not what you hope it does:

* client-side only
* uses ChatGPT UI
* no external servers
* no analytics
* no tracking

---

## Step 4 — Permissions justification (CRITICAL)

Chrome will show your permissions.
You must **justify them** in plain English.

Example (adapt wording, but keep meaning):

* **tabs**
  Required to detect and interact with the active ChatGPT tab.

* **storage**
  Used to store local configuration and cached metadata in the browser.

* **activeTab**
  Required to access the currently active ChatGPT tab on user action.

* **sidePanel**
  Used to display the extension interface.

* **Host: [https://chatgpt.com/](https://chatgpt.com/)**
  The extension only operates on ChatGPT pages.

If this section is sloppy → rejection.

---

## Step 5 — Privacy policy (MANDATORY)

Even if you collect **nothing**, you MUST provide one.

You already did the right thing earlier.
Use your GitHub Pages or docs URL.

Must explicitly say:

* no personal data collected
* no data sent to servers
* all data stays local
* open-source

---

## Step 6 — Support URL

Use:

* GitHub Issues
  or
* a docs page

Do **not** put an email unless you want support load.

---

## Step 7 — Version check

Chrome will read:

* `manifest.json → version: 1.0.0`

This **must match** your GitHub release.
If it does, you’re clean.

---

## Step 8 — Submit for review

Click **Submit for review**.

What happens next:

* Review time: **hours to a few days**
* First submission may take longer
* If rejected, Google tells you exactly why

No silence, no black hole.

--- 

## After submission

When it’s approved:

* You get a **store link**
* You can share it manually
* Later: switch to Public if you want

---
 