# wealthica.js

[![Build Status](https://travis-ci.org/wealthica/wealthica.js.svg?branch=master)](https://travis-ci.org/wealthica/wealthica.js)

This library provides the wrappers needed to setup communication between the Wealthica Dashboard and 3rd-party add-ons. Add-ons are loaded in the Wealthica Dashboard as iframes.

To see how easy it is to develop an add-on for Wealthica, take a look at the Sample Add-on at `examples/addon.html` and the section below.

## Getting started

1. Login to your [Wealthica](https://app.wealthica.com).
2. Go to https://app.wealthica.com/addons/wealthica/wealthica-dev-addon and install the add-on. After that you will be redirected to the Developer Add-on page.
3. Click on the cogwheel button next to the page title to open Configure modal.
4. Enter https://rawgit.com/wealthica/wealthica.js/master/examples/addon.html to the Add-on URL field and click Load to load the Sample Add-on.
5. Try some of the sample actions provided in the add-on.

After trying out the Sample Add-on, it's time to make your own add-on:

1. Clone Sample Add-on or create your own add-on page and host it somewhere else (e.g. https://myownaddon.com/path/to/addon).
2. Open Configure modal and load https://myownaddon.com/path/to/addon.
3. Take a look at the __APIs__ section below and start writing your add-on.

## Installation

```
npm install @wealthica/wealthica.js --save
```

Then include this in the Add-on page:

```
<script src="/path/to/dist/addon.min.js"></script>
```

## APIs

### class: Addon

The `Addon` class is intended to be used by add-ons to setup their side of communication.

`Addon` emits events when it receives messages from Wealthica Dashboard. Also when any of `Addon`'s methods is called, a corresponding event will be emitted in the Wealthica Dashboard side.

#### new Addon([options])

```
var addon = new Addon({
  // (required) The 'scope' of the messages.
  // Scope needs to follow the following formula:
  // `ADDON_ID/[widgets/reports]/[WIDGET_ID|REPORT_ID]`.
  // Defaults to 'default' (for development only).
  scope: 'addon-id/widgets/widget-id'
});
```

#### event: 'init'

Emitted when Wealthica Dashboard has finished setting up the communication on its side. At this time Add-on should use the passed-in options (filters, language, etc.) to finalize its rendering.

```
addon.on('init', function (options) {
  console.log(options);
  // {
  //   fromDate: '2018-01-01',
  //   toDate: '2018-04-30',
  //   language: 'en',
  //   privateMode: false,
  //   data: { preferredCurrencies: ['USD', 'CAD', 'GBP'] },
  //   ...
  // }
});
```

#### event: 'reload'

Emitted when Wealthica Dashboard tells Add-on to reload.

```
addon.on('reload', function () {
  // Start reloading
});
```

#### event: 'update'

Emitted when Add-on receives updated options from Wealthica Dashboard. In response Add-on should update itself according to received options.

```
addon.on('update', function (options) {
  // Update according to the received options
});
```

#### addon.editTransaction(options)

This method opens the Edit Transaction form in Dashboard. Wealthica Dashboard will receive an `editTransaction` event.

When user closes the form, the `success` event will be triggered and a `updatedTransaction` parameter is provided if the transaction has been updated.

```
addon.editTransaction({ id: 'TRANSACTION_ID' }).then(function(updatedTransaction) {
  // The form has been closed

  if (updatedTransaction) {
    // The transaction has been updated
  } else {
    // Nothing changed
  }
}).catch(function(err) {

});
```

#### addon.request(options)

This method triggers an API request. Wealthica Dashboard will receive a `request` event.

Currently only `GET` API requests are supported.

```
addon.request({
  method: 'GET',
  endpoint: 'positions',
  query: {
    institutions: 'id1,id2',
    assets: true,
  }
}).then(function(response) {

}).catch(function(err) {

});
```

#### addon.saveData(data)

This method tells Dashboard to persist the data. Wealthica Dashboard will receive a `saveData` event.

```
addon.saveData({ preferredCurrencies: ['CAD', 'USD', 'GBP', 'MXN'] }).then(function() {

}).catch(function(err) {

});
```

## Debug

```
addon.on('postMessage', function (origin, message) {
  // This is triggered every time Add-on posts a message to Wealthica Dashboard
}).on('gotMessage', function(origin, message) {
  // This is triggered every time Add-on receives a message from Wealthica Dashboard
});
```

## Development

### Install

```
npm install
```

### Build

```
npm run build
```

### Test

```
npm run build
npm run test
```
