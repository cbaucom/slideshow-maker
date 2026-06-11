import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

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
  globalSettings: {
    fitMode: 'cover',
    imageDurationSecs: 3,
    kenBurns: true,
    transitionType: 'cut',
  },
  schemaVersion: 1,
  slides: [
    {
      durationInFrames: 90,
      excluded: false,
      filename: 'photo.jpg',
      id: 'photo.jpg-1781145972852',
      type: 'image',
    },
    {
      durationInFrames: 90,
      excluded: false,
      filename: 'photo2.jpg',
      id: 'photo2.jpg-1781145972852',
      type: 'image',
    },
  ],
}, null, 2)).toString('base64')

const code = `async page => {
  const payload = ${JSON.stringify(payload)};
  await page.goto('http://localhost:5173/');
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
        const type = this.name.endsWith('.jpg') ? 'image/jpeg'
          : this.name.endsWith('.wav') ? 'audio/wav'
          : 'application/json';
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
  await page.getByText('photo.jpg').first().waitFor();
  await page.getByText('photo2.jpg').first().waitFor();

  await page.evaluate(async () => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['new image'], 'imported.jpg', { type: 'image/jpeg', lastModified: 1781145972852 }));
    transfer.items.add(new File(['duplicate'], 'photo.jpg', { type: 'image/jpeg', lastModified: 1781145972852 }));
    transfer.items.add(new File(['text'], 'notes.txt', { type: 'text/plain', lastModified: 1781145972852 }));
    window.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
  });

  await page.getByText('imported.jpg').first().waitFor();
  await page.getByText('photo-1.jpg').first().waitFor();
  await page.getByText('Skipped unsupported file type: notes.txt').waitFor();
  await page.screenshot({ path: 'issue-16-drag-drop-import.png', fullPage: true });
}`

let status = run(['open', 'http://localhost:5173/', '--browser=chrome'])
if (status !== 0) process.exit(status)

status = run(['run-code', code])
run(['close'])
process.exit(status)
