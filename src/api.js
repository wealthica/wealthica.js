class API {
  constructor(addon) {
    this.addon = addon;
  }

  // Assets
  getAssets(query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'assets',
      query,
    });
  }

  // Currencies
  getCurrencies(query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'currencies',
      query,
    });
  }

  // Institutions
  getInstitutions(query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'institutions',
      query,
    });
  }

  getInstitution(id) {
    return this.addon.request({
      method: 'GET',
      endpoint: `institutions/${id}`,
    });
  }

  pollInstitution(id, v) {
    return this.addon.request({
      method: 'GET',
      endpoint: `institutions/${id}/poll?v=${v}`,
    });
  }

  syncInstitution(id) {
    return this.addon.request({
      method: 'POST',
      endpoint: `institutions/${id}/sync`,
    });
  }

  /**
   * @deprecated Since version 0.0.12. Will be removed in version 0.1.x.
   * Use `addon.addInstitution` instead.
   */
  addInstitution(data) {
    // eslint-disable-next-line no-console
    console.warn('DEPRECATED: `addon.api.addInstitution`. Use `addon.addInstitution instead.`');

    return this.addon.request({
      method: 'POST',
      endpoint: 'institutions',
      body: data,
    });
  }

  // liabilities
  getLiabilities(query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'liabilities',
      query,
    });
  }

  // Positions
  getPositions(query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'positions',
      query,
    });
  }

  // Transactions
  getTransactions(query) {
    return this.addon.request({
      method: 'GET',
      endpoint: 'transactions',
      query,
    });
  }

  updateTransaction(id, body = {}) {
    return this.addon.request({
      method: 'PUT',
      endpoint: `transactions/${id}`,
      body,
    });
  }

  // User
  getUser() {
    return this.addon.request({
      method: 'GET',
      endpoint: 'users/me',
    });
  }
}

module.exports = API;
