# Changelog

## [2.0.0]
- Build moved from webpack 5.31 / Babel 6 to Vite 8; tests from mocha/chai/sinon to vitest.
- **Breaking:** the ES5 builds (`dist/*.es5.*`), the `lib/` directory and the root `index.js` are gone.
  `import { Addon, AddonContainer } from '@wealthica/wealthica.js'` keeps working through
  `main`/`module` (`dist/wealthica.cjs.js` / `dist/wealthica.es.js`, dependencies external).
  Deep imports of `lib/addon.es5` must switch to the package root.
- Browser bundles keep their names and globals (`dist/addon.js`, `dist/addon.min.js`,
  `dist/addon-container.js`, `dist/addon-container.min.js`; `window.Addon`, `window.AddonContainer`)
  and now target Chrome/Edge 111+, Firefox 114+, Safari/iOS 16.4+.
- `lodash` 4.17 -> 4.18 (advisory fix). The runtime API of `Addon` and `AddonContainer` is unchanged
  (pinned by `tests/build/browser-bundles.spec.js`).
- `dist/` is no longer committed; releases are built by `prepublishOnly`. Requires Node >= 22 to build.

## [1.0.11]
- AddonContainer: make the per-transaction callback handed to host handlers idempotent. jschannel removes the transaction entry on the first `tx.complete()`/`tx.error()` call and throws `"complete called for nonexistent message: <id>"` / `"error called for nonexistent message: <id>"` on any subsequent call (also when the channel was destroyed mid-flight). The wrapper now ignores second invocations and swallows those specific lifecycle throws; real exceptions still propagate. Closes Sentry WP-V2-8 / 59 / 2B.

## [1.0.10]
- `toastSuccess(data)`, `toastError(data)` and `toastWarning(data)` methods to show toast notifications

## [1.0.9]
- `addGroupPopup` method to open popup

## [1.0.8]
- `addManualAccount(id)` method to open popup
- `addManualInstitution` method to open popup

## [1.0.6]
- `downloadFile({ fileName, fileType, fileContent })` method to trigger download files from web and mobile app

## [1.0.5]
- Completed support for react native

## [0.0.25]
- `upgradePremium(plan)` support passing plan param

## [0.0.24]

### Fixed
- `setLoadingStatus` allow emit empty value

## [0.0.23]

### Added
- `setLoadingStatus` method to set loading status, param string

## [0.0.22]

### Added
- `printPage` method to run `window.print()` from dashboard itself.

## [0.0.9]

### Added
- Travis CI.

### Changed
- Change editTransaction to receive id string instead of object.
- Change `scope` to `id` for Addon & AddonContainer initialization.
- Refine Sample Addon.

### Fixed
- Fix height calculation method to allow for downsizing.
