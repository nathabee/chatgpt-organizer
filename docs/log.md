# console LOG (rtace scope) , TRACE (debug)  and HISTORY (log action)

## overview

Here is the **clean, final reference table** you can keep as documentation (and sanity-check against in code reviews).

---

## Logging & Tracing Architecture (CGO)

| **Type**                    | **Audience**           | **Persistence**        | **Controlled by**  | **Functions (where defined)**                                                                                  | **What it is for**                                                                                                    | **What it must NOT be used for**                                 |
| --------------------------- | ---------------------- | ---------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Console Trace / Log**     | Developer (you)        | ❌ No (console only)    | `traceScope` flag  | `logTrace()`  <br>`logInfo()`  <br>`logWarn()`  <br>`logError()`  <br>**File:** `src/background/util/log.ts`   | • Follow execution flow  <br>• Inspect parameters  <br>• Diagnose bugs during development                             | • User history  <br>• Auditing  <br>• Persisted debugging        |
| **Debug Trace (Persisted)** | Developer (deep debug) | ✅ Yes (storage → JSON) | Debug Trace toggle | `debugTrace.append()`  <br>`debugTrace.isEnabled()`  <br>**File:** `src/shared/debugTrace.ts`                  | • HTTP calls & endpoints  <br>• Payload / response structure  <br>• First-item previews  <br>• Exportable diagnostics | • User-visible actions  <br>• Business logic logging             |
| **Action / Audit Log**      | User (Logs tab)        | ✅ Yes (storage)        | Feature logic      | `actionLog.append()`  <br>`actionLog.list()`  <br>`actionLog.clear()`  <br>**File:** `src/shared/actionLog.ts` | • What the extension did  <br>• Delete / move / create actions  <br>• Run summaries  <br>• User-visible errors        | • Debugging HTTP  <br>• Console traces  <br>• Internal dev notes |

---

## One-sentence rule for each

* **Console log (`log*`)** → *“Help me while coding.”*
* **Debug trace (`debugTrace`)** → *“Let me inspect what really happened.”*
* **Action log (`actionLog`)** → *“Tell the user what the extension did.”*


* **API layer**

  * example :`createProjectApi`
  * no logs
  * no chrome calls
  * returns structured result

* **Executor**

  * orchestrates phases
  * sends progress + done
  * logs with `logTrace / logWarn / logError`

* **Index**

  * just calls executor
  * no HTTP details
  * no API parsing

---
 


##  *three* different logging channels you already have

You already implemented **three different concerns**. They must **never** be mixed again.

### 1) Console diagnostics (developer-facing, volatile)

* Purpose: help *you* while developing / debugging
* Visibility: **DevTools console only**
* Controlled by: **traceScope flag**
* Lost on reload

### 2) Debug trace (developer-facing, persisted)

* Purpose: deep inspection, exportable JSON
* Visibility: Logs tab → Debug trace
* Controlled by: **debugTrace enabled**
* Stored in chrome.storage

### 3) Action / audit log (user-facing, persisted)

* Purpose: show what the extension *did*
* Visibility: Logs tab (actions)
* Controlled by: **feature logic**
* Stored in chrome.storage
* This is **not debugging**, it’s history

You already have all three.
The confusion came from **naming**, not architecture.

---

## Canonical naming (this is the decision)

### A) Console logging (traceScope)

**File:** `src/background/util/log.ts`

These functions **ONLY write to console**.

| Function name | When it logs    | Purpose           |
| ------------- | --------------- | ----------------- |
| `logTrace()`  | traceScope = ON | Developer trace   |
| `logInfo()`   | traceScope = ON | Developer info    |
| `logWarn()`   | ALWAYS          | Developer warning |
| `logError()`  | ALWAYS          | Developer error   |

**They do NOT write to storage. Ever.**

### Correct mental model

> “log* = console only”

### Your current `log.ts` is correct ✅

Only the *names* should be used consistently.

---

### B) Debug trace (persisted JSON, dev-only)

**File:** `src/shared/debugTrace.ts`

* Used for:

  * HTTP request listing
  * First-item previews
  * Payload structure checks
* Enabled by **Debug trace toggle**
* Stored in chrome.storage
* Exportable

**Never log business events here.**

Correct usage:

```ts
await debugTrace.append([
  { scope:"background", kind:"debug", message:"HTTP POST /snorlax/upsert", meta:{...} }
]);
```

---

### C) Action / audit log (persisted user history)

**File:** `src/shared/actionLog.ts`

* Used for:

  * delete chat
  * delete project
  * move chat
  * create project
  * run summaries
  * user-visible errors

**This is NOT console logging.**

Correct usage:

```ts
append({
  kind: "delete_project",
  scope: "projects",
  message: "Deleted project X",
  ok: true,
});
```

---

## Final naming table (pin this mentally)

### Console (traceScope)

| Name       | Meaning                     |
| ---------- | --------------------------- |
| `logTrace` | dev trace (only if enabled) |
| `logInfo`  | dev info (only if enabled)  |
| `logWarn`  | dev warning (always)        |
| `logError` | dev error (always)          |

### Persisted debug (debugTrace)

| Name                | Meaning                |
| ------------------- | ---------------------- |
| `debugTrace.append` | developer debug record |

### Persisted audit (actionLog)

| Name               | Meaning             |
| ------------------ | ------------------- |
| `actionLog.append` | user-visible action |

---

## What you should **NOT** do anymore

❌ Do NOT call `logTrace` expecting data in Logs tab
❌ Do NOT call `debugTrace` for user actions
❌ Do NOT use console logging for business logic
❌ Do NOT invent new logging helpers per file

---

## Immediate fix in your codebase

### 1) Stop using these names everywhere

They are now **banned**:

```ts
trace()
traceWarn()
traceError()
```

They were ambiguous.

---

### 2) Use this rule instead

* Inside **apiClient.ts**
  → `logTrace`, `logWarn`, `logError`

* Inside **index.ts / background orchestration**
  → `logTrace` for flow, `logError` for failures

* Inside **executors**
  → `actionLog.append` for completed actions
  → `logError` for unexpected failures

---

## Example: CREATE PROJECT (correct usage)

```ts
logTrace("CREATE_PROJECT start", { name });

const r = await executeCreateProject(...);

if (r.ok) {
  actionLog.append({
    kind: "info",
    scope: "projects",
    message: `Created project "${r.title}"`,
    ok: true,
    projectId: r.gizmoId,
  });
} else {
  actionLog.append({
    kind: "error",
    scope: "projects",
    message: "Create project failed",
    ok: false,
    error: r.error,
  });
}
```

Console ≠ audit ≠ debug trace.

---

## Bottom line (no sugar)

Your **architecture is already good**.
Your **problem was naming leakage**.

Now it’s fixed if you follow this:

> **log*** = console
> **debugTrace** = dev JSON
> **actionLog** = user history

If you want, next we can:

* lock this via ESLint rules
* or refactor one executor together to enforce the pattern end-to-end
