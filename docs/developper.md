# Developer Guide

This document is for **contributors and maintainers** of **ChatGPT Organizer (CGO)**.
It describes the local development workflow, debugging practices, and release process.

End users do **not** need this document.

---

## 1. Prerequisites

* Node.js (LTS recommended)
* npm
* Google Chrome (or Chromium-based browser)
* Git (CLI)

---

## 2. Install dependencies

From the project root:

```bash
npm install

```


---

## 3. Build the extension

```bash
npm run build
```

This produces the **unpacked extension** in:

```text
dist/
```

---

## 4. Build output expectations

After a successful build, the following must exist:

```text
dist/
├── manifest.json
├── background.js
├── content.js
├── panel.js
├── assets/          # icons
└── panel/           # HTML / CSS
```

The directory containing `manifest.json` is the directory Chrome loads.

---

## 5. Load the extension (unpacked)

This is the **standard development workflow**.

1. Open:

   ```
   chrome://extensions
   ```
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select:

   ```
   chatgpt-organizer/dist
   ```

The extension is now installed locally.

---

## 6. Development loop

Typical iteration cycle:

```text
edit code
↓
npm run build
↓
chrome://extensions → Reload
↓
refresh chatgpt.com
```

This loop is used for nearly all feature work and bug fixing.

---

## 7. Open the CGO side panel

1. Navigate to:

   ```
   https://chatgpt.com/
   ```
2. Open the browser **Side Panel**
3. Select **ChatGPT Organizer**

The CGO panel UI should appear.

---

## 8. Debugging

CGO runs across **multiple execution contexts**.
When debugging, always check the correct one.

### Background / Service Worker

```
chrome://extensions
→ ChatGPT Organizer
→ Service Worker → Inspect
```

Used for:

* background logic
* storage
* message routing
* long-running tasks

---

### Content scripts

* Open DevTools on `https://chatgpt.com`
* Use the **Console** and **Sources** tabs

Used for:

* DOM interaction
* page detection
* content injection issues

---

### Panel UI

* Right-click inside the CGO panel
* Select **Inspect**

Used for:

* UI rendering
* event handling
* state and interaction bugs

---

## 9. Platform notes

### Supported development browser

* Development and testing are done in **Chrome / Chromium**
* Edge is Chromium-based and usually compatible

### Firefox

Firefox does not fully support Chrome’s **Side Panel API**.

Development and testing should be done in **Chrome first**.
Firefox support may be considered later.

---
## 10. Demo

The demo uses the **same UI code as the extension**, but runs against **static JSON data** instead of live ChatGPT APIs.

It is intended for:

* public demonstrations (GitHub Pages)
* documentation
* UI/UX validation without browser extension APIs

---

### Install

From the project root:

```bash
cd demo
npm install
```

This installs the demo’s Node.js dependencies.

---

### Build

From the project root:

```bash
cd demo
./scripts/build-demo-zip.sh
```

This:

* compiles the demo
* produces a distributable build
* generates a ZIP archive

---

### Run locally (test)

From the project root:

```bash
cd demo
npx serve dist
```

Then open the provided local URL in a browser.

> `file://` access will not work due to ES modules and fetch usage.

---

### Publishing on GitHub Pages

The demo is published automatically during a release.

During `release-all.sh`:

* the demo is rebuilt
* the compiled output is copied into:

  ```
  docs/cgo-demo/
  ```
* the demo becomes visible on the GitHub Pages site (left panel)

No manual publishing step is required.

---

## 11. Release workflow (GitHub)

Releases are created using the project’s **shell scripts** and follow a deterministic workflow.

---

### Versioning

The project uses a root `VERSION` file as the **single source of truth**.

Versioning is maintained via `bump-version.sh`.

Example:

```text
0.1.18
```

The version is propagated to:

* `manifest.json`
* `package.json`

---

### Typical release sequence

```bash
# bump version (patch / minor / major)
./scripts/bump-version.sh patch

# build locally
npm run build

# commit and push
git add -A
git commit -m "vX.Y.Z"
git push origin main

# create the release
./scripts/release-all.sh
```

---

### What `release-all.sh` does

* verifies the `VERSION`
* builds the extension artifact
* builds the demo artifact
* copies the demo into GitHub Pages (`docs/cgo-demo`)
* creates or updates the GitHub Release
* uploads all release assets

Re-running the script is safe and does **not** create duplicate releases.

---

## 12. Local testing of GitHub Pages (docs & demo)

GitHub Pages content cannot be tested via `file://`.

Serve the `docs/` directory over HTTP:

```bash
npx serve docs
```

or:

```bash
cd docs
python3 -m http.server
```

Then open the provided `http://localhost:PORT`.

---

## 13. License

MIT. See `LICENSE`.

---

### Final note

This guide intentionally focuses on:

* **how to develop**
* **how to debug**
* **how to release**

Publishing to the Chrome Web Store and store-specific requirements are documented separately in the **Extension Publishing Guide**.

This separation keeps the developer workflow clean and avoids mixing concerns.
