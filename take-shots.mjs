// take-shots.mjs — take Emberlight's 4 entry screenshots with Playwright.
// Serves game/ on a local port, loads each deterministic ?shot= scene,
// waits for window.__shotReady, and saves a JPEG (1280x720, quality 82)
// into screenshots/. Also smoke-tests the live game: loads the plain
// page, fails on any console error, starts a run with Enter, steers a
// little, and saves one interactive frame to /tmp for a human to eyeball.
//
// Usage: node take-shots.mjs   (run from ~/workspace/best-game-entry)
// Requires: playwright chromium installed (npx playwright install chromium).

import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = process.env.EMBERLIGHT_ENTRY || dirname(fileURLToPath(import.meta.url));
const gameDir = join(root, 'game');
const shotDir = join(root, 'screenshots');
mkdirSync(shotDir, { recursive: true });

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = join(gameDir, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!path.startsWith(gameDir) || !existsSync(path)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
console.log(`serving game/ on http://127.0.0.1:${port}`);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

// 1. Smoke-test the live game first.
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.waitForTimeout(800);
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(600);
await page.keyboard.up('ArrowRight');
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(600);
await page.keyboard.up('ArrowUp');
await page.keyboard.press(' ');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/emberlight-live.jpg', type: 'jpeg', quality: 82 });
console.log('live playtest frame saved to /tmp/emberlight-live.jpg');

// 2. The four deterministic entry screenshots.
const scenes = [
  ['1-title', 'title'],
  ['2-play', 'play'],
  ['3-win', 'win'],
  ['4-lose', 'lose'],
];
for (const [name, scene] of scenes) {
  await page.goto(`http://127.0.0.1:${port}/index.html?shot=${scene}&seed=7`);
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 10000 });
  await page.waitForTimeout(150);
  const out = join(shotDir, `${name}.jpg`);
  await page.screenshot({ path: out, type: 'jpeg', quality: 82 });
  console.log(`shot ${scene} -> ${out}`);
}

await browser.close();
server.close();

if (errors.length > 0) {
  console.error('ERRORS during playtest:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('OK: no console/page errors');
