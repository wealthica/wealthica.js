# wealthica.js

This library provides the wrappers needed to setup communication between the Wealthica Dashboard and 3rd-party add-ons.

Add-ons are loaded in the Wealthica Dashboard (Container) as iframes. Take a look at `test/integration/addon.html` and `test/integration/addon-container.html` to see how to setup Add-on and Container for development.

## Installation

```
npm install @wealthica/wealthica.js --save
```

Then include this in the Add-on page:

```
<script src="/path/to/dist/addon.min.js"></script>
```

And include this in the Container page for development:

```
<script src="/path/to/dist/addon-container.min.js"></script>
```

## Usage

### Setup Add-on

```
var addon = new Addon();
```

### Setup Container

```
var container = new AddonContainer({
  // Add-on iframe
  iframe: document.getElementById('addon')
});
```

## APIs

### class: Addon

The `Addon` class is intended to be used by add-ons to setup their side of communication.

`Addon` emits events when it receives messages from Container. Also when any of `Addon`'s methods is called, a corresponding event will be emitted in the Container side.

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

Emitted when Container has finished setting up the communication on its side. At this time Add-on should use the passed-in options (filters, language, etc.) to finalize its rendering.

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

Emitted when Container tells Add-on to reload.

```
addon.on('reload', function () {
  // Start reloading
});
```

#### event: 'update'

Emitted when Add-on receives updated options from Container. In response Add-on should update itself according to received options.

```
addon.on('update', function (options) {
  // Update according to the received options
});
```

#### addon.editTransaction(options)

This method opens the Edit Transaction form in Dashboard. Container will receive an `editTransaction` event.

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

This method triggers an API request. Container will receive a `request` event.

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

This method tells Dashboard to persist the data. Container will receive a `saveData` event.

```
addon.saveData({ preferredCurrencies: ['CAD', 'USD', 'GBP', 'MXN'] }).then(function() {

}).catch(function(err) {

});
```

### class: AddonContainer

The `AddonContainer` class is used by the Wealthica Dashboard to setup its side of communication.

In order to mock the Wealthica Dashboard in development, add-on developers can use the `AddonContainer` class in a container page that hosts the add-on iframe(s).

`AddonContainer` emits events when it receives messages from Add-on. When any of `AddonContainer`'s methods is called, a corresponding event will be emitted in the Add-on side.


#### new AddonContainer([options])

```
var container = new AddonContainer({
  // (required) The Add-on iframe.
  iframe: document.getElementById('addon'),

  // (required) Same as the 'scope' defined in Add-on.
  // Defaults to 'default' (for development only).
  scope: 'addon-id/widgets/widget-id',

  // (optional) options to pass to Add-on (for filtering, language, etc.).
  // Below is a list of possible options (all optional).
  options: {
    fromDate: '2018-01-01',
    toDate: '2018-04-30',
    readonly: false,
    language: 'en',
    privateMode: false,
    query: 'param1=true,param2=something',
    dateRangeFilter: ['2018-03-01', '2018-03-30'],
    groupsFilter: 'id1,id2',
    institutionsFilter: 'id1,id2',
    investmentsFilter: 'id1,id2',
    assetsFilter: false,
    liabilitiesFilter: false,
    deletedFilter: false,

    // Add-on data. This is persisted in our database and will be available
    // every time Add-on is loaded.
    data: {
      test: 'test'
    },
    ...
  }
})
```

#### event: 'editTransaction'

Emitted when Add-on wants to open the Edit Transaction form.

```
container.on('editTransaction', function(options, callback) {
  // Open the Edit Transaction form (example function)
  openEditTransaction(options.id);

  // Example listener
  this.on('form:close', function(err, updatedTransaction) {
    if (err) return callback(err);

    if (updatedTransaction) {
      // Tell Add-on the form has been closed and the transaction has been updated
      callback(null, updatedTransaction);
    } else {
      // Tell Add-on the form has been closed without changes to the transaction
      callback();
    }
  });
});
```

#### event: 'request'

Emitted when Add-on requests an API call.

```
container.on('request', function(options, callback) {
  // Carry out the request (example function)
  callAPI({
    method: options.method,
    endpoint: options.endpoint,
    data: options.query
  }).then(function(response) {
    // Return the response to Add-on
    callback(null, response);
  }).catch(callback);
});
```

#### event: 'saveData'

Emitted when Add-on tells Container to persist some data.

```
container.on('saveData', function(data, callback) {
  // Persist the data (example function)
  persistData(data).then(function() {
    // Tell Add-on that the data has been saved successfully
    callback();
  }).catch(callback);
});
```

#### container.reload()

Add-on developers can use this method to simulate Dashboard telling Add-on to reload. Add-on will receive a `reload` event.

```
container.reload();
```

#### container.update(options)

Add-on developers can use this method to simulate Dashboard sending updated options (filtering etc.) to Add-on. Add-on will receive the updated options in the `update` event.

```
container.update({
  fromDate: '2018-01-01',
  toDate: '2018-04-30',
  language: 'en',
  privateMode: false,
  data: { some: 'new data' }
});
```

## Debug

```
addon.on('postMessage', function (origin, message) {
  // This is triggered every time Add-on posts a message to Container
}).on('gotMessage', function(origin, message) {
  // This is triggered every time Add-on receives a message from Container
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
