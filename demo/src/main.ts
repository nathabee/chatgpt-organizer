// demo/src/main.ts

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

  ensureCss("/__cgo/panel.css");           // ✅ correct

  const html = await fetch("/__cgo/panel.html").then((r) => r.text());  // ✅ correct
  root.innerHTML = html;

  await import("../../src/panel/panel");   // no .ts
}

boot().catch((e) => {
  document.body.innerHTML = `<pre style="white-space:pre-wrap">${String(e?.stack || e)}</pre>`;
});
