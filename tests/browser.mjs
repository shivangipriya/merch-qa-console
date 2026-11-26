// Browser assertions for the built app, driven over CDP against headless Chrome.
// Usage: CHROME_PATH=/path/to/chrome node tests/browser.mjs [port]
// Requires docs/ to be built and served statically (this script serves it itself).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import CDP from 'chrome-remote-interface';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const WIDTHS = [1440, 768, 390, 320];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(DOCS, p);
    if (!file.startsWith(DOCS)) throw new Error('nope');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

let passed = 0, failed = 0;
const ok = (cond, name) => { if (cond) passed++; else { failed++; console.error('FAIL:', name); } };

const port = 8931;
await new Promise((r) => server.listen(port, r));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=9333',
  `--window-size=${WIDTHS[0]},900`, 'about:blank',
], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));

let client;
try {
  client = await CDP({ port: 9333 });
  const { Page, Runtime, Emulation } = client;
  await Page.enable(); await Runtime.enable();
  await Page.addScriptToEvaluateOnNewDocument({ source: 'window.__errors=[];window.addEventListener("error",e=>window.__errors.push(String(e.message)));window.addEventListener("unhandledrejection",e=>window.__errors.push(String(e.reason)));' });

  const evaluate = async (expr) => (await Runtime.evaluate({ expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  const goto = async () => {
    await Page.navigate({ url: `http://127.0.0.1:${port}/` });
    await new Promise((r) => setTimeout(r, 1800));
  };
  const click = async (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  const text = async () => evaluate('document.body.innerText');

  await goto();
  let t = await text();
  ok(/Merch QA Console/.test(t), 'header renders');
  ok(/synthetic catalog/.test(t), 'synthetic-data disclosure renders');
  ok((await evaluate('document.querySelectorAll(".tile").length')) === 25, '25 catalog tiles render');
  ok((await evaluate('[...document.querySelectorAll(".tile-noimg")].some(e => e.textContent.includes("no image"))')), 'null-image tile shows placeholder');

  // CK-117 seeded bad reference: the browser must actually fail to load it.
  await new Promise((r) => setTimeout(r, 800));
  const failedImg = await evaluate('[...document.querySelectorAll(".tile-noimg")].some(e => e.textContent.includes("failed to load"))');
  ok(failedImg, 'CK-117 img load failure observed at render time');

  // Tabs render
  for (const tab of ['checks', 'api', 'triage', 'brief']) {
    ok(await click(`[data-testid="tab-${tab}"]`), `tab ${tab} clickable`);
    await new Promise((r) => setTimeout(r, 200));
  }

  // Run checks
  await click('[data-testid="tab-checks"]');
  await new Promise((r) => setTimeout(r, 200));
  ok(await click('[data-testid="run-checks"]'), 'run-checks button clicked');
  await new Promise((r) => setTimeout(r, 600));
  t = await text();
  ok(/finding/.test(t), 'findings render after run');
  const findingCount = await evaluate('document.querySelectorAll(".finding").length');
  ok(findingCount >= 10, `findings present (${findingCount})`);
  ok(/attempted this reference and the load failed/i.test(t), 'runtime load failure merged into the image finding as observed evidence');
  await click('[data-testid="tab-catalog"]');
  await new Promise((r) => setTimeout(r, 400));
  const flagged = await evaluate('document.querySelectorAll(".tile-flagged").length');
  ok(flagged >= 10, `flagged tiles marked (${flagged})`);

  // API inspector: schema-drift fixture flags contract issues
  await click('[data-testid="tab-api"]');
  await new Promise((r) => setTimeout(r, 200));
  ok(await click('[data-testid="validate-api"]'), 'validate clicked (healthy fixture)');
  await new Promise((r) => setTimeout(r, 300));
  ok(/validates clean/.test(await text()), 'healthy fixture validates clean');
  await evaluate('[...document.querySelectorAll(".chip")].find(c => c.textContent.includes("schema drift")).click()');
  await new Promise((r) => setTimeout(r, 200));
  await click('[data-testid="validate-api"]');
  await new Promise((r) => setTimeout(r, 300));
  t = await text();
  ok(/sellingPrice/.test(t) && /imageUrl/.test(t), 'schema drift issues listed');
  ok(await click('[data-testid="draft-note"]'), 'issue note drafted');
  await new Promise((r) => setTimeout(r, 200));
  ok(/Note added to brief/.test(await text()), 'note confirmation shows');
  // 500 fixture
  await evaluate('[...document.querySelectorAll(".chip")].find(c => c.textContent.includes("server error")).click()');
  await new Promise((r) => setTimeout(r, 200));
  await click('[data-testid="validate-api"]');
  await new Promise((r) => setTimeout(r, 300));
  ok(/500 Internal Server Error/.test(await text()), '500 fixture surfaced as critical');

  // Triage
  await click('[data-testid="tab-triage"]');
  await new Promise((r) => setTimeout(r, 300));
  t = await text();
  ok(/heuristic prox(y|ies)/.test(t), 'triage heuristic disclosure renders');
  const firstScore = await evaluate('parseInt(document.querySelector(".triage-row .score-num").textContent, 10)');
  const lastScore = await evaluate('parseInt([...document.querySelectorAll(".triage-row .score-num")].pop().textContent, 10)');
  ok(firstScore >= lastScore, 'triage sorted by impact descending');

  // Brief
  await click('[data-testid="tab-brief"]');
  await new Promise((r) => setTimeout(r, 300));
  t = await evaluate('document.querySelector("[data-testid=\\"brief-text\\"]").textContent');
  ok(/# Merch QA brief/.test(t), 'brief renders markdown');
  ok(/API validation notes/.test(t), 'brief carries the drafted API note');
  ok(/CRITICAL/.test(t), 'brief lists critical findings');

  // Overflow checks across widths
  for (const w of WIDTHS) {
    await Emulation.setDeviceMetricsOverride({ width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500 });
    await new Promise((r) => setTimeout(r, 350));
    const overflow = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 1');
    ok(!overflow, `no horizontal overflow at ${w}px`);
    for (const tab of ['catalog', 'checks', 'api', 'triage', 'brief']) {
      await click(`[data-testid="tab-${tab}"]`);
      await new Promise((r) => setTimeout(r, 150));
      const ov = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 1');
      ok(!ov, `no horizontal overflow at ${w}px on ${tab}`);
    }
  }

  // No uncaught page errors during the whole run
  const errors = await evaluate('window.__errors || []');
  ok((errors || []).length === 0, 'no captured window errors');
} catch (e) {
  failed++;
  console.error('FAIL: driver error', e.message);
} finally {
  if (client) await client.close();
  chrome.kill();
  server.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
