# Installation

**ChatGPT Organizer** is currently distributed as a downloadable extension package and installed manually in Chrome.

> ⚠️ The extension is **not yet available** on the Chrome Web Store.

---

## Supported Browsers

* Google Chrome
* Chromium-based browsers:

  * Brave
  * Microsoft Edge
  * Vivaldi

Firefox is not supported yet.

---

## Installation (current method)

### Step 1 — Download the extension

1. Go to the **GitHub Releases** page
2. Download the latest file named:

```
chatgpt-organizer-X.Y.Z.zip
```

(X.Y.Z is the version number)

---

### Step 2 — Extract the ZIP

Extract the downloaded ZIP file to a folder on your computer.

After extraction, the folder **must contain a file named `manifest.json`**.

Example:

```
chatgpt-organizer/
├─ manifest.json
├─ background.js
├─ content.js
├─ panel.js
└─ assets/
```

---

### Step 3 — Install in Chrome

1. Open Chrome and go to:

```
chrome://extensions
```

2. Enable **Developer mode** (top-right corner)

3. Click **Load unpacked**

4. Select the extracted folder (`chatgpt-organizer/`)

The extension should now appear in the list.

---

## Using the extension

1. Open:

```
https://chatgpt.com
```

2. Open any conversation

3. Open the browser **Side Panel**

4. Select **ChatGPT Organizer**

The panel should open on the right side of the browser.

---

## Updates

There are no automatic updates at this time.

To update the extension:

1. Download the newer ZIP version
2. Extract it
3. Reload or re-install it via `chrome://extensions`

---

## Chrome Web Store (planned)

A Chrome Web Store release is planned once:

* features are complete
* permissions are final
* deletion workflows are fully safe

Until then, manual installation is required.

---

## Security & Privacy

* Runs entirely in your browser
* No server, no cloud, no tracking
* No passwords collected or stored
* Works only in the browser where you are logged into ChatGPT

---

## License

MIT. See `LICENSE`.

 