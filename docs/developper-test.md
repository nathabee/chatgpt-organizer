# DEVELOPPER TIPPS : TESTS


## 1) Confirm your `dist/` contains everything the extension needs

After `npm run build`, you should have:

* `dist/background.js`
* `dist/content.js`
* `dist/panel.js`
* `manifest.json` (either in project root or copied into dist—depends on how we set it up)
* `src/panel/panel.html` (or `dist/panel.html` if your build copies it)
* icons (optional but nice)

If your manifest points to `dist/*.js`, the browser must load from the folder that contains `manifest.json`.

## 2) Load the extension in Chrome/Chromium (recommended first)

Chrome is the easiest for Manifest V3 + side panel.

1. Open: `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select your extension folder that contains `manifest.json`

   * If `manifest.json` is in the project root, select `chatgpt-organizer/`
   * If `manifest.json` is in `dist/`, select `chatgpt-organizer/dist/`

After loading: you should see “ChatGPT Organizer” in the list.

## 3) Open the side panel

1. Go to `https://chatgpt.com/`
2. Click the Extensions “puzzle” icon in the toolbar
3. Pin “ChatGPT Organizer” (optional)
4. Open the extension’s side panel:

   * Either click the extension icon (if we wired it to open the panel), or
   * Use the browser’s side panel dropdown (Chrome has a side panel icon on the toolbar), then choose your extension.

If it opens: you should see your panel UI with something like **“Found N conversations”** (even if N is stubbed).

## 4) If the panel opens but shows N=0 or “not on chatgpt.com”

That’s expected until content script scraping works reliably. Do this quick check:

* Make sure you are on **`https://chatgpt.com/`** (not another domain)
* Refresh the page once after installing the extension
* Open DevTools:

  * **Extensions page** → “service worker” → Inspect (background logs)
  * **chatgpt.com tab** → Console (content script logs)
  * **side panel** → right-click inside panel → Inspect (panel logs)

If you paste me the console logs from:

* background service worker
* content script (chatgpt.com tab)
* panel

…I can tell you exactly which part isn’t talking to which.

## 5) Firefox note (important)

Firefox currently does **not** fully support Chrome’s Side Panel API the same way. So:

* **Test in Chrome/Chromium first** to validate everything end-to-end.
* Later we can add a Firefox fallback UI (popup or in-page overlay) so you can still use Firefox.

## 6) Normal dev loop

When you change code:

1. `npm run build`
2. `chrome://extensions` → your extension → click **Reload**
3. Refresh `https://chatgpt.com/`
4. Re-open the side panel

That’s it.

If you want the fastest next step: open the panel and tell me **what you see** (and if it’s blank, paste the 3 console outputs).
