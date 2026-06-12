// Smoke check for video export: open a demo project (photos + wav soundtrack),
// click Export Video, and assert a non-trivial mp4 lands in exports/.
//   pnpm build && pnpm preview   then   node scripts/playwright-export-smoke.mjs
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
  // playwright-cli exits 0 even when the page code throws — detect its error block.
  if ((result.stdout ?? '').includes('### Error')) return 1
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
    imageDurationSecs: 1,
    kenBurns: true,
    transitionType: 'crossfade',
  },
  schemaVersion: 1,
  slides: [
    { durationInFrames: 30, excluded: false, filename: 'photo.jpg', id: 'photo-a', type: 'image' },
    { durationInFrames: 30, excluded: false, filename: 'photo2.jpg', id: 'photo-b', type: 'image' },
  ],
  soundtrackFilename: 'theme.wav',
}, null, 2)).toString('base64')

const code = `async page => {
  const payload = ${JSON.stringify(payload)};

  await page.goto(${JSON.stringify(PREVIEW_URL)});

  await page.evaluate((files) => {
    function decodeBase64(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    function mimeFor(name) {
      if (name.endsWith('.jpg')) return 'image/jpeg';
      if (name.endsWith('.wav')) return 'audio/wav';
      if (name.endsWith('.mp4')) return 'video/mp4';
      return 'application/json';
    }
    class MockFileHandle {
      constructor(name, base64) {
        this.kind = 'file';
        this.name = name;
        this._base64 = base64;
        this.writtenBytes = 0;
      }
      async getFile() {
        const bytes = decodeBase64(this._base64);
        return new File([bytes], this.name, { type: mimeFor(this.name), lastModified: 1781145972852 });
      }
      async createWritable() {
        const handle = this;
        return {
          // Keep the written blob so the test can decode and verify it.
          write: async (data) => {
            const blob = data instanceof Blob ? data : new Blob([data]);
            handle.writtenBlob = blob;
            handle.writtenBytes += blob.size;
          },
          close: async () => {},
        };
      }
    }
    class MockDirHandle {
      constructor(name, files) {
        this.kind = 'directory';
        this.name = name;
        this._files = files;
        this._dirs = new Map();
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
      async getDirectoryHandle(name, options) {
        const dir = this._dirs.get(name);
        if (dir) return dir;
        if (options?.create) {
          const created = new MockDirHandle(name, new Map());
          this._dirs.set(name, created);
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
    window.__mockRoot = new MockDirHandle('demo', handles);
    window.showDirectoryPicker = async () => window.__mockRoot;
  }, payload);

  await page.getByRole('button', { name: 'Open Folder' }).click();
  await page.getByText('photo2.jpg').first().waitFor();

  const exportButton = page.getByRole('button', { name: 'Export Video' });
  await exportButton.waitFor();
  if (await exportButton.isDisabled()) throw new Error('Export Video button is disabled with slides present');

  // --- 1. Default flow: MP4 into the project exports/ folder ---
  await exportButton.click();
  await page.getByLabel('Format').waitFor();
  await page.screenshot({ path: 'export-video-smoke-configure.png' });
  await page.getByRole('button', { name: 'Start Export' }).click();

  // Render + encode of the ~1.5s show. Generous timeout for software encoding.
  await page.getByText('Saved as').waitFor({ timeout: 180000 });
  await page.screenshot({ path: 'export-video-smoke.png' });

  const result = await page.evaluate(async () => {
    const exportsDir = window.__mockRoot._dirs.get('exports');
    if (!exportsDir) return { error: 'no exports/ directory created' };
    const entry = [...exportsDir._files.entries()].find(([name]) => name.endsWith('.mp4'));
    if (!entry) return { error: 'no .mp4 written to exports/' };
    const [name, handle] = entry;
    const url = URL.createObjectURL(handle.writtenBlob);
    const video = document.createElement('video');
    video.muted = true;
    video.src = url;
    try {
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('exported mp4 failed to decode'));
      });
      // Play briefly so Chrome reports decoded audio bytes (proves the aac track exists).
      await video.play();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      video.pause();
      return {
        audioBytes: video.webkitAudioDecodedByteCount ?? -1,
        bytes: handle.writtenBytes,
        duration: video.duration,
        height: video.videoHeight,
        name,
        width: video.videoWidth,
      };
    } catch (error) {
      return { error: String(error) };
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  if (result.error) throw new Error(result.error);
  if (result.width !== 1920 || result.height !== 1080) {
    throw new Error('expected 1920x1080, got ' + result.width + 'x' + result.height);
  }
  // Two 30-frame slides minus the crossfade overlap: between 1s and 3s.
  if (!(result.duration > 1 && result.duration < 3)) {
    throw new Error('expected 1-3s duration, got ' + result.duration);
  }
  if (result.audioBytes === 0) throw new Error('exported mp4 has no decodable audio track');
  console.log('PASS export: exports/' + result.name + ' decodes — ' +
    result.width + 'x' + result.height + ', ' + result.duration.toFixed(2) + 's, ' +
    result.bytes + ' bytes, audioBytes=' + result.audioBytes);
  await page.getByRole('button', { name: 'Done' }).click();

  // --- 2. Second path: WebM to a user-chosen location via showSaveFilePicker ---
  await page.evaluate(() => {
    window.__savePicked = null;
    window.showSaveFilePicker = async (options) => {
      const MockFileHandle = window.__mockRoot._files.get('photo.jpg').constructor;
      const handle = new MockFileHandle(options?.suggestedName ?? 'export.webm', '');
      window.__savePicked = handle;
      return handle;
    };
  });
  await exportButton.click();
  await page.getByLabel('Format').click();
  await page.getByRole('option', { name: /WebM/ }).click();
  await page.getByLabel('Save to').click();
  await page.getByRole('option', { name: /Choose where/ }).click();
  await page.getByRole('button', { name: 'Start Export' }).click();
  await page.getByText('Saved as').waitFor({ timeout: 180000 });

  const picked = await page.evaluate(() => {
    const handle = window.__savePicked;
    if (!handle) return { error: 'showSaveFilePicker was never called' };
    return { bytes: handle.writtenBytes, name: handle.name };
  });
  if (picked.error) throw new Error(picked.error);
  if (!picked.name.endsWith('.webm')) throw new Error('expected .webm suggested name, got ' + picked.name);
  // The gray fixture frames compress brutally under vp9 — any non-trivial size passes.
  if (picked.bytes < 2000) throw new Error('webm suspiciously small: ' + picked.bytes + ' bytes');
  console.log('PASS save-as: ' + picked.name + ' (' + picked.bytes + ' bytes) written to picked location');
  await page.getByRole('button', { name: 'Done' }).click();
}`

let status = run(['open', PREVIEW_URL, '--browser=chrome'])
if (status !== 0) process.exit(status)

status = run(['run-code', code])
run(['close'])
process.exit(status)
