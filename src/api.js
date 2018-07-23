import { Promise } from 'es6-promise';

class API {
  constructor (addon) {
    this.addon = addon;
  }

  // Assets
  getAssets (query) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: 'assets',
      query,
    });
  }

  // Currencies
  getCurrencies (query) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: 'currencies',
      query,
    });
  }

  // Institutions
  getInstitutions (query) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: 'institutions',
      query,
    });
  }

  getInstitution (id) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: `institutions/${id}`,
    });
  }

  pollInstitution (id, v) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: `institutions/${id}/poll?v=${v}`,
    });
  }

  syncInstitution (id) {
    let self = this;

    return self.addon.request({
      method: 'POST',
      endpoint: `institutions/${id}/sync`,
    });
  }

  addInstitution (data) {
    let self = this;

    return self.addon.request({
      method: 'POST',
      endpoint: `institutions`,
      body: data,
    });
  }

  // liabilities
  getLiabilities (query) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: 'liabilities',
      query,
    });
  }

  // Positions
  getPositions (query) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: 'positions',
      query,
    });
  }

  // Transactions
  getTransactions (query) {
    let self = this;

    return self.addon.request({
      method: 'GET',
      endpoint: 'transactions',
      query,
    })
  }
}

module.exports = API;
