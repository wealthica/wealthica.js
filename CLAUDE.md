# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@wealthica/wealthica.js` — the official Wealthica Add-on Library. This is the iframe-communication SDK loaded **inside** Wealthica addons (widgets running in iframes on `addons.wealthica.com`). It is distinct from `wealthica-sdk-js`, which is the API client library for server-side / consumer use.

The library provides two complementary classes:
- **`Addon`** — used inside an addon iframe to communicate with the Wealthica host application (request data, open UI dialogs, trigger toasts, etc.)
- **`AddonContainer`** — used by the Wealthica host app to embed and control an addon iframe

Published as `@wealthica/wealthica.js` on npm.

## Commands

Building and testing need Node >= 22 (pinned in `.nvmrc`). The published package has no `engines` field on purpose: add-on toolchains still install it on Node 14 with yarn 1.

- **Build:** `yarn build` (Vite 8; outputs everything to `dist/`, see Build outputs)
- **Test (all):** `yarn test` (`test:unit` + `test:build` + `test:integration`; run `yarn build` first)
- **Test (unit):** `yarn test:unit` (vitest + jsdom)
- **Test (build checks):** `yarn test:build` (checks the built `dist/`: runtime API pinned to 1.0.11, ES2019 level of the ES/CJS builds, bundle sizes)
- **Test (integration):** `yarn test:integration` (vitest + puppeteer, static server in `global-setup.js`)
- **Test watch:** `yarn watch:test`
- **Lint:** `yarn lint` (ESLint)
- **Lint fix:** `yarn lint-fix`

## Architecture

**Entry point:** `src/index.js` — named exports `Addon` and `AddonContainer`.

**`src/addon.js` — `Addon` class** (extends EventEmitter)
- Used inside an addon iframe. Communicates with the host via `postMessage` (through `jschannel` or a similar cross-frame messaging layer).
- Constructor accepts an options object; sets up the message channel on init.
- Rich action API: `request()`, `saveData()`, `addTransaction()`, `editTransaction()`, `addInstitution()`, `editInstitution()`, `deleteInstitution()`, `addManualAccount()`, `addInvestment()`, `editAsset()`, `editLiability()`, `deleteAsset()`, `deleteLiability()`, `toastSuccess/Error/Warning()`, `downloadDocument()`, `downloadFile()`, `upgradePremium()`, `getSharings()`, `switchUser()`, `setLoadingStatus()`, `printPage()`, `destroy()`.

**`src/addon-container.js` — `AddonContainer` class** (extends EventEmitter)
- Used by the host app to embed an addon in an iframe. Manages the iframe lifecycle (create, `trigger()`, `update()`, `reload()`, `destroy()`).
- Integrates `iframe-resizer` for automatic iframe height adjustment.

**`src/api.js` — `API` class**
- Helper attached to `Addon` instances; wraps request calls with typed methods: `getAssets`, `getCurrencies`, `getInstitutions`, `getInstitution`, `pollInstitution`, `syncInstitution`, `addInstitution`, `getLiabilities`, `getPositions`, `getTransactions`, `updateTransaction`, `getUser`.

**Build outputs** (all in `dist/`, not committed except the 1.0.11 `dist/addon.min.js` kept for GitHub Pages):
- `wealthica.es.js` (`module`) and `wealthica.cjs.js` (`main`) — for bundlers and Node, built by `vite.config.node.mjs`. Target ES2019 so Vue CLI 4 / webpack 4 can parse them; runtime dependencies stay external.
- `addon.js`, `addon.min.js`, `addon-container.js`, `addon-container.min.js` (+ maps) — IIFE bundles for `<script>`, built by `scripts/build-browser.mjs`. Globals `window.Addon` / `window.AddonContainer` are the classes; dependencies are inlined.
- There is no `lib/`, no root `index.js` and no `*.es5.*` build since 2.0.0; consumers import from the package root.

**Tests:** `tests/unit/` (vitest + jsdom), `tests/build/` (checks on the built `dist/`) and `tests/integration/` (vitest + puppeteer).

## Code Style

- ES modules in `src/`, per-function lodash imports (`lodash/isObject`), no transpiler besides Vite
- ESLint 8 (see `.eslintrc.cjs`) — `airbnb-base` rules
- EventEmitter-based event API for cross-frame events

## Release Process

Published to npm as `@wealthica/wealthica.js` (see `name` in `package.json`).

`prepublishOnly` runs `yarn build`, so `dist/` is built on publish (Node 22):

```bash
npm version patch        # or minor / major — bumps package.json + creates git tag
git push && git push --tags
npm publish              # prepublishOnly runs yarn build
```

After a local `yarn build`, run `git checkout dist/addon.min.js` before committing, so the 1.0.11 file that GitHub Pages serves is not replaced.

Verify the new version is live on https://www.npmjs.com/package/@wealthica/wealthica.js.

There is no separate staging environment for this package — every published version is available to all addon consumers. Test changes locally with `npm link` or by pointing an addon at a local tarball (`npm pack`) before publishing.

GitHub Actions (`.github/workflows/test.yml`) runs lint, build and tests on pushes to `master` and on PRs. Publishing is manual.
