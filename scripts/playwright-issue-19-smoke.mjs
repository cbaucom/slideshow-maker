// Smoke check for issue #19 (PWA + aspect ratio). Run against a PROD preview,
// not the dev server — the service worker only registers in PROD builds:
//   pnpm build && pnpm preview   then   node scripts/playwright-issue-19-smoke.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const PREVIEW_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173/'

function run(args) {
  const result = spawnSync('npx', ['playwright-cli', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) console.error(result.error)
  return result.status ?? 1
}

const demo = path.resolve('test-fixtures/demo')
const names = ['photo.jpg', 'photo2.jpg']
const payload = Object.fromEntries(
  names.map((name) => [name, fs.readFileSync(path.join(demo, name)).toString('base64')]),
)
payload['slideshow.json'] = Buffer.from(JSON.stringify({
  aspectRatio: '9:16',
  globalSettings: {
    fitMode: 'cover',
    imageDurationSecs: 3,
    kenBurns: true,
    transitionType: 'crossfade',
  },
  schemaVersion: 1,
  slides: [
    { durationInFrames: 90, excluded: false, filename: 'photo.jpg', id: 'photo-a', type: 'image' },
    { durationInFrames: 90, excluded: false, filename: 'photo2.jpg', id: 'photo-b', type: 'image' },
  ],
}, null, 2)).toString('base64')

const code = `async page => {
  const payload = ${JSON.stringify(payload)};

  // --- 1. Installability signals: manifest + active service worker ---
  await page.goto(${JSON.stringify(PREVIEW_URL)});
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) throw new Error('no <link rel="manifest"> in document');
    const res = await fetch(link.href);
    if (!res.ok) throw new Error('manifest fetch failed: ' + res.status);
    return res.json();
  });
  if (!manifest.icons || manifest.icons.length < 2 || manifest.display !== 'standalone') {
    throw new Error('manifest not installable: ' + JSON.stringify(manifest));
  }
  await page.evaluate(() => Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('service worker never ready')), 10000)),
  ]));

  // Reload so the SW controls the page and runtime-caches the hashed assets.
  await page.reload();
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  if (!controlled) throw new Error('page not controlled by service worker after reload');
  console.log('PASS installability: manifest ok, service worker controlling');

  // --- 2. 9:16 project: portrait composition, all fit modes render ---
  await page.evaluate((files) => {
    function decodeBase64(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    class MockFileHandle {
      constructor(name, base64) {
        this.kind = 'file';
        this.name = name;
        this._base64 = base64;
      }
      async getFile() {
        const bytes = decodeBase64(this._base64);
        const type = this.name.endsWith('.jpg') ? 'image/jpeg' : 'application/json';
        return new File([bytes], this.name, { type, lastModified: 1781145972852 });
      }
      async createWritable() {
        const handle = this;
        return {
          write: async (data) => {
            const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
            handle._base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          },
          close: async () => {},
        };
      }
    }
    class MockDirHandle {
      constructor(files) {
        this.name = 'demo';
        this._files = files;
      }
      async getFileHandle(name, options) {
        const handle = this._files.get(name);
        if (handle) return handle;
        if (options?.create) {
          const created = new MockFileHandle(name, '');
          this._files.set(name, created);
          return created;
        }
        throw new DOMException('NotFoundError');
      }
      async *values() {
        for (const handle of this._files.values()) yield handle;
      }
    }
    const handles = new Map(
      Object.entries(files).map(([name, base64]) => [name, new MockFileHandle(name, base64)]),
    );
    window.__mockHandles = handles;
    window.showDirectoryPicker = async () => new MockDirHandle(handles);
  }, payload);

  await page.getByRole('button', { name: 'Open Folder' }).click();
  await page.getByText('photo2.jpg').first().waitFor();

  async function assertPortraitPlayer(label) {
    const ratio = await page.evaluate(() => {
      const player = document.querySelector('.__remotion-player');
      if (!player) return null;
      const rect = player.getBoundingClientRect();
      return rect.width / rect.height;
    });
    if (ratio === null) throw new Error(label + ': remotion player element not found');
    if (Math.abs(ratio - 9 / 16) > 0.01) {
      throw new Error(label + ': expected portrait 9:16 player, got width/height=' + ratio.toFixed(3));
    }
    console.log('PASS ' + label + ': player aspect ' + ratio.toFixed(3));
  }

  const aspectToggle = page.getByRole('radio', { name: '9:16' });
  if (!(await aspectToggle.getAttribute('data-state')).includes('on')) {
    throw new Error('aspect toggle did not restore 9:16 from slideshow.json');
  }
  await assertPortraitPlayer('9:16 restored (cover)');

  // Play briefly to prove playback works in portrait.
  await page.keyboard.press(' ');
  await page.waitForTimeout(700);
  await page.keyboard.press(' ');

  for (const fit of ['Letterbox', 'Blur fill']) {
    await page.getByLabel('Fit mode').click();
    await page.getByRole('option', { name: fit }).click();
    await page.waitForTimeout(400);
    await assertPortraitPlayer('9:16 ' + fit);
  }
  await page.screenshot({ path: 'issue-19-pwa-aspect-ratio.png', fullPage: true });

  // --- 3. Offline: app shell still loads ---
  await page.context().setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Open Folder' }).waitFor({ timeout: 10000 });
  console.log('PASS offline: app shell loaded while offline');
  await page.context().setOffline(false);
}`

let status = run(['open', PREVIEW_URL, '--browser=chrome'])
if (status !== 0) process.exit(status)

status = run(['run-code', code])
run(['close'])
process.exit(status)
