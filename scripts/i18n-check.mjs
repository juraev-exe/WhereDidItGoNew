import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(vue|ts)$/.test(p) && !p.includes(`i18n${path.sep}locales`)) out.push(p)
  }
  return out
}

const keys = new Map()
for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    if (!keys.has(m[1])) keys.set(m[1], file)
  }
  for (const m of src.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g)) {
    if (!keys.has(m[1] + '.*')) keys.set(m[1] + '.*', file)
  }
}

const locales = {}
for (const code of ['en', 'ru', 'tj']) {
  locales[code] = (await import(`../src/i18n/locales/${code}.ts`)).default
}

function get(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

let bad = 0
for (const [key, file] of [...keys].sort()) {
  const base = key.endsWith('.*') ? key.slice(0, -2) : key
  for (const code of ['en', 'ru', 'tj']) {
    const v = get(locales[code], base)
    if (v === undefined) {
      console.log(`MISSING ${code.padEnd(2)} ${key.padEnd(38)} ${file}`)
      bad++
    }
  }
}

// keys present in en but missing in ru/tj
function flat(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') flat(v, prefix + k + '.', out)
    else out.push(prefix + k)
  }
  return out
}
for (const code of ['ru', 'tj']) {
  for (const k of flat(locales.en)) {
    if (get(locales[code], k) === undefined) {
      console.log(`UNTRANSLATED ${code} ${k}`)
      bad++
    }
  }
}
console.log(bad ? `\n${bad} problems` : '\nAll i18n keys resolve.')
