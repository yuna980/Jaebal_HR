import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/requestCache.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
}).outputText;

const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
const { createTimedMemoryCache, runWithConcurrencyLimit } = await import(moduleUrl);

const cache = createTimedMemoryCache(1000, () => 1000);
cache.set('team', { name: 'SSG' });
assert.deepEqual(cache.get('team'), { name: 'SSG' });
assert.equal(cache.has('team'), true);

const expiredCache = createTimedMemoryCache(10, () => 2000);
expiredCache.set('team', { name: 'old' }, 1000);
assert.equal(expiredCache.get('team'), null);
assert.equal(expiredCache.has('team'), false);

let active = 0;
let maxActive = 0;
const tasks = Array.from({ length: 6 }, (_, index) => async () => {
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise((resolve) => setTimeout(resolve, 10));
  active -= 1;
  return index;
});

const results = await runWithConcurrencyLimit(tasks, 2);
assert.deepEqual(results, [0, 1, 2, 3, 4, 5]);
assert.equal(maxActive, 2);

console.log('optimization helpers verified');
