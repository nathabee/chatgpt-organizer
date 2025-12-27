<a href="https://nathabee.github.io/chatgpt-organizer/index.html">
  <img src="./docs/cgo.svg" alt="CGO Logo" width="300" style="vertical-align:middle; margin-right:20px;"> 
</a>


# ChatGPT Organizer (CGO)

**ChatGPT Organizer** is a browser extension that helps you inspect, organize, and clean up your ChatGPT conversations.

The first goal is pragmatic:  
**list and later delete conversations by date range**, without manually clicking hundreds of chats in the sidebar.

The project is intentionally simple, local-first, and transparent.

---

## What this extension does

- Runs entirely in your browser
- Acts only on your own ChatGPT account
- Requires you to be logged in to chatgpt.com
- Does not store credentials
- Does not access other users' data

---

## Responsibility

This tool automates actions that are normally performed manually
by the user in the ChatGPT interface. Use at your own discretion.

---

## Why this exists

Long ChatGPT histories slow down browsers (especially Firefox) and make the UI painful to use.  
ChatGPT currently offers:
- delete one conversation at a time, or
- delete *everything*

What’s missing is **controlled cleanup**.

ChatGPT Organizer aims to fill that gap.

---

## Features (current)

- Chrome MV3 extension
- Side panel UI
- Lists conversations from the active `chatgpt.com` tab
- Shows total number of conversations found

---

## Planned features

- Delete conversations by **date range**
- Checkbox-based selection with live counter
- Safe “dry run” mode before deletion
- Keyword filtering (title first, content later)
- Statistics (conversation age, count per period)
- Optional archiving instead of deletion

---

## Project principles

- No server
- No tracking
- No analytics
- Runs only in your browser
- Uses your existing ChatGPT login session
- Clear, auditable source code

---

## Tech stack

- Chrome Extension (Manifest V3)
- TypeScript
- esbuild
- No framework (plain DOM)

---

## Development

```bash
npm install
npm run build
```

---

## Installation

Load the extension from the generated dist/ directory via:
```bash
chrome://extensions → Load unpacked
```


Detailles installation  of extension (Chrome/Chromium) :

* Open chrome://extensions
* Enable “Developer mode”
* Click “Load unpacked”
* Select this folder: chatgpt-organizer/ (the project root)

The extension should appear. Open ChatGPT, then open the side panel.

* Notes

This is a client-side tool. It does not require your ChatGPT password. It relies on the fact that you are already logged into chatgpt.com in your browser.

Deleting conversations is a separate step we will implement carefully (dry-run, confirmations, throttling, and clear status).



## Status

🚧 Early development
APIs and internals may change as ChatGPT evolves.



## For more information

Visit the github pages: <a href="https://nathabee.github.io/chatgpt-organizer/index.html"> 
  <img src="./docs/visitgithubpage.svg" alt="CGO Docs" width="300" style="vertical-align:middle;">
</a>


---


##  License

MIT — see LICENSE