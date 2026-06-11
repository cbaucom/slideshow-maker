import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const DEV_URL = process.env.DEV_URL ?? 'http://localhost:5175/'

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
  globalSettings: {
    fitMode: 'cover',
    imageDurationSecs: 3,
    kenBurns: false,
    transitionType: 'cut',
  },
  schemaVersion: 1,
  slides: [
    {
      durationInFrames: 90,
      excluded: false,
      filename: 'photo.jpg',
      id: 'photo-a',
      type: 'image',
    },
    {
      durationInFrames: 90,
      excluded: false,
      filename: 'photo2.jpg',
      id: 'photo-b',
      type: 'image',
    },
  ],
}, null, 2)).toString('base64')

const code = `async page => {
  const payload = ${JSON.stringify(payload)};
  await page.goto(${JSON.stringify(DEV_URL)});
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
    window.showDirectoryPicker = async () => new MockDirHandle(handles);
  }, payload);

  await page.getByRole('button', { name: 'Open Folder' }).click();
  await page.getByText('photo2.jpg').first().waitFor();

  const secondSlide = page.locator('li').filter({ hasText: 'photo2.jpg' }).first();
  await secondSlide.click();
  await page.waitForTimeout(300);

  const currentHighlight = await secondSlide.evaluate((element) => element.className.includes('ring-emerald-500'));
  if (!currentHighlight) {
    throw new Error('Expected photo2.jpg to be highlighted as the current slide after click');
  }

  await page.getByRole('button', { name: 'Present fullscreen' }).click();
  const presentationState = await page.evaluate(() => {
    const overlay = [...document.body.children].find((element) => (
      element.className.includes('fixed') && element.className.includes('inset-0')
    ));
    return {
      fullscreenTag: document.fullscreenElement?.tagName ?? null,
      hasOverlay: !!overlay,
      overlayIsFullscreen: overlay === document.fullscreenElement,
    };
  });
  if (!presentationState.hasOverlay) {
    throw new Error('Presentation overlay missing: ' + JSON.stringify(presentationState));
  }
  if (!presentationState.overlayIsFullscreen) {
    throw new Error('Presentation overlay is not fullscreen: ' + JSON.stringify(presentationState));
  }

  const coversViewport = await page.evaluate(() => {
    const overlay = [...document.body.children].find((element) => (
      element.className.includes('fixed') && element.className.includes('inset-0')
    ));
    if (!overlay) return false;
    const rect = overlay.getBoundingClientRect();
    return rect.width >= window.innerWidth - 1 && rect.height >= window.innerHeight - 1;
  });
  if (!coversViewport) {
    throw new Error('Expected presentation overlay to cover the viewport');
  }

  await page.evaluate(() => document.fullscreenElement?.focus());
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  await page.getByRole('button', { name: 'Present fullscreen' }).waitFor({ timeout: 5000 });

  await page.screenshot({ path: 'issue-17-playback-controls.png', fullPage: true });
}`

let status = run(['open', DEV_URL, '--browser=chrome'])
if (status !== 0) process.exit(status)

status = run(['run-code', code])
run(['close'])
process.exit(status)
