import { build, context } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

function copyDir(srcDir, dstDir) {
  mkdirp(dstDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else copyFile(src, dst);
  }
}

function copyStatic() {
  // manifest
  copyFile(path.join(root, "manifest.json"), path.join(distDir, "manifest.json"));

  // panel files
  copyFile(path.join(root, "src/panel/panel.html"), path.join(distDir, "panel/panel.html"));
  copyFile(path.join(root, "src/panel/panel.css"), path.join(distDir, "panel/panel.css"));

  // assets
  const assetsSrc = path.join(root, "assets");
  if (fs.existsSync(assetsSrc)) copyDir(assetsSrc, path.join(distDir, "assets"));
}

const isWatch = process.argv.includes("--watch");

if (!isWatch) {
  rmrf(distDir);
}
mkdirp(distDir);

const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  outdir: distDir,
  platform: "browser",
  logLevel: "info"
};

const entryPoints = {
  background: path.join(root, "src/background/index.ts"),
  content: path.join(root, "src/content.ts"),
  panel: path.join(root, "src/panel/panel.ts"),
};
 
async function runOnce() {
  await build({
    ...common,
    entryPoints,
    entryNames: "[name]"
  });
  copyStatic();
}

async function runWatch() {
  const ctx = await context({
    ...common,
    entryPoints,
    entryNames: "[name]"
  });

  await ctx.watch();
  copyStatic();

  // crude static watcher: recopy on change (good enough for now)
  fs.watch(path.join(root, "manifest.json"), () => copyStatic());
  fs.watch(path.join(root, "src/panel"), { recursive: true }, () => copyStatic());
  fs.watch(path.join(root, "assets"), { recursive: true }, () => copyStatic());

  console.log("Watching…");
}

if (isWatch) await runWatch();
else await runOnce();
