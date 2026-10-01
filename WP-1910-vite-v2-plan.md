# @wealthica/wealthica.js 2.0.0 — Vite migration plan (WP-1910)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2017–2021 build toolchain (Babel 6 + webpack 5.31 + mocha/chai/sinon) with Vite 8 + vitest, publish `@wealthica/wealthica.js` 2.0.0 with the same runtime API and the same CDN file names, and drop the ES5 builds.

**Architecture:** Two Vite builds. Browser IIFE bundles (`dist/addon.js`, `dist/addon.min.js`, `dist/addon-container.js`, `dist/addon-container.min.js`) keep today's globals `Addon` / `AddonContainer` (the class itself) with dependencies inlined, produced by a small Node script that calls Vite's `build()` four times. Node/bundler builds (`dist/wealthica.es.js`, `dist/wealthica.cjs.js`) export `{ Addon, AddonContainer }` with dependencies external. Tests move to vitest (unit in jsdom, integration through puppeteer against a local static server). Mirrors `vezgo-sdk-js` 2.0.0 (commit 7df02bd, PV-377).

**Tech Stack:** Node 22, yarn v1 (`npx -y yarn@1.22.22` on machines without yarn), Vite ^8, vitest ^4, jsdom ^27, puppeteer ^25, serve ^14, ESLint 8 + airbnb-base 15, acorn (comes with vite) for the ES-level check.

**Spec:** The design was agreed in Slack (DM with Oleg, 2026-09-24, thread https://wealthica.slack.com/archives/D047870M90U/p1790268029814139) and is restated in "Decisions" below. ClickUp: [WP-1910](https://app.clickup.com/t/z9088298h6).

## Decisions (from the discussion)

- **Major version 2.0.0.** Breaking: `*.es5.*` files, `lib/` and the root `index.js` are removed. `dist/` stops being committed to git (published from a clean build only).
- **Browser target = Vite 8 default** (`baseline-widely-available`: Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+). Oleg explicitly declined ES2015 support. The Wealthica app itself (Vite 6, no target) already requires Chrome 87+/Safari 14+, Connect widgets (Vite 7) require Chrome 107+/Safari 16+.
- **CDN file names unchanged**: `dist/addon.js`, `dist/addon.min.js`, `dist/addon-container.js`, `dist/addon-container.min.js` (+ `.map` for the minified ones). Partners load `https://unpkg.com/@wealthica/wealthica.js@1.0.5/dist/addon.min.js` — pinned, unaffected until they bump.
- **Runtime dependencies stay** (`@wealthica/js-channel 1.0.5`, `eventemitter3 3.0.0`, `es6-promise ~4.2.8`, `iframe-resizer 3.5.15`) except `lodash ~4.17.13 → ~4.18.1` (advisory fix). No behaviour change in `src/` beyond the export style and lodash import style.
- **Consumers** (all found in C:/1_vue on 2026-09-24): 24× `import { Addon } from "@wealthica/wealthica.js"` in our Vue addons, 4× `import { AddonContainer }` in wealthica-app-v2 — all resolve through `main`. One deep import `@wealthica/wealthica.js/lib/addon.es5` / `lib/addon-container.es5` in `wealthica-dev-addon/common/store/modules/{addon,container}.js` — needs a follow-up PR there. Nobody imports `*.es5.*` from `dist`, nobody uses ESM today.
- **Fallback branch:** `WP-1910-toolchain` (commit 9623d4d, not pushed) has webpack 5.111 + Babel 7 with identical output shape. Not part of this PR; use it only if 2.0.0 has to wait.

## Global Constraints

- `engines.node >= 22`; CI runs Node 22.
- Runtime API of `Addon` and `AddonContainer` must be identical to 1.0.11 (Task 5 pins it with a snapshot test; the lists below are the baseline measured from the committed `dist/` on master).
- `dist/addon.min.js` must stay in the same size class as 1.0.11 (55 004 bytes) — a jump to ~120 KB means lodash was bundled whole (see Task 2).
- No `??`/`?.`-free requirement any more (target is Vite default), but every browser bundle must parse with acorn `ecmaVersion: 2022` and must not reference `require`/`module` at runtime (Task 5 checks).
- ESLint: airbnb-base, `eslint .` must pass; `dist/` ignored.
- Commit messages: `WP-1910: <what>`; PR title `[WP-1910] wealthica.js 2.0.0: Vite build, ES5 builds dropped`.
- Never `npm publish` from this plan — Oleg releases (`npm version major` + `npm publish`).

## Review Focus

1. A page that includes `dist/addon.min.js` via `<script>` and then calls `new Addon({...})` in an inline script — `window.Addon` must be the class (not `{ default: class }`); Task 5's snapshot test loads the real bundle in jsdom and asserts `typeof window.Addon === 'function'`.
2. A Vue CLI 4 / webpack 4 addon doing `import { Addon } from '@wealthica/wealthica.js'` — must resolve `dist/wealthica.cjs.js` through `main` and get a named export; Task 4 tests `require()` of the CJS build in jsdom.
3. A Vite consumer resolving through `exports.import` — `dist/wealthica.es.js` must keep `import 'iframe-resizer'` as a side-effect import so `iFrameResizer` is installed; Task 4 asserts the ES build contains `import "iframe-resizer"` (or `from "iframe-resizer"`) and that `window.iFrameResizer` is set after import.
4. An addon page on Safari 16.4 / Chrome 111 — target is the Vite default; anything newer than that must not be emitted. Task 5 parses every browser bundle with acorn `ecmaVersion: 2022`.
5. A consumer bundling the CJS build for the browser must not get `lodash` whole (size) or two copies of `eventemitter3` — Task 4 asserts externals appear as `require("eventemitter3")`, `require("lodash/isString")` etc. in the CJS file.

---

### Task 1: New toolchain scaffold (package.json, Vite configs, cleanup)

**Files:**
- Modify: `package.json` (rewrite; content below)
- Create: `vite.config.node.mjs`
- Create: `scripts/build-browser.mjs`
- Create: `vitest.config.mjs`
- Modify: `.gitignore` (add `dist`)
- Delete: `webpack.config.babel.js`, `.babelrc`, `index.js`, `lib/**`, `dist/**` (git rm — they are generated now or gone)
- Modify: `.eslintrc.js` (ignore build output, allow the CJS/ESM mix rule off is no longer needed once src is ESM — leave rules empty)

**Interfaces:**
- Produces: `yarn build` → `dist/{addon.js,addon.min.js,addon.min.js.map,addon-container.js,addon-container.min.js,addon-container.min.js.map,wealthica.es.js,wealthica.cjs.js}`; `yarn test:unit`, `yarn test:integration`, `yarn lint`.

- [ ] **Step 1: Rewrite `package.json`**

```json
{
  "name": "@wealthica/wealthica.js",
  "version": "1.0.11",
  "description": "Official Wealthica Add-on Library",
  "author": "Wealthica Financial Technology Inc. <hello@wealthica.com> (https://wealthica.com/)",
  "license": "MIT",
  "type": "module",
  "main": "dist/wealthica.cjs.js",
  "module": "dist/wealthica.es.js",
  "exports": {
    ".": {
      "import": "./dist/wealthica.es.js",
      "require": "./dist/wealthica.cjs.js"
    },
    "./dist/*": "./dist/*",
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "sideEffects": true,
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "yarn build:node && yarn build:browser",
    "build:node": "vite build --config vite.config.node.mjs",
    "build:browser": "node scripts/build-browser.mjs",
    "prepublishOnly": "yarn build",
    "test": "yarn test:unit && yarn test:build && yarn test:integration",
    "test:unit": "vitest run --config vitest.config.mjs",
    "test:build": "vitest run --config vitest.build.config.mjs",
    "test:integration": "vitest run --config vitest.integration.config.mjs",
    "watch:test": "vitest --config vitest.config.mjs",
    "lint": "eslint .",
    "lint-fix": "eslint --fix ."
  },
  "dependencies": {
    "@wealthica/js-channel": "1.0.5",
    "es6-promise": "~4.2.8",
    "eventemitter3": "3.0.0",
    "iframe-resizer": "3.5.15",
    "lodash": "~4.18.1"
  },
  "devDependencies": {
    "eslint": "^8.57.1",
    "eslint-config-airbnb-base": "^15.0.0",
    "eslint-plugin-import": "^2.32.0",
    "jsdom": "^27.4.0",
    "puppeteer": "^25.12.0",
    "rimraf": "^6.1.3",
    "serve": "^14.2.6",
    "sinon": "^22.1.0",
    "vite": "^8.3.1",
    "vitest": "^4.1.11"
  }
}
```

Notes: `"type": "module"` makes `*.mjs`-style configs unnecessary but the `.mjs` names are kept for clarity; `.eslintrc.js` then has to be renamed to `.eslintrc.cjs` (ESLint 8 loads it with `require`). `sinon` stays only because the integration HTML pages load `node_modules/sinon/pkg/sinon.js` in the browser. `sideEffects: true` because `src/addon.js` assigns `window.iFrameResizer` at import time.

- [ ] **Step 2: Rename ESLint config and ignore build output**

```bash
git mv .eslintrc.js .eslintrc.cjs
```

`.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  extends: ['airbnb-base'],
  ignorePatterns: ['dist/', 'node_modules/'],
  overrides: [
    {
      files: ['scripts/**', 'vite.config.*.mjs', 'vitest*.config.mjs', 'tests/**'],
      rules: {
        // Build scripts and tests import devDependencies on purpose
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
```

- [ ] **Step 3: Node/bundler build config**

`vite.config.node.mjs`:

```js
import { defineConfig } from 'vite';

// ES + CJS builds for bundlers and Node. Runtime dependencies stay external: they are
// declared in package.json `dependencies`, so the consumer installs them once and a Vue CLI /
// Vite consumer never ends up with two copies of eventemitter3 or a whole lodash.
export default defineConfig({
  build: {
    emptyOutDir: false,
    target: 'es2020',
    minify: false,
    lib: {
      entry: './src/index.js',
      name: 'Wealthica',
      fileName: 'wealthica',
    },
    rollupOptions: {
      external: [
        '@wealthica/js-channel',
        'eventemitter3',
        'es6-promise',
        'iframe-resizer',
        /^lodash(\/.*)?$/,
      ],
      output: [
        { format: 'es', dir: 'dist', entryFileNames: 'wealthica.es.js' },
        { format: 'cjs', dir: 'dist', entryFileNames: 'wealthica.cjs.js', exports: 'named' },
      ],
    },
  },
});
```

`target: 'es2020'` for the node/bundler build: consumers transpile further themselves (Vue CLI 4 / webpack 4 cannot parse `??`/`?.` without babel, which they all have).

- [ ] **Step 4: Browser build script**

`scripts/build-browser.mjs`:

```js
import { build } from 'vite';

// Four IIFE bundles for <script> consumers. Same file names as 1.x, same globals
// (`Addon` / `AddonContainer` are the classes themselves, `exports: 'default'`).
// Dependencies are inlined. Target is Vite's default (baseline-widely-available).
const bundles = [
  { entry: './src/addon.js', name: 'Addon', file: 'addon.js', minify: false },
  { entry: './src/addon.js', name: 'Addon', file: 'addon.min.js', minify: true },
  { entry: './src/addon-container.js', name: 'AddonContainer', file: 'addon-container.js', minify: false },
  { entry: './src/addon-container.js', name: 'AddonContainer', file: 'addon-container.min.js', minify: true },
];

for (const { entry, name, file, minify } of bundles) {
  // eslint-disable-next-line no-await-in-loop
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      emptyOutDir: false,
      minify,
      sourcemap: minify,
      lib: { entry, name, formats: ['iife'], fileName: () => file },
      rollupOptions: { output: { exports: 'default', dir: 'dist' } },
    },
  });
  console.log(`built dist/${file}`);
}
```

- [ ] **Step 5: vitest configs**

`vitest.config.mjs` (unit):

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.spec.js'],
  },
});
```

`vitest.build.config.mjs` (checks on the built `dist/`, Task 5):

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/build/**/*.spec.js'],
  },
});
```

`vitest.integration.config.mjs` (puppeteer, Task 6):

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.spec.js'],
    globalSetup: ['./tests/integration/global-setup.js'],
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
```

- [ ] **Step 6: Remove the old toolchain and generated files from git**

```bash
git rm -q webpack.config.babel.js .babelrc index.js
git rm -rq lib dist
printf '\ndist\n' >> .gitignore
```

- [ ] **Step 7: Install and check nothing else references the removed files**

```bash
rm -rf node_modules yarn.lock
npx -y yarn@1.22.22 install
grep -rn "lib/\|index.js\|babel" README.md package.json | grep -v node_modules
```

Expected: `yarn.lock` regenerated with no `babel-*`, `webpack*`, `mocha`, `chai` entries (`grep -c '^babel\|^webpack\|^mocha\|^chai' yarn.lock` → 0). README hits are fixed in Task 7.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "WP-1910: replace the Babel 6 / webpack toolchain with Vite 8 + vitest (scaffold)"
```

The build does not work yet (src still uses `module.exports`); Task 2 fixes that.

---

### Task 2: `src/` — ESM exports, per-function lodash, index entry

**Files:**
- Modify: `src/addon.js:6` (lodash import), `src/addon.js:381` (export)
- Modify: `src/addon-container.js:5-6` (lodash import), `src/addon-container.js:165` (export)
- Modify: `src/api.js:113` (export)
- Create: `src/index.js`

**Interfaces:**
- Produces: `export default Addon` (src/addon.js), `export default AddonContainer` (src/addon-container.js), `export default API` (src/api.js), `export { Addon, AddonContainer }` (src/index.js). Class bodies untouched.

- [ ] **Step 1: Replace the lodash namespace import**

`src/addon.js` line 6 `import * as _ from 'lodash';` becomes:

```js
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
```

and every `_.isPlainObject(` → `isPlainObject(`, `_.isString(` → `isString(`, `_.isUndefined(` → `isUndefined(` in that file (24 call sites, lines 50–344). Check with `grep -n '_\.' src/addon.js` → no output.

`src/addon-container.js`: `import * as _ from 'lodash';` becomes `import isObject from 'lodash/isObject';` and line 112 `_.isObject(data)` → `isObject(data)`.

Why: rolldown cannot tree-shake CommonJS lodash; `import * as _ from 'lodash'` would inline the whole library (~70 KB min) into each browser bundle. `lodash/isString` files are what `babel-plugin-lodash` produced before, so the bundle content is the same as 1.x.

- [ ] **Step 2: Replace `module.exports` with ESM default exports**

- `src/addon.js` line 381: `module.exports = Addon;` → `export default Addon;`
- `src/addon-container.js` line 165: `module.exports = AddonContainer;` → `export default AddonContainer;`
- `src/api.js` line 113: `module.exports = API;` → `export default API;`

`src/addon.js` line 7 `import API from './api';` already expects a default export — unchanged.

- [ ] **Step 3: Create the index entry**

`src/index.js`:

```js
import Addon from './addon';
import AddonContainer from './addon-container';

export { Addon, AddonContainer };
```

- [ ] **Step 4: Build and inspect**

```bash
npx -y yarn@1.22.22 build
ls -la dist
node -e "const fs=require('fs');for(const f of ['addon.min.js','addon-container.min.js'])console.log(f,fs.statSync('dist/'+f).size,'bytes')"
grep -c 'isPlainObject' dist/addon.js
grep -o 'require("[^"]*")' dist/wealthica.cjs.js | sort -u
```

Expected: 8 files in `dist/`; `addon.min.js` roughly 45–60 KB (1.0.11: 55 004 bytes) — if it is > 100 KB, lodash was bundled whole, go back to Step 1; CJS requires: `@wealthica/js-channel`, `es6-promise`, `eventemitter3`, `iframe-resizer`, `lodash/isObject`, `lodash/isPlainObject`, `lodash/isString`, `lodash/isUndefined`.

- [ ] **Step 5: Lint**

```bash
npx -y yarn@1.22.22 lint
```

Expected: clean. If airbnb flags `import/extensions` on `./addon` imports, add `'import/extensions': ['error', 'ignorePackages', { js: 'never' }]` to `.eslintrc.cjs` rules rather than adding extensions to the imports.

- [ ] **Step 6: Commit**

```bash
git add src .eslintrc.cjs
git commit -m "WP-1910: ESM exports and per-function lodash imports in src, index entry"
```

---

### Task 3: Unit tests on vitest

**Files:**
- Modify: `tests/unit/addon.spec.js`, `tests/unit/addon-container.spec.js`, `tests/unit/api.spec.js`

**Interfaces:**
- Consumes: `src/addon.js` default export, `src/addon-container.js` default export.

Mapping from mocha/chai/sinon to vitest (apply mechanically; the assertions' meaning must not change):

| before | after |
|---|---|
| `import chai from 'chai'; import chaiAsPromised from 'chai-as-promised'; chai.use(chaiAsPromised); const { expect } = chai;` | `import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';` |
| `import { expect } from 'chai';` | same vitest import |
| `import sinon from 'sinon';` | remove |
| `before(` / `after(` | `beforeAll(` / `afterAll(` |
| `sinon.spy(obj, 'method')` | `vi.spyOn(obj, 'method')` (keeps calling through, like sinon.spy) |
| `sinon.stub(obj, 'method')` | `vi.spyOn(obj, 'method').mockImplementation(() => {})` |
| `.callsFake(fn)` | `.mockImplementation(fn)` |
| `obj.method.restore()` / `.reset()` | `vi.restoreAllMocks()` in `afterEach`/`afterAll` (or `obj.method.mockRestore()`) |
| `obj.method.calledOnce` → `expect(x).to.be.true` | `expect(obj.method).toHaveBeenCalledTimes(1)` |
| `obj.method.firstCall.args` / `obj.method.args[0]` | `obj.method.mock.calls[0]` |
| `obj.method.args` | `obj.method.mock.calls` |
| `expect(p).to.eventually.be.rejectedWith(msg)` | `await expect(p).rejects.toThrow(msg)` (the `it` must be `async`) |
| `expect(p).to.eventually.equal(v)` / `.to.become(v)` | `await expect(p).resolves.toEqual(v)` |
| `expect(x).to.equal(y)` / `.to.eql(y)` / `.to.deep.equal(y)` | `expect(x).toBe(y)` / `toEqual(y)` |
| `expect(x).to.be.true` / `.false` / `.undefined` | `toBe(true)` / `toBe(false)` / `toBeUndefined()` |
| `expect(fn).to.throw(msg)` | `expect(fn).toThrow(msg)` |
| `expect(x).to.be.an('object')` | `expect(typeof x).toBe('object')` |

The tests already create their own `new JSDOM().window` for the addon's `window` option and patch `window.JSON` in `before` — keep that; the vitest environment is jsdom, so `window`/`document` globals exist (the `/* global window */` comments stay valid).

- [ ] **Step 1: Convert `tests/unit/api.spec.js`** (smallest, 170 lines) following the table. Example for a typical spec:

```js
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import Addon from '../../src/addon';

describe('API', () => {
  let addon;

  beforeAll(() => {
    // JsChannel requires JSON implementation while JSDOM does not provide one.
    window.JSON = {
      stringify: () => {},
      parse: () => {},
    };

    addon = new Addon({ window: new JSDOM().window });
    vi.spyOn(addon.channel, 'call');
  });

  afterAll(() => {
    vi.restoreAllMocks();
    addon.destroy();
  });

  it('should GET assets', () => {
    addon.api.getAssets({ page: 1 });
    expect(addon.channel.call).toHaveBeenCalledTimes(1);
    expect(addon.channel.call.mock.calls[0][0].params).toEqual({
      method: 'GET',
      endpoint: 'assets',
      query: { page: 1 },
    });
  });
});
```

(Keep the file's real test names and expectations; the block above only shows the shape.)

- [ ] **Step 2: Run it**

```bash
npx -y yarn@1.22.22 test:unit -- tests/unit/api.spec.js
```

Expected: all `API` tests pass (the file has ~30 cases on `addon.channel.call` arguments).

- [ ] **Step 3: Convert `tests/unit/addon.spec.js`** — `expect(addon.request(params)).to.eventually.be.rejectedWith(errorMessage)` lines (60, 72, 74, 86, 108, 168, 199) become `await expect(addon.request(params)).rejects.toThrow(errorMessage)` inside `async` tests; `sinon.spy(addon.channel, 'call')` / `'destroy'` become `vi.spyOn`.

- [ ] **Step 4: Convert `tests/unit/addon-container.spec.js`** the same way.

- [ ] **Step 5: Run the whole unit suite**

```bash
npx -y yarn@1.22.22 test:unit
```

Expected: 66 tests pass (same count as 1.0.11 under mocha). The jsdom `postMessage` "Invalid target origin 'null'" noise from 1.x is expected to disappear because the tests no longer load the whole page; if it stays, it is a warning, not a failure.

- [ ] **Step 6: Commit**

```bash
git add tests/unit
git commit -m "WP-1910: unit tests on vitest"
```

---

### Task 4: Build checks — Node/bundler outputs

**Files:**
- Create: `tests/build/node-builds.spec.js`

**Interfaces:**
- Consumes: `dist/wealthica.cjs.js`, `dist/wealthica.es.js` (run `yarn build` first; `test:build` assumes it).

- [ ] **Step 1: Write the test**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const cjs = readFileSync('dist/wealthica.cjs.js', 'utf8');
const es = readFileSync('dist/wealthica.es.js', 'utf8');

const EXTERNALS = [
  '@wealthica/js-channel',
  'es6-promise',
  'eventemitter3',
  'iframe-resizer',
  'lodash/isObject',
  'lodash/isPlainObject',
  'lodash/isString',
  'lodash/isUndefined',
];

describe('dist/wealthica.cjs.js', () => {
  it('keeps runtime dependencies external', () => {
    const required = [...cjs.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]).sort();
    expect(required).toEqual(EXTERNALS);
    expect(cjs).not.toMatch(/lodash\.js v4/); // whole lodash would carry its banner
  });

  it('exports both classes as named exports and installs iFrameResizer', () => {
    // The bundle touches window at import time (iframe-resizer), so give it a DOM
    const { window } = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/' });
    Object.assign(globalThis, { window, document: window.document, location: window.location, navigator: window.navigator });
    const lib = require('../../dist/wealthica.cjs.js');
    expect(typeof lib.Addon).toBe('function');
    expect(typeof lib.AddonContainer).toBe('function');
    expect(lib.default).toBeUndefined();
    expect(typeof window.iFrameResizer.heightCalculationMethod).toBe('function');
  });
});

describe('dist/wealthica.es.js', () => {
  it('keeps runtime dependencies external, including the side-effect import', () => {
    const imported = [...es.matchAll(/from "([^"]+)"|import "([^"]+)"/g)].map((m) => m[1] || m[2]).sort();
    expect(imported).toEqual(EXTERNALS);
    expect(es).toMatch(/import "iframe-resizer"/);
    expect(es).toMatch(/export \{[^}]*\bAddon\b[^}]*\bAddonContainer\b[^}]*\}/);
  });
});
```

- [ ] **Step 2: Build and run**

```bash
npx -y yarn@1.22.22 build && npx -y yarn@1.22.22 test:build
```

Expected: 3 tests pass. If `lib.default` is defined, set `exports: 'named'` on the CJS output (it is in Task 1's config) — Vite may warn "Mixing named and default exports"; there is no default export in `src/index.js`, so the warning means the entry was wrong.

- [ ] **Step 3: Commit**

```bash
git add tests/build/node-builds.spec.js vitest.build.config.mjs
git commit -m "WP-1910: build checks for the ES/CJS outputs"
```

---

### Task 5: Build checks — browser bundles (API snapshot, target, size)

**Files:**
- Create: `tests/build/browser-bundles.spec.js`

**Interfaces:**
- Consumes: `dist/addon.js`, `dist/addon.min.js`, `dist/addon-container.js`, `dist/addon-container.min.js`.

The method lists below are the 1.0.11 baseline, measured by loading the committed `dist/addon.js` / `dist/addon-container.js` from `master` in jsdom on 2026-09-24. They are the contract.

- [ ] **Step 1: Write the test**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import * as acorn from 'acorn';

const OWN = (o) => {
  const s = new Set();
  let p = o;
  while (p && p !== Object.prototype && p !== Function.prototype) {
    Object.getOwnPropertyNames(p).forEach((k) => s.add(k));
    p = Object.getPrototypeOf(p);
  }
  return [...s].filter((k) => !k.startsWith('__') && !['constructor', 'length', 'name', 'prototype', 'arguments', 'caller',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf', 'apply', 'bind', 'call'].includes(k)).sort();
};

// Contract from 1.0.11 (EventEmitter3 members included)
const EMITTER = ['addListener', 'emit', 'eventNames', 'listenerCount', 'listeners', 'off', 'on', 'once', 'removeAllListeners', 'removeListener'];
const ADDON_PROTO = [...EMITTER, 'addGroupPopup', 'addInstitution', 'addInvestment', 'addManualAccount', 'addManualInstitution',
  'addTransaction', 'deleteAsset', 'deleteInstitution', 'deleteLiability', 'destroy', 'downloadDocument', 'downloadFile', 'editAsset',
  'editInstitution', 'editLiability', 'editTransaction', 'getSharings', 'printPage', 'request', 'saveData', 'setEffectiveUser',
  'setLoadingStatus', 'switchUser', 'toastError', 'toastSuccess', 'toastWarning', 'upgradePremium'].sort();
const CONTAINER_PROTO = [...EMITTER, 'createTxCallback', 'destroy', 'reload', 'trigger', 'update'].sort();
const STATIC = ['EventEmitter', 'prefixed'];

const load = (file) => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://example.test/' });
  dom.window.eval(readFileSync(file, 'utf8'));
  return dom.window;
};

describe.each([
  ['dist/addon.js', 'Addon', ADDON_PROTO],
  ['dist/addon.min.js', 'Addon', ADDON_PROTO],
  ['dist/addon-container.js', 'AddonContainer', CONTAINER_PROTO],
  ['dist/addon-container.min.js', 'AddonContainer', CONTAINER_PROTO],
])('%s', (file, global, proto) => {
  it(`defines window.${global} as the class with the 1.0.11 API`, () => {
    const window = load(file);
    const Klass = window[global];
    expect(typeof Klass).toBe('function');
    expect(OWN(Klass)).toEqual(STATIC);
    expect(OWN(Klass.prototype)).toEqual(proto);
  });

  it('is a plain browser script (no CommonJS leftovers) within the target', () => {
    const src = readFileSync(file, 'utf8');
    expect(() => acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' })).not.toThrow();
    expect(src).not.toMatch(/\brequire\("/);
    expect(src).not.toMatch(/\bmodule\.exports\b/);
  });
});

it('minified bundles stay in the 1.0.11 size class (lodash not inlined whole)', () => {
  expect(statSync('dist/addon.min.js').size).toBeLessThan(80_000); // 1.0.11: 55 004
  expect(statSync('dist/addon-container.min.js').size).toBeLessThan(70_000); // 1.0.11: 46 398
});

it('Addon installs the iframe-resizer height calculation on load', () => {
  const window = load('dist/addon.js');
  expect(typeof window.iFrameResizer.heightCalculationMethod).toBe('function');
});
```

`acorn` is a transitive dependency of vite; if `import * as acorn from 'acorn'` fails to resolve, add `"acorn": "^8.18.0"` to devDependencies.

- [ ] **Step 2: Run**

```bash
npx -y yarn@1.22.22 build && npx -y yarn@1.22.22 test:build
```

Expected: all pass. Typical failure and its fix: `window.Addon` is an object `{ default: fn }` → the IIFE output needs `exports: 'default'` (Task 1 Step 4 has it) and `src/addon.js` must have exactly one export (`export default Addon`).

- [ ] **Step 3: Commit**

```bash
git add tests/build/browser-bundles.spec.js
git commit -m "WP-1910: browser bundle checks — API snapshot from 1.0.11, target, size"
```

---

### Task 6: Integration tests (puppeteer) on vitest

**Files:**
- Create: `tests/integration/global-setup.js`
- Modify: `tests/integration/addon.spec.js`, `tests/integration/addon-container.spec.js`
- Delete: `tests/integration/bootstrap.js`
- Keep as is: `tests/integration/addon.html`, `tests/integration/addon-container.html` (they load `../../dist/addon.min.js`, `../../dist/addon-container.min.js` and `../../node_modules/sinon/pkg/sinon.js` — unchanged names)

**Interfaces:**
- Consumes: built `dist/` (run `yarn build` first), a static server on `http://localhost:9898` serving the repo root.

- [ ] **Step 1: Global setup that serves the repo**

`tests/integration/global-setup.js`:

```js
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// `serve` is spawned through node with its JS entry, not through node_modules/.bin:
// the .bin shim is a shell script on Windows and cannot be fork()ed there.
export default async function setup() {
  const serveMain = require.resolve('serve/build/main.js');
  const server = spawn(process.execPath, [serveMain, '.', '-p', '9898', '-n'], { stdio: 'ignore' });

  const deadline = Date.now() + 15000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch('http://localhost:9898/tests/integration/addon-container.html');
      if (res.ok || res.status === 301) break;
    } catch (e) { /* not up yet */ }
    if (Date.now() > deadline) throw new Error('static server did not start on :9898');
    await new Promise((r) => { setTimeout(r, 250); });
  }

  return () => { server.kill('SIGTERM'); };
}
```

- [ ] **Step 2: Convert the specs**

Each spec gets its own browser (vitest runs files in isolated workers; `fileParallelism: false` in the config keeps one Chrome at a time):

```js
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import puppeteer from 'puppeteer';

const url = 'http://localhost:9898/tests/integration/addon-container.html';
let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
});

afterAll(async () => {
  await browser.close();
});

beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(url);
  // the addon iframe must have booted before the tests poke at window.container / addon
  await page.waitForFunction(() => window.container !== undefined);
});

afterEach(async () => {
  await page.close();
});
```

then keep the existing `it(...)` bodies (`page.evaluate`, `page.frames()`, `expect(...)`), converting chai asserts with the Task 3 table. The old `bootstrap.js` globals (`global.browser`, `global.expect`, `global.url`, `slowMo: 100`) are gone; if a test relied on `slowMo`, replace it with an explicit `page.waitForFunction` on the condition it waited for.

- [ ] **Step 3: Run**

```bash
npx -y yarn@1.22.22 build && npx -y yarn@1.22.22 test:integration
```

Expected: 45 tests pass (count from 1.0.11 on mocha). First run downloads Chrome for Testing (~150 MB) into `~/.cache/puppeteer`.

- [ ] **Step 4: Commit**

```bash
git add tests/integration
git commit -m "WP-1910: integration tests on vitest + puppeteer, static server in global setup"
```

---

### Task 7: CI, README, CHANGELOG

**Files:**
- Create: `.github/workflows/test.yml`
- Modify: `README.md` (Install/Build/Test/Release sections at lines ~505–535; the `<script src="/path/to/dist/addon.min.js">` example at line 42 stays)
- Modify: `CHANGELOG.md` (new top entry)
- Modify: `docker-compose.yml` (image)

- [ ] **Step 1: Workflow**

`.github/workflows/test.yml`:

```yaml
name: Tests and quality checks
on:
  push:
    branches: [master]
  pull_request:
jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: yarn
      - run: yarn install --frozen-lockfile
      - run: yarn lint
      - run: yarn test:unit
      - run: yarn build
      - run: yarn test:build
      - run: yarn test:integration
```

- [ ] **Step 2: docker-compose** — replace `image: buildkite/puppeteer` with `image: ghcr.io/puppeteer/puppeteer:25` (Node 22 + Chrome, official) and keep the volume/working_dir lines.

- [ ] **Step 3: README** — in the "Install / Build / Test / Release" block replace the mocha lines with:

```
yarn install
yarn build          # dist/ — IIFE bundles for <script>, ES + CJS for bundlers
yarn test           # unit (vitest + jsdom), build checks, integration (puppeteer)
```

Add a "Browser support" paragraph after the `<script>` example: "The browser bundles target Vite's `baseline-widely-available`: Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+. Version 1.x additionally shipped `*.es5.*` builds; they were removed in 2.0.0." Release section: `npm version major` (for 2.0.0) then `npm publish` — `prepublishOnly` builds from a clean tree; `dist/` is no longer committed.

- [ ] **Step 4: CHANGELOG** — new top entry:

```markdown
## [2.0.0]
- Build moved from webpack 5.31 / Babel 6 to Vite 8; tests from mocha/chai/sinon to vitest.
- **Breaking:** the ES5 builds (`dist/*.es5.*`), the `lib/` directory and the root `index.js` are gone.
  `import { Addon, AddonContainer } from '@wealthica/wealthica.js'` keeps working through
  `main`/`module`/`exports` (`dist/wealthica.cjs.js` / `dist/wealthica.es.js`, dependencies external).
  Deep imports of `lib/addon.es5` must switch to the package root.
- Browser bundles keep their names and globals (`dist/addon.js`, `dist/addon.min.js`,
  `dist/addon-container.js`, `dist/addon-container.min.js`; `window.Addon`, `window.AddonContainer`)
  and now target Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+.
- `lodash` 4.17 -> 4.18 (advisory fix). The runtime API of `Addon` and `AddonContainer` is unchanged
  (pinned by `tests/build/browser-bundles.spec.js`).
- `dist/` is no longer committed; releases are built by `prepublishOnly`. Requires Node >= 22 to build.
```

- [ ] **Step 5: Full local run, then commit**

```bash
npx -y yarn@1.22.22 lint && npx -y yarn@1.22.22 test
git add .github README.md CHANGELOG.md docker-compose.yml
git commit -m "WP-1910: CI workflow, README and CHANGELOG for 2.0.0"
```

---

### Task 8: PR, review, live check, consumer follow-ups

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin WP-1910-vite-v2
gh pr create --base master --title "[WP-1910] wealthica.js 2.0.0: Vite build, ES5 builds dropped" --body "<summary of Decisions + the CHANGELOG entry + how it was verified + release steps for Oleg (npm version major, npm publish)>"
```

- [ ] **Step 2: Code review** with `superpowers:requesting-code-review` (reviewer on the most capable model; ask it to compare the API snapshot against `git show master:dist/addon.js` loaded in jsdom, and to check `exports`/`main` resolution with a Vue CLI 4 consumer and a Vite consumer).

- [ ] **Step 3: Live check with Andrius (browser, two sides)**
  - Addon side: in `wealthica-dev-addon`, point `@wealthica/wealthica.js` at the local build (`yarn link` or `"@wealthica/wealthica.js": "file:../wealthica.js"` after `yarn build`), fix its two deep imports (`lib/addon.es5` → package root), run its dev server (port 8100), open the Developer add-on in the local wealthica-app-v2 stack and exercise: init, `api.getTransactions`/`getPositions`, `saveData`/`getData`, `addTransaction`/`editTransaction`, `downloadDocument`, `toastSuccess`, `addGroupPopup`.
  - Container side: point `wealthica-app-v2`'s dependency at the local build and open any addon (callbacks, `reload`, `update`, `destroy` on navigation).
- [ ] **Step 4: Consumer follow-ups (separate PRs, after 2.0.0 is on npm)**: `wealthica-dev-addon` (deep imports + version), `wealthica-app-v2` (1.0.11 → 2.0.0), then the other addons at their own pace. Partners on `unpkg.com/@wealthica/wealthica.js@1.0.5` are unaffected.

## Self-review notes

- Spec coverage: every "Decisions" line maps to a task (outputs → T1/T2/T4/T5, breaking removals → T1, src changes → T2, tests → T3/T6, CI + no committed dist → T1/T7, verification → T5/T8, consumers → T8).
- The Review Focus items are each pinned by a test in T4/T5 except item 2's "Vue CLI 4 resolves `main`" which is checked by the reviewer in T8 (no Vue CLI project in this repo).
- Names used across tasks: `dist/wealthica.cjs.js`, `dist/wealthica.es.js`, `Addon`, `AddonContainer`, `scripts/build-browser.mjs`, the three vitest configs — consistent between T1 and T4–T7.
