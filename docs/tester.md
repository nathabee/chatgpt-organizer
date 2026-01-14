# Test


##  Test on your main plateform

Test in two passes:

### Unpacked load (Developer mode → “Load unpacked”)
Best for debugging, service worker console, quick iteration.
 

```text
edit code
↓
npm run build
↓
chrome://extensions → Reload 
Reload or re-install it via `chrome://extensions` (choose the dist repository)
↓
refresh chatgpt.com
``` 


### Packaged pack extension 


make a pack extension :


### 2) Test a real packed install (CRX) locally (optional)

If you specifically want to test the packed format:

1. Extract the ZIP (same as above).
2. Go to `chrome://extensions`
3. Developer mode ON
4. Click **Pack extension**
5. **Extension root directory**: select the folder containing `manifest.json`
6. Leave **Private key** empty the first time → Chrome creates:

   * a `.crx`
   * a `.pem` (private key)

Now you can install the `.crx` by dragging it into `chrome://extensions` (sometimes Chrome blocks this on stable builds depending on policy; “Load unpacked” is more reliable).

### About the key / extension ID

* If you **don’t** provide a key, Chrome generates a new one → the extension ID will be different each time.
* If you want to simulate updating the same extension, you reuse the generated `.pem`.

But for release QA, **you don’t need Pack extension at all**.

---

## What about testing “exactly as users install it”?

Users install via **Chrome Web Store**, not ZIP.

So the closest-to-real test is:

* upload to the Web Store as **Unlisted** (or use a test group)
* install from the store listing
* test update flow by uploading a new version

That’s the only way to test store-specific behaviors.

---

## Minimal checklist for “packed” release QA (practical)

Test at least:

* install via **Load unpacked** from extracted release ZIP
* open your UI entry points (popup / side panel / options)
* check `chrome://extensions` → “service worker” console for errors
* permissions prompts behave as expected
* all icons load (no broken paths)
* any downloads/export features work

---

If you tell me what your release ZIP contains (top-level files/folders), I’ll tell you exactly which folder you must select for “Load unpacked” and what to fix if your ZIP structure isn’t ideal.


---

## Platform-specific tests you should include 

Plafeform can be :
* **Windows 11 + Chrome**
* **Windows 11 + Edge**
* **Ubuntu + Chrome**
* **macOS + Chrome**

Here are the tests that can genuinely vary by OS/browser and therefore deserve checklist items:

### 1) Installation and updates

* Install from ZIP/unpacked works on Windows paths
* Update behavior: reinstall over existing version preserves expected state (or resets cleanly)

### 2) File/download behavior

If your extension exports JSON/MD or downloads files:

* Windows download path handling
* Filename validity (Windows is stricter about reserved characters)
* “Save as” / auto-download permissions differences

### 3) Keyboard shortcuts

* Modifier keys differ (Ctrl vs Cmd, but Windows vs Linux can also differ by layout)
* Conflicts with browser/system shortcuts

### 4) Fonts/layout rendering

* UI spacing can shift (fonts differ, scrollbars differ)
* High DPI scaling on Windows (125% / 150%) can break layout

### 5) Browser differences (Chrome vs Edge)

* Slight policy/permission UX differences
* `chrome.*` APIs are mostly identical, but review behavior and enterprise policies can affect:

  * storage persistence under “clear browsing data”
  * extension side panel behavior (if you use it)
  * popups and focus quirks



### 6) Performance + throttling

* Service worker lifecycle is sensitive; sometimes manifests behave differently depending on browser optimizations
* “wake up” behavior after idle can feel different

---
 