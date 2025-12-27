# Packaging and Installation

This document explains how **ChatGPT Organizer** is built, packaged, tested, and eventually distributed.

At the moment, the project is in **early development** and is distributed as an unpacked browser extension for testing and development.

---

## Packaging and Availability

### Current status

- The extension is packaged locally using:
  - TypeScript
  - esbuild
- Build output is generated in the `dist/` directory.
- There is **no public store release yet**.

The project is currently distributed via:
- **Source code (GitHub)**
- **Local build + unpacked installation**

This allows rapid iteration, debugging, and validation before any store submission.

---

## Build (local packaging)

From the project root:

```bash
npm install
npm run build
````

This produces:

```text
dist/
├─ manifest.json
├─ background.js
├─ content.js
├─ panel.js
├─ panel/
│  ├─ panel.html
│  └─ panel.css
└─ assets/
   └─ icons…
```

The `dist/` directory is the **packaged extension**.

---

## Installation on Production (planned)

### Target platforms

The intended distribution platforms are:

* **Chrome Web Store** (primary target)
* **Chromium-based browsers**

  * Chrome
  * Brave
  * Edge
  * Vivaldi

Firefox support is planned later and will require a small UI adaptation (Firefox does not fully support Chrome’s Side Panel API).

### Planned production packaging

For store distribution:

1. Build the extension:

   ```bash
   npm run build
   ```
2. Zip the contents of the `dist/` directory:

   ```bash
   cd dist
   zip -r chatgpt-organizer.zip .
   ```
3. Upload the ZIP to:

   * Chrome Web Store Developer Dashboard

**Important:**
Store publication will only happen once:

* the deletion workflow is implemented safely
* permissions are final
* UI and behavior are stable

No auto-updates or remote code loading are planned.

---

## Test Mode (current)

During development and testing, the extension is installed in **unpacked mode**.

### Step-by-step installation (Chrome / Chromium)

1. Open:

   ```
   chrome://extensions
   ```
2. Enable **Developer mode** (top-right corner)
3. Click **Load unpacked**
4. Select:

   ```
   chatgpt-organizer/dist
   ```
5. The extension should appear in the list

---

## Using the extension (test mode)

1. Open:

   ```
   https://chatgpt.com
   ```
2. Open any conversation
3. Open the browser **Side Panel**
4. Select **ChatGPT Organizer**

The panel should open and display the current test UI.

---

## Notes and Security

* This is a **client-side only** tool
* No server is involved
* No analytics or tracking
* No passwords are requested or stored
* The extension works only because:

  * you are already logged into ChatGPT in your browser
  * the extension runs in that same browser context

Conversation deletion is **not yet implemented**.
When it is, it will include:

* dry-run mode
* explicit confirmation
* throttling
* visible progress and error handling

---

## Troubleshooting

* After code changes:

  * run `npm run build`
  * reload the extension in `chrome://extensions`
  * refresh the ChatGPT page
* If the side panel does not open:

  * ensure you are using a Chromium-based browser
  * check extension errors in `chrome://extensions`

---

## License

MIT. See `LICENSE`.

````
 