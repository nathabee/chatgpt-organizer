# how to create github pages



Your files in `docs/` are **not published automatically** just because they’re committed. GitHub Pages only serves what you select in the repo’s **Settings → Pages**.

Do this:

1. Go to your repo on GitHub: **chatgpt-organizer**
2. **Settings** → **Pages**
3. Under **Build and deployment**:

   * **Source**: select **Deploy from a branch** (not Actions, unless you set that up)
   * **Branch**: choose `main`
   * **Folder**: choose **`/docs`**
4. Click **Save**

Now check these two things:

* On that same Pages screen, GitHub will show the **published URL** and a status like “Your site is being built”.
* Go to **Actions** tab and look for a “Pages build and deployment” run. If it failed, it will tell you why. ([GitHub Docs][1])

Important gotchas that commonly cause the exact “There is nothing at …” situation:

* Pages is still pointing at **root** (`/(root)`) instead of `/docs`. ([GitHub Docs][1])
* Repo is **private** on a plan that doesn’t allow Pages, or Pages got disabled and needs re-enabling. ([GitHub Docs][2])
* Wrong filename case: it must be **`docs/index.html`** exactly. ([GitHub][3])

 