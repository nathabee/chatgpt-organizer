// demo/src/main.ts

function getBasePath(): string {
  // If hosted at https://host/cgo-demo/..., base becomes "/cgo-demo/"
  // If hosted at https://host/, base becomes "/"
  const p = window.location.pathname;
  return p.endsWith("/") ? p : p.replace(/\/[^/]*$/, "/");
}

function joinBase(base: string, rel: string): string {
  // base ends with "/", rel may start with "/"
  rel = rel.replace(/^\/+/, "");
  return base + rel;
}

function ensureCss(href: string) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

async function boot() {
  const root = document.getElementById("cgo-demo-root");
  if (!root) throw new Error("Missing #cgo-demo-root");

  const base = getBasePath();

  const cssUrl = joinBase(base, "__cgo/panel.css");
  const htmlUrl = joinBase(base, "__cgo/panel.html");

  ensureCss(cssUrl);

  const r = await fetch(htmlUrl);
  if (!r.ok) throw new Error(`Failed to fetch ${htmlUrl}: ${r.status} ${r.statusText}`);
  const html = await r.text();

  root.innerHTML = html;

  await import("../../src/panel/panel"); // no .ts
}

boot().catch((e) => {
  document.body.innerHTML = `<pre style="white-space:pre-wrap">${String(e?.stack || e)}</pre>`;
});
