// Smoke: theme toggle with heavy slideshow. Run: pnpm dev && node scripts/playwright-theme-toggle-smoke.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173/'
const MAX_TOGGLE_MS = Number(process.env.MAX_TOGGLE_MS ?? 3000)

function run(args) {
  const result = spawnSync('npx', ['playwright-cli', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  return result.status ?? 1
}

const demo = path.resolve('test-fixtures/demo')
const photo = fs.readFileSync(path.join(demo, 'photo.jpg')).toString('base64')
const photo2 = fs.readFileSync(path.join(demo, 'photo2.jpg')).toString('base64')
const theme = fs.readFileSync(path.join(demo, 'theme.wav')).toString('base64')
const slides = Array.from({ length: 80 }, (_, index) => ({
  durationInFrames: 90,
  excluded: false,
  filename: index % 2 === 0 ? 'photo.jpg' : 'photo2.jpg',
  id: `slide-${index}`,
  type: 'image',
}))
const slideshow = {
  audioClips: [
    { filename: 'theme.wav' },
    { filename: 'theme.wav' },
    { filename: 'theme.wav' },
  ],
  globalSettings: {
    beatSync: true,
    fitMode: 'cover',
    imageDurationSecs: 4,
    kenBurns: true,
    transitionType: 'crossfade',
  },
  schemaVersion: 1,
  slides,
}
const payload = {
  'photo.jpg': photo,
  'photo2.jpg': photo2,
  'theme.wav': theme,
  'slideshow.json': Buffer.from(JSON.stringify(slideshow, null, 2)).toString('base64'),
}

const code = `async page => {
  const payload = ${JSON.stringify(payload)};
  const maxToggleMs = ${MAX_TOGGLE_MS};

  await page.goto(${JSON.stringify(APP_URL)});
  await page.setViewportSize({ width: 1280, height: 800 });

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
        const type = this.name.endsWith('.jpg') ? 'image/jpeg' : this.name.endsWith('.wav') ? 'audio/wav' : 'application/json';
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
    window.showDirectoryPicker = async () => new MockDirHandle(handles);
  }, payload);

  await page.getByRole('button', { name: 'Open Folder' }).click();
  await page.getByText('photo2.jpg').first().waitFor({ timeout: 15000 });

  const analyzing = page.getByText('Analyzing soundtrack');
  if (await analyzing.first().isVisible().catch(() => false)) {
    await analyzing.first().waitFor({ state: 'hidden', timeout: 30000 });
  }

  await page.getByRole('radio', { name: 'Classic', exact: true }).waitFor({ timeout: 10000 });

  async function toggleTheme(name) {
    const start = Date.now();
    await page.getByRole('radio', { name, exact: true }).click();
    const banner = page.getByText('Updating preview');
    if (await banner.isVisible().catch(() => false)) {
      await banner.waitFor({ state: 'hidden', timeout: maxToggleMs });
    }
    const ms = Date.now() - start;
    console.log('toggle ' + name + ' ms=' + ms);
    if (ms > maxToggleMs) {
      throw new Error('toggle ' + name + ' took ' + ms + 'ms');
    }
  }

  await toggleTheme('Energetic');
  await toggleTheme('Classic');
  await toggleTheme('Energetic');
  console.log('PASS theme toggle smoke');
}`

let status = run(['open', APP_URL, '--browser=chrome'])
if (status !== 0) process.exit(status)

status = run(['run-code', code])
run(['close'])
if (status !== 0) {
  console.error('FAIL theme toggle smoke (exit ' + status + ')')
  process.exit(status)
}
console.log('PASS theme toggle smoke complete')
