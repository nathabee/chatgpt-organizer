# Chrome Web Store — Phase 1 (Unlisted)

## Submission Questions & Prepared Answers

Use this to fill the Web Store submission form without improvising.

---

## 1. Extension name

**Question (implicit)**
What is the name of your extension?

**Answer**

> ChatGPT Organizer

---

## 2. Extension summary (short description)

**Question**
Provide a short summary shown in listings.

**Answer**

> Inspect and organize your ChatGPT conversations with explicit, user-controlled actions.

(Short, factual, no promises.)

---

## 3. Detailed description

**Question**
Describe what your extension does.

**Answer**

> ChatGPT Organizer is a browser extension that helps users inspect and selectively manage their ChatGPT conversations and projects.
>
> It runs locally in the browser, uses the user’s existing ChatGPT session, and performs actions only when explicitly requested.
>
> The extension provides visibility into conversations and projects, supports selective bulk operations such as deletion, and keeps a local audit log of actions performed.

---

## 4. What problem does this extension solve?

**Question (reviewer mindset)**
Why does this exist?

**Answer**

> The ChatGPT web interface makes it difficult to manage large conversation histories.
> Conversations and projects become hard to reach as they grow, and cleanup is limited to single deletions or deleting everything at once.
>
> This extension enables selective inspection and cleanup with explicit user control.

---

## 5. Permissions justification (CRITICAL)

**Question**
Why does your extension request these permissions?

You must justify **each permission** in plain language.

**Example structure (adapt to your exact manifest):**

> **Access to chatgpt.com**
> Required to read and interact with the ChatGPT web interface within the user’s logged-in browser session.
>
> **Side Panel API**
> Used to display the extension’s user interface within Chrome’s side panel.
>
> **Storage**
> Used to store local cache data, statistics, and action logs on the user’s device.

Rule:

* No “for convenience”
* No “may be used”
* No future features

---

## 6. Does the extension collect personal data?

**Question**
Does your extension collect or transmit personal data?

**Answer**

> No.

Clarification you can add:

> All data remains local in the user’s browser and is not transmitted to any server.

---

## 7. Privacy policy (mandatory even if local-only)

**Question**
Provide a Privacy Policy URL.

**Answer**

> [https://github.com/nathabee/chatgpt-organizer/blob/main/docs/privacy-policy.md](https://github.com/nathabee/chatgpt-organizer/blob/main/docs/privacy-policy.md)
> (or your published Pages version)

**Key statements your policy must contain (and you already do):**

* No data collection
* No transmission
* No analytics
* Local-only storage

---

## 8. Data usage disclosure (Chrome form checkboxes)

**Question**
How is user data handled?

**Your selections**

* ❌ Data sold to third parties
* ❌ Data used for advertising
* ❌ Data used for analytics
* ❌ Data transmitted off-device
* ❌ Data shared with external services
* ✔️ Data processed locally only

---

## 9. In-app purchases

**Question**
Does your extension contain paid features or purchases?

**Answer**

> No.

(Do not explain further.)

---

## 10. Monetization

**Question (implicit)**
Is this extension monetized?

**Answer**

> No.
> This extension is free and open source.

---

## 11. Support URL

**Question**
Where can users get support?

**Answer**

> [https://github.com/nathabee/chatgpt-organizer/issues](https://github.com/nathabee/chatgpt-organizer/issues)

Optional wording in description:

> Support is provided on a best-effort basis via GitHub Issues.

---

## 12. Website / homepage (optional but recommended)

**Question**
Do you have a website?

**Answer**

> [https://nathabee.github.io/chatgpt-organizer/index.html](https://nathabee.github.io/chatgpt-organizer/index.html)

This strengthens reviewer trust.

---

## 13. Distribution visibility

**Question**
Who can discover this extension?

**Answer**

> Unlisted

Meaning:

* accessible via direct link
* not searchable
* safe for early users

---

## 14. Target audience

**Question (implicit)**
Who is this for?

**Answer**

> Individual users managing large ChatGPT conversation histories.

No enterprise claims. No automation claims.

---

## 15. Security expectations

**Question (reviewer mindset)**
Does this extension introduce risk?

**Answer**

> No elevated risk.
> The extension operates within the browser using the user’s existing authenticated session and does not introduce external communication.

---

## 16. Update behavior

**Question**
How are updates handled?

**Answer**

> Updates are distributed through the Chrome Web Store.
> Local data remains on the user’s device.

---

## 17. Accuracy & honesty check (self-audit)

Before submitting, confirm internally:

* [x] Description matches actual behavior
* [x] No hidden automation
* [x] No background fetching
* [x] No undeclared permissions
* [x] No misleading wording

If all are true → submit.

---

 