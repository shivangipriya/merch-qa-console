// Capture screenshots of every tab at desktop and phone widths for pixel review.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import CDP from 'chrome-remote-interface';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const OUT = path.join(ROOT, 'shots');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const data = await readFile(path.join(DOCS, p));
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(8932, r));
await mkdir(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=9334', '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));

const client = await CDP({ port: 9334 });
const { Page, Runtime, Emulation } = client;
await Page.enable(); await Runtime.enable();
const evaluate = async (expr) => (await Runtime.evaluate({ expression: expr, returnByValue: true })).result.value;

for (const [w, h, label] of [[1440, 1000, 'desktop'], [390, 844, 'phone']]) {
  await Emulation.setDeviceMetricsOverride({ width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
  await Page.navigate({ url: 'http://127.0.0.1:8932/' });
  await new Promise((r) => setTimeout(r, 2000));
  // run checks first so flagged state shows on catalog
  await evaluate('document.querySelector("[data-testid=\\"tab-checks\\"]").click()');
  await new Promise((r) => setTimeout(r, 300));
  await evaluate('document.querySelector("[data-testid=\\"run-checks\\"]").click()');
  await new Promise((r) => setTimeout(r, 700));
  for (const tab of ['catalog', 'checks', 'api', 'triage', 'brief']) {
    await evaluate(`document.querySelector('[data-testid="tab-${tab}"]').click()`);
    await new Promise((r) => setTimeout(r, 500));
    const shot = await Page.captureScreenshot({ format: 'png' });
    await writeFile(path.join(OUT, `${label}-${tab}.png`), Buffer.from(shot.data, 'base64'));
    console.log(`saved ${label}-${tab}.png`);
  }
}
await client.close();
chrome.kill();
server.close();
