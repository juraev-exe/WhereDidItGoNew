import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function copyIfChanged(src, dest) {
  if (!existsSync(src)) return
  mkdirSync(path.dirname(dest), { recursive: true })
  copyFileSync(src, dest)
}

/**
 * Mirrors CSP-safe self-hosted Tesseract worker/core bundles and static legal
 * pages into `public/` so Vite dev, production builds, Vercel, Electron, and
 * Capacitor Android always serve them from `'self'` without external script CDNs.
 */
export function syncStaticAssets(rootDir = ROOT) {
  const tesseractOut = path.join(rootDir, 'public', 'tesseract')
  copyIfChanged(
    path.join(rootDir, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'),
    path.join(tesseractOut, 'worker.min.js'),
  )
  for (const coreFile of [
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-relaxedsimd-lstm.wasm.js',
  ]) {
    copyIfChanged(
      path.join(rootDir, 'node_modules', 'tesseract.js-core', coreFile),
      path.join(tesseractOut, coreFile),
    )
  }

  const legalOut = path.join(rootDir, 'public', 'legal')
  const docsDir = path.join(rootDir, 'docs')
  for (const file of [
    'privacy.html',
    'terms.html',
    'refund.html',
    'cookies.html',
    'data-deletion.html',
    'styles.css',
    'favicon.svg',
    'logo.png',
    'i18n.js',
    'legal-ui.js',
  ]) {
    copyIfChanged(path.join(docsDir, file), path.join(legalOut, file))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  syncStaticAssets()
}
