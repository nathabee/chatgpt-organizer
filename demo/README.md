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

- ✅ Interactive simulation of the CGO UI
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

## Create a release (extension + demo)

The demo is released at the same time as the extension (same repository / same version), so when the extension updates, the demo updates too.

```bash
./scripts/release-all.sh
```

This script will:

* verify `VERSION`
* build the extension ZIP
* build the demo ZIP
* publish the GitHub release + upload the extension ZIP
* upload the demo ZIP to the same release

## Deploy on your VPS (static files hosted by BeeLab `web`)

Goal URL example:

* `https://beelab-web.nathabee.de/cgo-demo/`

Important: the demo is **static output** (HTML + JS bundles).
On the server you only need the **contents of `demo/dist/`**.

So:

* **NO** `demo/node_modules` on the server
* **NO** `demo/src` on the server
* **NO** `vite.config.ts`, `package.json`, etc. on the server
* **YES** copy `demo/dist/*` into `web/public/cgo-demo/`

### How `web/` should look after

```text
web/
  app/
  public/
    beelab.png
    beelab.svg

    cgo-demo/                 # static path under /cgo-demo/
      index.html
      assets/
        index-XXXX.js
        panel-YYYY.js
      __cgo/
        panel.html
        panel.css
      (optional) favicon.ico
```

### Deploy steps (from GitHub release)

1. Download the demo ZIP from GitHub Releases:

* `chatgpt-organizer-demo-x.y.z.zip`

2. Unzip it somewhere  :

```bash
unzip chatgpt-organizer-demo-x.y.z.zip -d /tmp/cgo-demo
ls /tmp/cgo-demo/
```

3. Copy build output into your BeeLab `web` public folder:

```bash
rm -rf /path/to/docker/beelab/web/public/cgo-demo
mkdir -p /path/to/docker/beelab/web/public/cgo-demo
cp -a /tmp/cgo-demo /path/to/docker/beelab/web/public/
```

4. modify  /path/to/docker/beelab/web/next.config.mjs
```bash
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/cgo-demo", destination: "/cgo-demo/index.html", permanent: false },
      { source: "/cgo-demo/", destination: "/cgo-demo/index.html", permanent: false },
    ];
  },
};
``` 

export default nextConfig;



5. rebuild image
```bash
blenv prod
dcbuild web-prod
dcup -d web-prod
``` 


6. Now the demo should be available at:

* `https://beelab-web.nathabee.de/cgo-demo/`

## Embed the demo in WordPress (recommended)

The clean approach is: WordPress **embeds the demo** (hosted on your VPS) via an iframe.
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

Create a plugin file:

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

If the iframe is blank, it is almost always server headers.

Your BeeLab host must allow being framed by your WordPress domain:

* remove/adjust `X-Frame-Options` (`SAMEORIGIN` / `DENY` will block embedding)
* add a CSP `frame-ancestors` directive that includes your WP domain

Example CSP:

```text
Content-Security-Policy: frame-ancestors 'self' https://your-wordpress-domain;
```

```

 