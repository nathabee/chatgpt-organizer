# publishing  list



 
 
---

## Phase 1 — Chrome review–proof (what actually matters first)

**Goal:** get approved without friction
**Scope:** policies, permissions, disclosure, store metadata
**Time:** **2–4 days**

### What must be solid

* `manifest.json`

  * permissions minimal and justified
  * no unused permissions
* Privacy policy

  * accurate (especially local-only data handling)
* Store description

  * matches actual behavior
  * no promises you don’t keep
* In-app purchase disclosure

  * honest (NO)
* Support URL

  * exists (GitHub Issues is enough)

If this is clean, Chrome review usually passes **first try**.

➡️ This is the bar for **Unlisted submission**.

 

### support
 
You should set expectations clearly. For our extension (free, open source)
Support URL → GitHub Issues
Support promise → best effort only
No email obligation
No SLA
No pressure

Example wording (safe and honest):

Support
This is a free, open-source extension.
Support is provided on a best-effort basis via GitHub Issues.
There is no guaranteed response time.
 
i also need to configure my github to explain the gothub issue?



---

## Phase 2 — Stranger-proof (controlled users)

**Goal:** prevent obvious confusion and bad early reviews
**Scope:** UX clarity, wording, edge cases
**Time:** **1–3 weeks (while Unlisted)**

### What gets fixed here

* “Why doesn’t it work?” moments
* permission misunderstandings
* unclear buttons / flows
* wrong expectations (“I thought it would do X”)
* platform quirks (Chrome vs Edge)

This phase requires:

* a few real users
* feedback loops
* small iterations

You already prepared well with:

* demo
* checklist
* docs
* GitHub Pages

That shortens this phase significantly.

---

## Phase 3 — Public-proof (longer term)

**Goal:** survive real usage without damage
**Scope:** resilience, regressions, maintenance
**Time:** **ongoing**

This includes:

* handling ChatGPT UI changes
* preventing crashes
* clean upgrades
* stable storage behavior
* clear “what this does / does not do”

 
---
