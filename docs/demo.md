# demo overview


## Demo version (what it is — and what it is NOT)

Alongside the extension, this project also provides a **Demo version**.

### What the demo is

* A **web-based simulation** of the ChatGPT Organizer UI
* Runs the **real panel code** in a normal browser page
* Uses **mock data** (no ChatGPT account, no cookies, no API access)
* Designed for:

  * previewing the UI
  * testing workflows
  * documentation and screenshots
  * WordPress / website embedding

### What the demo is NOT

* ❌ Not a browser extension
* ❌ Not connected to your ChatGPT account
* ❌ Cannot read, modify, or access real chats
* ❌ Not installable via `chrome://extensions`

### How to access the demo

The demo is distributed as a **separate ZIP** in the same GitHub Release:

* `chatgpt-organizer-demo-x.y.y.zip`

You do **not** install this ZIP as an extension.

Instead, it is meant to be:

* served as a **static website** 
* embedded in another site (for example via an iframe)
* local testing
* production hosting
* WordPress embedding

### Quick mental model

| Component     | Purpose                               |
| ------------- | ------------------------------------- |
| Extension ZIP | Real usage with your ChatGPT account  |
| Demo ZIP      | UI simulation for preview & embedding |

If you just want to **use ChatGPT Organizer** → install the **extension ZIP**.
If you want to **see how it works** → open the **demo** available in the github pages.
