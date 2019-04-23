import { Promise } from 'es6-promise';

class API {
  constructor (addon) {
    this.addon = addon;
  }

  // Assets
  getAssets (query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'assets',
      query,
    });
  }

  // Currencies
  getCurrencies (query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'currencies',
      query,
    });
  }

  // Institutions
  getInstitutions (query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'institutions',
      query,
    });
  }

  getInstitution (id) {
    return this.addon.request({
      method: 'GET',
      endpoint: `institutions/${id}`,
    });
  }

  pollInstitution (id, v) {
    return this.addon.request({
      method: 'GET',
      endpoint: `institutions/${id}/poll?v=${v}`,
    });
  }

  syncInstitution (id) {
    return this.addon.request({
      method: 'POST',
      endpoint: `institutions/${id}/sync`,
    });
  }

  addInstitution (data) {
    return this.addon.request({
      method: 'POST',
      endpoint: `institutions`,
      body: data,
    });
  }

  // liabilities
  getLiabilities (query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'liabilities',
      query,
    });
  }

  // Positions
  getPositions (query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'positions',
      query,
    });
  }

  // Transactions
  getTransactions (query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'transactions',
      query,
    })
  }
}

module.exports = API;
