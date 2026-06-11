// One-off generator: renders public/favicon.svg onto a dark square canvas and
// screenshots PNG app icons for the PWA manifest. Re-run if the favicon changes:
//   node scripts/generate-pwa-icons.mjs
import { createRequire } from 'node:module'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

// playwright is a transitive dep of @playwright/cli; resolve it through the pnpm store.
async function resolvePlaywright() {
  const pnpmDir = path.join(root, 'node_modules', '.pnpm')
  const entries = await readdir(pnpmDir)
  const cliDir = entries.find((name) => name.startsWith('@playwright+cli@'))
  if (!cliDir) throw new Error('@playwright/cli not found in node_modules/.pnpm')
  const requireFromCli = createRequire(
    path.join(pnpmDir, cliDir, 'node_modules', '@playwright', 'cli', 'package.json'),
  )
  return import(requireFromCli.resolve('playwright'))
}

const SIZES = [192, 512]
const BACKGROUND = '#18181b'
// Logo occupies 60% of the canvas so it stays inside the maskable safe zone.
const LOGO_SCALE = 0.6

const playwright = await resolvePlaywright()
const chromium = playwright.chromium ?? playwright.default.chromium
const svg = await readFile(path.join(root, 'public', 'favicon.svg'), 'utf8')
const outDir = path.join(root, 'public', 'icons')
await mkdir(outDir, { recursive: true })

// channel: 'chrome' uses the system Chrome so no Playwright browser download is needed
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
for (const size of SIZES) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<!doctype html>
    <html><body style="margin:0;width:${size}px;height:${size}px;background:${BACKGROUND};display:flex;align-items:center;justify-content:center">
      <div style="width:${Math.round(size * LOGO_SCALE)}px">${svg.replace('<svg ', '<svg style="width:100%;height:auto" ')}</div>
    </body></html>`)
  await page.screenshot({ path: path.join(outDir, `icon-${size}.png`) })
  console.log(`wrote public/icons/icon-${size}.png`)
}
await browser.close()
