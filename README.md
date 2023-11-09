# wealthica.js

Extend Wealthica by writing your own add-ons and widgets.

[Wealthica](https://wealthica.com) is an aggregation platform that allows investors to see all their investments in a single Dashboard and get an unbiased view of their wealth. Each day, Wealthica connects to your financial institutions and retrieves accounts balances, positions and transactions. Wealthica is the largest financial aggregator in Canada with support for 200+ Canadian financial institutions and investment platforms.

This library provides the wrappers needed to setup the communication between the Wealthica Dashboard and 3rd-party add-ons. It aims to be simple to use and allows anyone with basic knowledge of JavaScript to write their own add-on.

Not sure where to start? Take a [look at the Example Add-on code](https://github.com/wealthica/wealthica.js/blob/master/example.html) and see the instructions below to load it into your Wealthica Dashboard.

Ready to publish your add-on to the Wealthica Add-ons store? [Contact us](mailto:hello@wealthica.com).

## Financial Institutions

Wealthica supports connecting to the following Canadian financial institutions and investment portals. Support for importing positions (holdings), transactions and account statements varies. [Visit our website](https://wealthica.com) for the most recent list of supported institutions.

## Getting started

1. Login to your [Wealthica](https://app.wealthica.com).
2. Install the [Developer Add-on](https://app.wealthica.com/addons/details?id=wealthica/wealthica-dev-addon). After that you will be redirected to the Developer Add-on page.
3. Click on the button next to the page title to open the Configure modal.
4. Enter https://wealthica.github.io/wealthica.js/example.html to the Add-on URL field and click Load to load the Example Add-on.
5. Try some of the sample actions provided in the add-on.

After trying out the Example Add-on, it's time to make your own add-on:

1. Clone Example Add-on or create your own add-on page.
2. From Wealthica navigate to the Developer Add-on and open the Configure modal and load your add-on.
3. Take a look at the [APIs](#apis) section below and start writing your add-on.

For a more advanced example, take a look at our [Wealthica Cryptos Addon code](https://github.com/wealthica/wealthica-cryptos-addon).

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
  // (optional) The 'id' of the add-on / widget.
  // This is only required in the add-on release preparation process.
  // For add-on development with the Developer Add-on, this should not be set.
  id: 'addon-id' | 'addon-id/widgets/widget-id'
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

Emitted when there are important changes in Wealthica Dashboard (e.g. user has just added a new institution, or removed an asset). This suggests add-ons reload their data and render accordingly.

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

#### event: 'institution:sync'

Emitted when Wealthica Dashboard receives a signal that the institution sync is done.

```
addon.on('institution:sync', function (institutionId) {
  // Update synced institution
});
```

#### addon.addTransaction(attrs)

This method opens the Add Transaction form on the Dashboard and waits for user to submit the transaction or to close the modal. Pass an optional `attrs` object to pre-populate the transaction form. The `newTransaction` parameter is provided when a new transaction has been created.

```
addon.addTransaction({ description: "Some description" }).then(function (newTransaction) {
  // The form has been closed

  if (newTransaction) {
    // A new transaction has been created
  } else {
    // Nothing changed
  }
}).catch(function (err) {

});
```

#### addon.editTransaction(id)

This method opens the Edit Transaction form on the Dashboard and waits for user to update the transaction or to close the form. The `updatedTransaction` parameter is provided when the transaction has been updated.

```
addon.editTransaction('transaction-id').then(function (updatedTransaction) {
  // The form has been closed

  if (updatedTransaction) {
    // The transaction has been updated
  } else {
    // Nothing changed
  }
}).catch(function (err) {

});
```

#### addon.addInstitution(attrs)

This method opens the Add Institution form on the Dashboard and waits for user to finish the process or to close the form.

Pass an optional institution object (`{ type, name }`) to go straight to the institution's credentials form. Otherwise the modal will open at the Select Institution step.

The `newInstitution` parameter is provided when a new institution has been created.

```
addon.addInstitution({ type: 'demo', name: 'Demo' }).then(function (newInstitution) {
  // The form has been closed

  if (newInstitution) {
    // A new institution has been created
  } else {
    // Nothing changed
  }
}).catch(function (err) {

});
```

#### addon.addInvestment()

This method opens the Add Investment form on the Dashboard and waits for user to finish the process or to close the form.

```
addon.addInvestment().then(function (result) {
  // The form has been closed

  if (result) {
    // A new institution, asset or liability has been created
  } else {
    // Nothing changed
  }
}).catch(function (err) {

});
```

#### addon.editInstitution(id), addon.editAsset(id) & addon.editLiability(id)

These methods open the corresponding Edit form (Institution/Asset/Liability) on the Dashboard and wait for user to update the item or to close the form.

The `updatedItem` parameter is provided when the item has been successfully updated.

```
addon.editInstitution('institution-id').then(function (updatedItem) {
  // The form has been closed

  if (updatedItem) {
    // The item has been updated
  } else {
    // Nothing changed
  }
}).catch(function (err) {

});
```

#### addon.deleteInstitution(id), addon.deleteAsset(id) & addon.deleteLiability(id)

These methods open the corresponding Delete form (Institution/Asset/Liability) on the Dashboard and wait for user to confirm or to close the form.

The `deleted` parameter is provided when the item has been successfully deleted.

```
addon.deleteInstitution('institution-id').then(function (deleted) {
  // The form has been closed

  if (deleted) {
    // The item has been deleted
  } else {
    // Nothing changed
  }
}).catch(function (err) {

});
```

#### addon.downloadDocument(id)

This method triggers download of a Wealthica document

```
addon.downloadDocument('document-id').then(function () {
  // The action has been successfully carried out.
}).catch(function (err) {

});
```

#### addon.getSharings()

This method request the list of sharings for the logged in user.

NOTE: Only available for addons with `"switch_user"` feature flag.

```
addon.getSharings().then(function (sharings) {}).catch(function (err) {});
```

#### addon.switchUser(id)

This method switches Dashboard to viewing the user with provided id.

NOTE: Only available for addons with `"switch_user"` feature flag.

```
addon.switchUser(id).then(function () {
  // Successfully switched
}).catch(function (err) {});
```

#### addon.saveData(data)

This method allows add-on to persist data to the Wealthica user preferences. You can use this method to persist user configuration options. The add-on will receive this data under the `data` options parameter [the next time it is initialized](#event-init). Each add-on can store up to 100 KB of data (plus 4 KB per widget). Please note data is stored unencrypted in our database and may not be suitable for storing sensitive information.

```
addon.saveData({ preferredCurrencies: ['CAD', 'USD', 'GBP', 'MXN'] }).then(function () {

}).catch(function (err) {

});
```

### API helpers

These are helper functions for requesting API calls. See our API docs for the full list of API endpoints, their parameters and what they do.

For API endpoints that are not yet supported by the API helpers, see [addon.request](#addonrequestoptions) in the Debug section below.

#### addon.api.getAssets(query)

```
addon.api.getAssets({ date: '2018-01-01' })
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.getCurrencies(query)

```
addon.api.getCurrencies({ from: '2018-01-01', to: '2018-01-31' })
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.getInstitutions(query)

```
addon.api.getInstitutions({ date: '2018-01-01' })
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.getInstitution(id)

```
addon.api.getInstitution('institution-id')
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.pollInstitution(id, version)

```
addon.api.pollInstitution('institution-id', 1)
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.syncInstitution(id)

```
addon.api.syncInstitution('institution-id')
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.addInstitution(data)

```
addon.api.addInstitution({
  name: 'Demo',
  type: 'demo',
  credentials: { username: 'wealthica', password: 'wealthica' }
}).then(function (response) { }).catch(function (err) { });
```

#### addon.api.getLiabilities(query)

```
addon.api.getLiabilities({ date: '2018-01-01' })
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.getPositions(query)

```
addon.api.getPositions({ groups: 'id1,id2', institutions: 'id1,id2' })
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.getTransactions(query)

```
addon.api.getTransactions({ groups: 'id1,id2', institutions: 'id1,id2' })
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.updateTransaction(id, attrs)

```
addon.api.updateTransaction('id', { currency_amount: 123 })
  .then(function (response) { }).catch(function (err) { });
```

#### addon.api.getUser()

```
addon.api.getUser().then(function (response) { }).catch(function (err) { });
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

#### addon.request(options)

This is used to make a request to API endpoints that are not currently supported by `addon.api`.

```
addon.request({
  method: 'GET',
  endpoint: 'positions',
  query: {
    institutions: 'id1,id2',
    assets: true,
  }
}).then(function (response) { }).catch(function (err) { });
```

#### addon.setEffectiveUser(id)

This is used make `addon.request()` calls on behalf of another user who has shared access to the currently logged in user. It has the same effect for any of the `addon.api` helpers which are wrappers around `addon.request()`.

```
addon.setEffectiveUser(userA);
addon.request({...}).then(function (response) { }).catch(function (err) { });

addon.setEffectiveUser(userB);
addon.request({...}).then(function (response) { }).catch(function (err) { });

// It's advised to clear effectiveUser after finishing on-behalf calls
addon.setEffectiveUser(null);
addon.request({...}).then(function (response) { }).catch(function (err) { });
```

## Development

### Install

```
yarn install
```

### Build

```
yarn build
```

### Test

```
yarn build
yarn test
```

### Release
```
npm version patch # or minor/major
git push --tags
# wait until merged then
npm publish
```
