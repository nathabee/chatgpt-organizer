# GitHub Pages

This project uses **GitHub Pages** to publish documentation **and a live demo** directly from the repository.

The site is served from the `docs/` directory on the `main` branch.

---

## How GitHub Pages is configured

Files in `docs/` are **not published automatically** just because they exist.
You must explicitly enable GitHub Pages in the repository settings.

### Steps

1. Open the GitHub repository: **chatgpt-organizer**
2. Go to **Settings → Pages**
3. Under **Build and deployment**:

   * **Source**: `Deploy from a branch`
   * **Branch**: `main`
   * **Folder**: `/docs`
4. Click **Save**

GitHub will then build and publish the site.

### Verification

* On the **Pages** settings screen, GitHub shows:

  * the **published URL**
  * a build status (e.g. “Your site is being built”)
* In the **Actions** tab, you’ll see a workflow named
  **Pages build and deployment**

If the site shows “There is nothing at this address”, check:

* Pages is pointing to `/docs` (not repository root)
* The file exists as **`docs/index.html`** (case-sensitive)
* The repository is public (or Pages is allowed for private repos on your plan)

---

## Project structure (relevant parts)

```
docs/
├── index.html          # Entry point for GitHub Pages
├── main.js             # Main JS (loaded as ES module)
├── style.css           # Global styles
│
├── cgo-demo/           # Live demo (iframe, left panel)
│   └── index.html
│
├── checklist/          # Reusable checklist engine
│   ├── checklist.js    # Checklist logic (imported by main.js)
│   ├── json/           # Checklist templates (input)
│   │   ├── chrome_extension_publishing.bundle.json
│   │   └── sections/
│   └── report/         # Exported reports (manual, optional)
│
├── user-manual.md
├── installation.md
├── architecture.md
├── ... etc
└── screenshots/
```

Only the **important parts** are shown here.

---

## How the page works

### Entry point

* `docs/index.html` is the single entry point.
* It loads:

  ```html
  <script type="module" src="main.js"></script>
  ```
* ES modules are required because `main.js` imports other modules.

---

### JavaScript responsibilities

* **`main.js`**

  * navigation (markdown loading, history, anchors)
  * Mermaid rendering
  * demo panel behavior
  * imports and registers the checklist engine

* **`checklist/checklist.js`**

  * all checklist logic
  * JSON loading
  * rendering
  * report export (JSON + Markdown)

This separation keeps `main.js` readable and reusable.

---

### Documentation rendering

* Markdown files (`*.md`) are fetched dynamically
* Rendered using **marked**
* Mermaid diagrams are re-rendered after insertion
* Navigation uses `history.pushState` (SPA-style)

---

### Checklist system

* Checklist templates live in `docs/checklist/json/`
* A **bundle JSON** defines which section files are included
* Clicking a checklist entry loads it into the same `#content` area as docs
* Reports can be exported as:

  * JSON (machine-readable)
  * Markdown (human-readable)

---

## Live demo (left panel)

* The left panel embeds a **real CGO panel UI** via `<iframe>`
* The demo is **static** and uses mocked data
* No ChatGPT account access
* No extension APIs

### Demo build source

The demo files come from the extension build output:

* `dist/` is generated during release
* During `scripts/release-all.sh`:

  * the demo is rebuilt
  * output is copied into `docs/cgo-demo/`
* As a result, **each release automatically updates the demo** shown on GitHub Pages

---

## Local testing

You **cannot** open `docs/index.html` via `file://`.

You must serve it over HTTP.

### Recommended

From the repository root:

```bash
npx serve docs
```

or, without Node:

```bash
cd docs
python3 -m http.server
```

Then open the printed `http://localhost:PORT`.

---

## Summary

* GitHub Pages serves `/docs` from `main`
* `index.html` is the only entry point
* `main.js` orchestrates navigation and UI
* checklist logic lives in `docs/checklist/`
* the demo is rebuilt and injected automatically on each release
 