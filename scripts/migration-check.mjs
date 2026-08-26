/**
 * Upgrade check: an existing 1.1.0 database (Dexie v4, debts in major units)
 * must come through the v5 migration with debt amounts in minor units.
 *
 *   node scripts/migration-check.mjs
 */
import { boot, resetDb, completeOnboarding, BASE } from './walk-lib.mjs'
const {browser,page,problems}=await boot()
await resetDb(page)
await completeOnboarding(page)

// Roll the DB back to the v4 shape with major-unit debts, exactly as an
// existing 1.1.0 install would have it.
await page.evaluate(async () => {
  const dbs = (await indexedDB.databases?.()) ?? []
  await Promise.all(dbs.filter(d=>d.name).map(d => new Promise(res => {
    const r = indexedDB.deleteDatabase(d.name); r.onsuccess=r.onerror=r.onblocked=()=>res()
  })))
})
await page.evaluate(async () => {
  await new Promise((res, rej) => {
    const req = indexedDB.open('wherediditgo', 40)
    req.onupgradeneeded = () => {
      const db = req.result
      const mk = (name, indexes) => {
        const os = db.createObjectStore(name, {keyPath: name === 'meta' ? 'key' : 'id'})
        for (const ix of indexes) os.createIndex(ix, ix)
        return os
      }
      mk('accounts', ['type','archived'])
      mk('categories', ['kind','sortOrder'])
      mk('budgets', ['categoryId','month'])
      mk('transactions', ['type','accountId','categoryId','date','createdAt'])
      mk('goals', ['createdAt'])
      mk('recurring', ['type','accountId','categoryId'])
      mk('debts', ['type','personName','status','createdAt'])
      mk('meta', [])
    }
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(['debts','meta','accounts','categories'],'readwrite')
      tx.objectStore('debts').put({id:'d1',type:'lent',personName:'Old',amount:120.5,paidAmount:40.25,status:'active',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'})
      tx.objectStore('meta').put({key:'onboardingDone',value:'true'})
      tx.objectStore('meta').put({key:'currency',value:'USD'})
      tx.objectStore('accounts').put({id:'a1',name:'Cash',type:'cash',balance:0,currency:'USD',color:'#0b6e6a',archived:false,createdAt:'2026-01-01T00:00:00Z'})
      tx.objectStore('categories').put({id:'c1',name:'Food',kind:'expense',icon:'utensils',color:'#e07a5f',sortOrder:0})
      tx.oncomplete = () => { db.close(); res() }
      tx.onerror = () => rej(tx.error)
    }
    req.onerror = () => rej(req.error)
  })
})

// Loading the app runs Dexie's upgrade path.
await page.goto(`${BASE}/debts`, {waitUntil:'domcontentloaded'})
await page.waitForTimeout(2200)
const after = await page.evaluate(async () => {
  const db = await new Promise(res => { const r = indexedDB.open('wherediditgo'); r.onsuccess=()=>res(r.result) })
  const rows = await new Promise(res => { const r = db.transaction('debts').objectStore('debts').getAll(); r.onsuccess=()=>res(r.result) })
  db.close()
  return rows
})
console.log('migrated rows:', JSON.stringify(after))
const ok = after[0]?.amount === 12050 && after[0]?.paidAmount === 4025
console.log(ok ? 'PASS: debts converted to minor units' : 'FAIL: expected 12050/4025')
const shown = await page.evaluate(() => document.querySelector('.remaining')?.textContent?.trim())
console.log('remaining shown as:', shown, shown === '$80.25' ? '(PASS)' : '(check)')
console.log(problems.length ? problems.join('\n') : 'no console errors')
await browser.close()
process.exit(ok && problems.length === 0 ? 0 : 1)
