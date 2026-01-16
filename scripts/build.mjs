// scripts/build.mjs
import { build, context } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync, spawn } from "node:child_process";

const root = process.cwd();
const distDir = path.join(root, "dist");

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir, opts = {}) {
  const { excludeFileNames = new Set() } = opts;
  mkdirp(dstDir);

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (excludeFileNames.has(entry.name)) continue;

    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);

    if (entry.isDirectory()) copyDir(src, dst, opts);
    else copyFile(src, dst);
  }
}

function copyStatic({ isDev }) {
  // manifest
  copyFile(path.join(root, "manifest.json"), path.join(distDir, "manifest.json"));

  // panel files
  copyFile(path.join(root, "src/panel/panel.html"), path.join(distDir, "panel/panel.html"));
  copyFile(path.join(root, "src/panel/panel.css"), path.join(distDir, "panel/panel.css"));

  // assets
  const assetsSrc = path.join(root, "assets");
  if (fs.existsSync(assetsSrc)) {
    // For Chrome Web Store uploads: exclude icon.svg (not needed at runtime)
    const excludeFileNames = isDev ? new Set() : new Set(["icon.svg"]);
    copyDir(assetsSrc, path.join(distDir, "assets"), { excludeFileNames });
  }
}

function watchIfExists(fileOrDir, opts, cb) {
  if (!fs.existsSync(fileOrDir)) return;
  try {
    fs.watch(fileOrDir, opts, cb);
  } catch {
    // ignore watcher failures (platform quirks)
  }
}

function runTypecheckOnce() {
  const tscBin = process.platform === "win32" ? "tsc.cmd" : "tsc";
  const r = spawnSync(tscBin, ["-p", "tsconfig.json", "--noEmit"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runTypecheckWatch() {
  const tscBin = process.platform === "win32" ? "tsc.cmd" : "tsc";
  const child = spawn(tscBin, ["-p", "tsconfig.json", "--noEmit", "--watch"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
}

const isWatch = process.argv.includes("--watch");
const wantsTypecheckInWatch = process.argv.includes("--typecheck");

// Allow forcing dev mode even without watch (optional)
const isDev = isWatch || process.argv.includes("--dev");

if (!isWatch) {
  rmrf(distDir);
}
mkdirp(distDir);

const entryPoints = {
  background: path.join(root, "src/background/index.ts"),
  content: path.join(root, "src/content.ts"),
  panel: path.join(root, "src/panel/panel.ts"),
};

const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: isDev, // ✅ maps only in dev/watch
  outdir: distDir,
  platform: "browser",
  logLevel: "info",
};

async function runOnce() {
  // fail build on TS errors
  runTypecheckOnce();

  await build({
    ...common,
    entryPoints,
    entryNames: "[name]",
  });

  copyStatic({ isDev });
}

async function runWatch() {
  if (wantsTypecheckInWatch) {
    runTypecheckWatch();
  }

  const ctx = await context({
    ...common,
    entryPoints,
    entryNames: "[name]",
  });

  await ctx.watch();
  copyStatic({ isDev });

  // crude static watcher: recopy on change
  watchIfExists(path.join(root, "manifest.json"), {}, () => copyStatic({ isDev }));
  watchIfExists(path.join(root, "src/panel"), { recursive: true }, () => copyStatic({ isDev }));

  const assetsDir = path.join(root, "assets");
  watchIfExists(assetsDir, { recursive: true }, () => copyStatic({ isDev }));

  console.log("Watching…");
}

if (isWatch) await runWatch();
else await runOnce();
