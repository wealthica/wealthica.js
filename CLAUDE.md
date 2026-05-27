# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@wealthica/wealthica.js` — the official Wealthica Add-on Library. This is the iframe-communication SDK loaded **inside** Wealthica addons (widgets running in iframes on `addons.wealthica.com`). It is distinct from `wealthica-sdk-js`, which is the API client library for server-side / consumer use.

The library provides two complementary classes:
- **`Addon`** — used inside an addon iframe to communicate with the Wealthica host application (request data, open UI dialogs, trigger toasts, etc.)
- **`AddonContainer`** — used by the Wealthica host app to embed and control an addon iframe

Published as `@wealthica/wealthica.js` on npm.

## Commands

- **Build:** `yarn build` (webpack, outputs `dist/` for browser and `lib/` for Node.js/CommonJS)
- **Test (all):** `npm test` (runs `test:unit` + `test:integration` via `npm-run-all`)
- **Test (unit only):** `npm run test:unit` (mocha + jsdom)
- **Test (integration):** `npm run test:integration` (mocha, 15 s timeout)
- **Test watch:** `npm run watch:test`
- **Lint:** `yarn lint` (ESLint)
- **Lint fix:** `yarn lint-fix`

## Architecture

**Entry point:** `index.js` — re-exports `Addon` and `AddonContainer`.

**`src/addon.js` — `Addon` class** (extends EventEmitter)
- Used inside an addon iframe. Communicates with the host via `postMessage` (through `jschannel` or a similar cross-frame messaging layer).
- Constructor accepts an options object; sets up the message channel on init.
- Rich action API: `request()`, `saveData()`, `addTransaction()`, `editTransaction()`, `addInstitution()`, `editInstitution()`, `deleteInstitution()`, `addManualAccount()`, `addInvestment()`, `editAsset()`, `editLiability()`, `deleteAsset()`, `deleteLiability()`, `toastSuccess/Error/Warning()`, `downloadDocument()`, `downloadFile()`, `upgradePremium()`, `getSharings()`, `switchUser()`, `setLoadingStatus()`, `printPage()`, `destroy()`.

**`src/addon-container.js` — `AddonContainer` class** (extends EventEmitter)
- Used by the host app to embed an addon in an iframe. Manages the iframe lifecycle (create, `trigger()`, `update()`, `reload()`, `destroy()`).
- Integrates `iframe-resizer` for automatic iframe height adjustment.

**`src/api.js` — `API` class**
- Helper attached to `Addon` instances; wraps request calls with typed methods: `getAssets`, `getCurrencies`, `getInstitutions`, `getInstitution`, `pollInstitution`, `syncInstitution`, `addInstitution`, `getLiabilities`, `getPositions`, `getTransactions`, `updateTransaction`, `getUser`.

**Build outputs** (webpack, `webpack.config.babel.js`):
- `dist/` — browser bundles (UMD / minified)
- `lib/addon.js`, `lib/addon-container.js` — CommonJS for Node.js (these are `lib/` variants)

**Tests:** `tests/unit/` (mocha + jsdom) and `tests/integration/` (mocha, network).

## Code Style

- ES6+ with Babel transpilation (`.babelrc`)
- ESLint (see `.eslintrc.js`) — `airbnb-base`-style rules
- EventEmitter-based event API for cross-frame events

## Release Process

Published to npm as `@wealthica/wealthica.js` (see `name` in `package.json`).

There is no `prepublishOnly` script — run the build manually before publishing:

```bash
yarn build               # outputs dist/ and lib/
npm version patch        # or minor / major — bumps package.json + creates git tag
git push && git push --tags
npm publish
```

Verify the new version is live on https://www.npmjs.com/package/@wealthica/wealthica.js.

There is no separate staging environment for this package — every published version is available to all addon consumers. Test changes locally with `npm link` or by pointing an addon at a local tarball (`npm pack`) before publishing.

There are no GitHub Actions workflows for automated publishing — all releases are manual.
