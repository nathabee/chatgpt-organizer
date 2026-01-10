# Developer Guide

This document is for contributors and developers working on **ChatGPT Organizer**.
It is not required for end users.

---

## Local Development Setup

### Prerequisites

- Node.js (LTS recommended)
- npm
- Chrome or Chromium-based browser

---

## Build the extension

From the project root:

```bash
npm install
npm run build
````

This produces the packaged extension in:

```text
dist/
```

---

## Verify build output

After `npm run build`, the following must exist:

* `dist/manifest.json`
* `dist/background.js`
* `dist/content.js`
* `dist/panel.js`
* `dist/assets/` (icons)
* `dist/panel/` (HTML/CSS)

The folder that contains `manifest.json` is the folder Chrome will load.

---

## Load the extension (unpacked)

1. Open:

```text
chrome://extensions
```

2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select:

```text
chatgpt-organizer/dist
```

The extension should now appear.

---

## Open the side panel

1. Go to:

```
https://chatgpt.com/
```

2. Open the browser **Side Panel**
3. Select **ChatGPT Organizer**

You should see the panel UI.

---

## Debugging

Use Chrome DevTools:

* **Background**:
  `chrome://extensions` → extension → Service Worker → Inspect
* **Content script**:
  DevTools on `chatgpt.com`
* **Panel**:
  Right-click inside panel → Inspect

If something does not work, logs from these three contexts usually explain why.

---

## Firefox note

Firefox does not fully support Chrome’s Side Panel API.

Development and testing should be done in **Chrome/Chromium first**.
A Firefox-compatible UI may be added later.

---

## Versioning

The project uses a root `VERSION` file as the single source of truth.

Example:

```text
0.0.9
```

---

## Release workflow (GitHub)

### Releases are created manually using shell scripts : 

```bash 
# bump first so manifest shows the release version during tests
./scripts/bump-version.sh patch   # or minor / major


npm run build
# run whatever tests / manual checks you do

# continue coding if needed (version already correct)

git add -A
git commit -m "vx.y.z"
git push origin main

## create a release
 
./scripts/release-all.sh
```

release-all.sh script will:
* verify VERSION
* build extension zip (your existing script)
* build demo zip (the demo script we added)
* publish the GitHub release + extension zip (your existing script)
* upload the demo zip to the same release
 


### Bump version

```bash
# bump version x.y.z to next z
./scripts/bump-version.sh patch
# bump version x.y.z to next y
./scripts/bump-version.sh minor
# bump version x.y.z to next x
./scripts/bump-version.sh major
```

This updates:

* `VERSION`
* `manifest.json` 
* `package.json` 

No commit, no tag or release is created yet.

---

### Build release ZIP

```bash
./scripts/build-zip.sh
```

This:

* builds the extension
* creates a versioned ZIP in `release/`
* example:

  ```
  release/chatgpt-organizer-0.0.9.zip
  ```

---

### Publish GitHub Release

```bash
./scripts/publish-release-zip.sh
```

This:

* ensures the tag `vX.Y.Z` exists and matches HEAD
* creates a GitHub Release if missing
* uploads the ZIP as a release asset
* overwrites assets safely if re-run

Re-running the script does **not** create duplicate releases.

---

## Development loop

Typical workflow:

```text
edit code
↓
npm run build
↓
chrome://extensions → Reload
↓
refresh chatgpt.com
```

---

## License

MIT. See `LICENSE`.
