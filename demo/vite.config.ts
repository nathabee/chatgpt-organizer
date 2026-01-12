// demo/vite.config.ts
import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";

function tracePlatformResolves(): Plugin {
  return {
    name: "cgo-trace-platform-resolves",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (
        source.includes("panel/platform/runtime") ||
        source.includes("shared/platform/storage") ||
        source.includes("platform/runtime") ||
        source.includes("platform/storage")
      ) {
        const r = await this.resolve(source, importer, { ...options, skipSelf: true });
        console.log("[cgo-trace] source   :", source);
        console.log("[cgo-trace] importer :", importer);
        console.log("[cgo-trace] resolved :", r?.id);
        console.log("----");
      }
      return null;
    },
  };
}

function seamSwapPlugin(): Plugin {
  const mockRuntime = path.resolve(__dirname, "src/mocks/runtime.ts");
  const mockStorage = path.resolve(__dirname, "src/mocks/storage.ts");

  function clean(id: string) {
    return id.split("?")[0].replace(/\\/g, "/");
  }

  return {
    name: "cgo-seam-swap",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer) return null;

      const r = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!r?.id) return null;

      const id = clean(r.id);

      // Swap the real seams for mocks in the demo build/dev server
      if (id.includes("/src/panel/platform/runtime")) return mockRuntime;
      if (id.includes("/src/shared/platform/storage")) return mockStorage;

      return null;
    },
  };
}

function panelAssetsPlugin(): Plugin {
  const repoRoot = path.resolve(__dirname, "..");
  const panelHtml = path.resolve(repoRoot, "src/panel/panel.html");
  const panelCss = path.resolve(repoRoot, "src/panel/panel.css");

  function readOrNull(p: string): string | null {
    try {
      return fs.readFileSync(p, "utf8");
    } catch {
      return null;
    }
  }

  function sanitizePanelHtml(html: string): string {
    // Remove extension bundle script
    html = html.replace(
      /<script\s+type=["']module["']\s+src=["'][^"']*panel\.js["']\s*>\s*<\/script>\s*/gi,
      ""
    );

    // Ensure panel.css is referenced relatively so it works no matter where the demo is hosted
    // (GitHub Pages subpath, /cgo-demo/, /chatgpt-organizer/cgo-demo/, etc.)
    html = html.replace(/href=["'][^"']*panel\.css["']/gi, 'href="__cgo/panel.css"');

    return html;
  }

  function assertHtml(): string {
    const html = readOrNull(panelHtml);
    if (!html) throw new Error(`Missing panel HTML at: ${panelHtml}`);
    if (!html.includes('id="scopeLabel"')) {
      throw new Error(`Wrong panel HTML file (no #scopeLabel): ${panelHtml}`);
    }
    return sanitizePanelHtml(html);
  }

  return {
    name: "cgo-panel-assets",

    // DEV only: serve assets (production uses the emitted files)
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        // Works regardless of base because we match the suffix
        if (req.url.endsWith("/__cgo/panel.html")) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(assertHtml());
          return;
        }

        if (req.url.endsWith("/__cgo/panel.css")) {
          const css = readOrNull(panelCss);
          if (!css) {
            res.statusCode = 404;
            res.end(`Missing panel CSS at: ${panelCss}`);
            return;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/css; charset=utf-8");
          res.end(css);
          return;
        }

        next();
      });
    },

    // BUILD: emit into dist
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "__cgo/panel.html", source: assertHtml() });

      const css = readOrNull(panelCss);
      if (css) this.emitFile({ type: "asset", fileName: "__cgo/panel.css", source: css });
    },
  };
}

export default defineConfig(({ command }) => {
  const isDev = command === "serve"; // vite dev server
  return {
    root: __dirname,

    // Key change: portable build (works under any folder on GitHub Pages or BeeLab)
    base: "./",

    plugins: [
      ...(isDev ? [tracePlatformResolves()] : []),
      seamSwapPlugin(),
      panelAssetsPlugin(),
    ],
    server: {
      fs: { allow: [path.resolve(__dirname, "..")] },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
