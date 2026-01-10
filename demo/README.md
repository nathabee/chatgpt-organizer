# CGO Demo

This demo runs the real CGO **panel code** in a normal web page.

It works by swapping the platform seams at build/dev time:

- `src/panel/platform/runtime.ts` → `demo/src/mocks/runtime.ts`
- `src/shared/platform/storage.ts` → `demo/src/mocks/storage.ts`

The demo also serves the real panel UI assets:

- `src/panel/panel.html` is served/emitted as `/__cgo/panel.html`
- `src/panel/panel.css` is served/emitted as `/__cgo/panel.css`

Then the demo loads the panel HTML into the page and boots the real entrypoint:

- `src/panel/panel.ts`


## What this demo is (and is not)

- ✅ Interactive simulation of CGO UI
- ✅ Uses real CGO panel code from `src/`
- ✅ Uses mock runtime/storage (no browser extension APIs required)
- ❌ Not connected to a user’s real ChatGPT account
- ❌ Does not access cookies, sessions, or credentials


## Run locally

### Dev mode (hot reload)

```bash
cd demo
npm install
npm run dev -- --host
````

Vite prints a local URL. Open it.

### Build + Preview (production build)

This runs only what is in `demo/dist`:

```bash
cd demo
npm run build
npm run preview -- --host
```

### Build + serve with a dumb static server (extra strict)

```bash
cd demo
npm run build
npx serve dist
```

If something works in this mode, it will work on your VPS as static files too.


## create a release
the demo will be release at the same time than the extension (this is the same code, so when the extension update , it make sense to update the demo)

```bash
./scripts/release-all.sh
```

This script will:
* verify VERSION
* build extension zip (your existing script)
* build demo zip (the demo script we added)
* publish the GitHub release + extension zip (your existing script)
* upload the demo zip to the same release


## Deploy on your VPS

Build the demo and publish the contents of `demo/dist/` at a stable URL, for example:

* `https://beelab-web.nathabee.de/cgo-demo/`

How you deploy is up to you (nginx static, docker web, etc.). The demo is static output + JS bundles.

You only copy the **static build output** available on :


So:

* **NO** `demo/node_modules` in `web`
* **NO** `demo/src` in `web`
* **NO** `vite.config.ts`, `package.json`, etc. in `web`
* **YES** `demo/dist` *contents* copied into `web/public/cgo-demo/`

### How `web/` should look after

```
web/
  app/
  public/
    beelab.png
    beelab.svg

    cgo-demo/             <= this is our new service
      index.html
      assets/
        index-XXXX.js
        panel-YYYY.js
      __cgo/
        panel.html
        panel.css
      (optional) favicon.ico
```

### What you do in practice

1. Build the demo **in the extension repo**:

```bash
cd /path/to/chatgpt-organizer/demo
npm ci
npm run build
```

2. Copy build output into your BeeLab web public folder:

```bash
rm -rf /path/to/docker/beelab/web/public/cgo-demo
mkdir -p /path/to/docker/beelab/web/public/cgo-demo
cp -a dist/* /path/to/docker/beelab/web/public/cgo-demo/
```

Now the demo is available at:

* `https://beelab-web.nathabee.de/cgo-demo/`

### One critical requirement

Your demo must be built with the correct base path so assets resolve under `/cgo-demo/`.

In `demo/vite.config.ts`, set:

```ts
export default defineConfig({
  base: "/cgo-demo/",
  // ...
});
```

Otherwise it may try to load `/assets/...` from the site root.

### Do you need to “reinstall node_modules and dist” on the VPS?

* On the VPS you only need **the files inside `web/public/cgo-demo/`** at runtime.
* You only need `npm ci && npm run build` on the VPS **if you’re building there**.
* If you build locally and copy the output, the VPS does **not** need demo node_modules at all.

If you want, I can give you a small deploy script that builds + copies in one command (and doesn’t touch anything else in `web/`).


## Embed the demo in WordPress (recommended)

The clean approach is: **WordPress embeds the demo** (hosted on your VPS) via an iframe.
WordPress does not need to run the demo build.

### 1) Add an iframe in a page (quick test)

```html
<iframe
  src="https://beelab-web.nathabee.de/cgo-demo/"
  style="width:100%; height:900px; border:0;"
  loading="lazy"
></iframe>
```

### 2) Optional: tiny WordPress plugin with a shortcode

Create a plugin file, for example:

`wp-content/plugins/cgo-demo-iframe/cgo-demo-iframe.php`

```php
<?php
/**
 * Plugin Name: CGO Demo (iframe)
 * Description: Embeds the CGO demo UI hosted on BeeLab.
 * Version: 0.1.0
 */

if (!defined('ABSPATH')) exit;

function cgo_demo_iframe_shortcode($atts) {
  $atts = shortcode_atts([
    'src' => 'https://beelab-web.nathabee.de/cgo-demo/',
    'height' => '900',
  ], $atts);

  $src = esc_url($atts['src']);
  $h = max(200, intval($atts['height']));

  return '<iframe src="' . $src . '" style="width:100%; height:' . $h . 'px; border:0; border-radius:12px;" loading="lazy"></iframe>';
}
add_shortcode('cgo_demo', 'cgo_demo_iframe_shortcode');
```

Use it in a page:

```text
[cgo_demo height="900"]
```

## Iframe requirements (important)

If your demo is blocked in the iframe, it is almost always server headers.

Your BeeLab server must allow being framed by your WordPress domain:

* Remove/adjust `X-Frame-Options` (SAMEORIGIN/DENY will block embedding)
* Add a CSP `frame-ancestors` directive that includes your WP domain

Example CSP:

```text
Content-Security-Policy: frame-ancestors 'self' https://your-wordpress-domain;
```

If you don’t change this, the iframe will appear blank.

```

 