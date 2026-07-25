# Changelog

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
