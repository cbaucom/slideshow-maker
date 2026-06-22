// Smoke: folder open + audio playlist load timing. Run:
//   pnpm dev   (or pnpm build && pnpm preview)
//   node scripts/playwright-folder-load-smoke.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173/'
const MAX_LOAD_MS = Number(process.env.MAX_LOAD_MS ?? 8000)
const MAX_ANALYSIS_MS = Number(process.env.MAX_ANALYSIS_MS ?? 15000)

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
const names = ['photo.jpg', 'photo2.jpg', 'theme.wav']
const payload = Object.fromEntries(
  names.map((name) => [name, fs.readFileSync(path.join(demo, name)).toString('base64')]),
)
payload['slideshow.json'] = Buffer.from(JSON.stringify({
  audioClips: [{ filename: 'theme.wav' }],
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
  const maxLoadMs = ${MAX_LOAD_MS};
  const maxAnalysisMs = ${MAX_ANALYSIS_MS};

  await page.goto(${JSON.stringify(APP_URL)});

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
        const type = nameToType(this.name);
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
    function nameToType(name) {
      if (name.endsWith('.jpg')) return 'image/jpeg';
      if (name.endsWith('.wav')) return 'audio/wav';
      if (name.endsWith('.json')) return 'application/json';
      return 'application/octet-stream';
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
    window.showDirectoryPicker = async () => new MockDirHandle(handles);
  }, payload);

  const loadStart = Date.now();
  await page.getByRole('button', { name: 'Open Folder' }).click();
  await page.getByText('photo2.jpg').first().waitFor({ timeout: maxLoadMs });
  const loadMs = Date.now() - loadStart;

  const loadingBanner = page.getByText('Loading media…');
  if (await loadingBanner.isVisible()) {
    throw new Error('Loading media banner still visible after filmstrip appeared');
  }

  const player = page.locator('.__remotion-player');
  await player.waitFor({ timeout: 5000 });
  const playerMs = Date.now() - loadStart;

  const analysisStart = Date.now();
  const analyzing = page.getByText('Analyzing soundtrack…');
  if (await analyzing.isVisible().catch(() => false)) {
    await analyzing.waitFor({ state: 'hidden', timeout: maxAnalysisMs });
  }
  const analysisMs = Date.now() - analysisStart;

  const errors = await page.evaluate(() => {
    return window.__playwrightErrors ?? [];
  });

  console.log('TIMING loadMs=' + loadMs + ' playerMs=' + playerMs + ' analysisMs=' + analysisMs);
  if (loadMs > maxLoadMs) {
    throw new Error('folder load exceeded ' + maxLoadMs + 'ms: ' + loadMs);
  }
  console.log('PASS folder load smoke');
}`

let status = run(['open', APP_URL, '--browser=chrome'])
if (status !== 0) process.exit(status)

status = run(['run-code', code])
run(['close'])
if (status !== 0) process.exit(status)
console.log('PASS folder load smoke complete')
