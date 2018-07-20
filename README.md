# wealthica.js

[![Build Status](https://travis-ci.org/wealthica/wealthica.js.svg?branch=master)](https://travis-ci.org/wealthica/wealthica.js)

Extend Wealthica by writing your own add-ons and widgets.

Wealthica is an aggregation platform that allows investors to see all the investments in a single Dashboard and get an unbiased view of their wealth. Each day, Wealthica connects to your financial institutions and retrieves accounts balances, positions and transactions. Wealthica is the largest financial aggregator in Canada with support for 45+ Canadian financial institutions and investment platforms.

This library provides the wrappers needed to setup the communication between the Wealthica Dashboard and 3rd-party add-ons. It aims to be simple to use and allows anyone with basic knowledge of JavaScript to write their own add-on.

Not sure where to start? Take a [look at the Sample Add-on code](https://github.com/wealthica/wealthica.js/blob/master/examples/addon.html) and see the instructions below to load it into your Wealthica Dashboard.

Ready to publish your add-on to the Wealthica Add-ons store? [Contact us](mailto:hello@wealthica.com).

## Getting started

1. Login to your [Wealthica](https://app.wealthica.com).
2. Install the [Developer Add-on](https://app.wealthica.com/addons/details?id=wealthica/wealthica-dev-addon). After that you will be redirected to the Developer Add-on page.
3. Click on the button next to the page title to open the Configure modal.
4. Enter https://rawgit.com/wealthica/wealthica.js/master/examples/addon.html to the Add-on URL field and click Load to load the Sample Add-on.
5. Try some of the sample actions provided in the add-on.

After trying out the Sample Add-on, it's time to make your own add-on:

1. Clone Sample Add-on or create your own add-on page.
2. From Wealthica navigate to the Developer Add-on and open the Configure modal and load your add-on.
3. Take a look at the [APIs](#apis) section below and start writing your add-on.

## Installation

```
npm install @wealthica/wealthica.js --save
```

Then include this in your add-on page:

```
<script src="/path/to/dist/addon.min.js"></script>
```

## APIs

### class: Addon

The `Addon` class is intended to be used by add-ons to setup their side of communication.

#### new Addon([options])

```
var addon = new Addon({
  // (optional) The 'scope' of the messages.
  // Scope needs to follow the following formula:
  // `ADDON_ID/[widgets/reports]/[WIDGET_ID|REPORT_ID]`.
  // Defaults to location.origin (for development only).
  scope: 'addon-id/widgets/widget-id'
});
```

#### event: 'init'

Emitted when Wealthica Dashboard has finished setting up the communication on its side. At this time add-on should use the passed-in options (filters, language, etc.) to finalize its rendering.

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

Emitted when Wealthica Dashboard needs add-on to reload.

```
addon.on('reload', function () {
  // Start reloading
});
```

#### event: 'update'

Emitted when user updates one of the Dashboard filters. The Dashboard provides common filters including groups, institutions or date range filters. In response add-on should update itself according to received options.

```
addon.on('update', function (options) {
  // Update according to the received options
});
```

#### addon.editTransaction(options)

This method opens the Edit Transaction form on the Dashboard and waits for user to update the transaction or to close the edit modal. The `updatedTransaction` parameter is provided when the transaction has been updated.

```
addon.editTransaction({ id: 'TRANSACTION_ID' }).then(function (updatedTransaction) {
  // The form has been closed

  if (updatedTransaction) {
    // The transaction has been updated
  } else {
    // Nothing changed
  }
}).catch(function (err) {

});
```

#### addon.request(options)

This is used to make a request to the Wealthica API. Currently only `GET` API requests are supported.

```
addon.request({
  method: 'GET',
  endpoint: 'positions',
  query: {
    institutions: 'id1,id2',
    assets: true,
  }
}).then(function (response) {

}).catch(function (err) {

});
```

#### addon.saveData(data)

This method allows add-on to persist data to the Wealthica user preferences. You can use this method to persist user configuration options. The add-on will receive this data under the `data` options parameter [the next time it is initialized](#event-init). Each add-on can store up to 100 KB of data (plus 4 KB per widget). Please note data is stored unencrypted in our database and may not be suitable for storing sensitive information.

```
addon.saveData({ preferredCurrencies: ['CAD', 'USD', 'GBP', 'MXN'] }).then(function () {

}).catch(function (err) {

});
```

## Debug

#### event: 'postMessage'

Emitted every time the add-on posts a message to the Wealthica Dashboard.

```
addon.on('postMessage', function (origin, message) {
  console.log(arguments);
});
```

Emitted every time the add-on receives a message from the Wealthica Dashboard.

```
addon.on('gotMessage', function (origin, message) {
  console.log(arguments);
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
