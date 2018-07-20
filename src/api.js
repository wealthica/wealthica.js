import { Promise } from 'es6-promise';

class API {
  constructor (addon) {
    this.addon = addon;
  }

  // Assets
  getAssets (query) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: 'assets',
        query,
      }).then(resolve).catch(reject);
    });
  }

  // Currencies
  getCurrencies (query) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: 'currencies',
        query,
      }).then(resolve).catch(reject);
    });
  }

  // Institutions
  getInstitutions (query) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: 'institutions',
        query,
      }).then(resolve).catch(reject);
    });
  }

  getInstitution (id) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: `institutions/${id}`,
      }).then(resolve).catch(reject);
    });
  }

  pollInstitution (id, v) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: `institutions/${id}/poll?v=${v}`,
      }).then(resolve).catch(reject);
    });
  }

  syncInstitution (id) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'POST',
        endpoint: `institutions/${id}/sync`,
      }).then(resolve).catch(reject);
    });
  }

  addInstitution (data) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'POST',
        endpoint: `institutions`,
        body: data,
      }).then(resolve).catch(reject);
    });
  }

  // liabilities
  getLiabilities (query) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: 'liabilities',
        query,
      }).then(resolve).catch(reject);
    });
  }

  // Positions
  getPositions (query) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: 'positions',
        query,
      }).then(resolve).catch(reject);
    });
  }

  // Transactions
  getTransactions (query) {
    let self = this;

    return new Promise((resolve, reject) => {
      self.addon.request({
        method: 'GET',
        endpoint: 'transactions',
        query,
      }).then(resolve).catch(reject);
    });
  }
}

module.exports = API;
