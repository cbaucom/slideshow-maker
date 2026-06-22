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
  audioClips: [],
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
      durationInFrames: 180,
      excluded: false,
      heading: 'Long title',
      id: 'title-b',
      kind: 'title',
      style: 'dark',
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
  await page.getByText('Long title').first().waitFor();

  const widths = await page.locator('[data-timeline-block]').evaluateAll((elements) => (
    elements.map((element) => Math.round(element.getBoundingClientRect().width))
  ));
  if (widths.length < 2) {
    throw new Error('Expected at least two proportional media blocks, got: ' + JSON.stringify(widths));
  }
  if (widths[1] <= widths[0]) {
    throw new Error('Expected second slide wider than first (3s vs 6s): ' + JSON.stringify(widths));
  }

  const secondSlide = page.locator('[data-timeline-block]').nth(1);
  await secondSlide.click();
  await page.waitForTimeout(300);

  const currentHighlight = await secondSlide.evaluate((element) => element.className.includes('ring-emerald-500'));
  if (!currentHighlight) {
    throw new Error('Expected second slide highlighted as current after click');
  }

  await page.screenshot({ path: 'issue-48-proportional-timeline.png', fullPage: true });
}`

let status = run(['open', DEV_URL, '--browser=chrome'])
if (status !== 0) process.exit(status)

status = run(['run-code', code])
run(['close'])
process.exit(status)
