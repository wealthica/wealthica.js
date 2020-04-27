import _ from 'lodash';

describe('Addon', () => {
  let page;

  const getSpyCall = async (eventName) => {
    let spyCallsHandle = await page.evaluateHandle(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(container.emit.getCalls().map((c) => c.args));
        });
      });
    });

    let spyCalls = await spyCallsHandle.jsonValue();
    return _.find(spyCalls, (c) => c[0] === eventName);
  }

  before(async () => {
    page = await browser.newPage();
    await page.goto(url);
  });

  after(async () => {
    await page.close();
  });

  beforeEach(async () => {
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        sinon.spy(container, 'emit');
        resolve();
      });
    });
  });

  afterEach(async () => {
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        container.emit.restore();
        resolve();
      });
    });
  });

  describe('.request(params)', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.on('request', (params, callback) => {
            if (params.query && params.query.shouldSuccess) {
              callback(null, { success: true });
            } else {
              callback('error');
            }
          });

          resolve();
        });
      });
    });

    it('should receive success result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let params = { method: 'GET', endpoint: 'test', query: { shouldSuccess: true }};
      let result = await addonFrame.evaluate((params) => {
        return new Promise((resolve, reject) => {
          addon.request(params).then((result) => {
            resolve(result);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, params);
      let call = await getSpyCall('request');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(params);
      expect(result).to.deep.equal({ success: true });
    });

    it('should receive error result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let params = { method: 'GET', endpoint: 'test', query: { some: 'thing' }};
      let result = await addonFrame.evaluate((params) => {
        return new Promise((resolve, reject) => {
          addon.request(params).then((result) => {
            resolve(result);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, params);
      let call = await getSpyCall('request');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(params);
      expect(result).to.equal('error');
    });
  });

  describe('.saveData(data)', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.on('saveData', (data, callback) => {
            if (data.shouldSave) {
              callback();
            } else {
              callback('not saved');
            }
          });

          resolve();
        });
      });
    });

    it('should receive success result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let data = { shouldSave: true };

      let result = await addonFrame.evaluate((data) => {
        return new Promise((resolve, reject) => {
          addon.saveData(data).then(() => {
            resolve({ saved: true });
          }).catch((err) => {
            resolve(err);
          });
        });
      }, data);
      let call = await getSpyCall('saveData');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(data);
      expect(result).to.deep.equal({ saved: true });
    });

    it('should receive error result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let data = { shouldSave: false };

      let result = await addonFrame.evaluate((data) => {
        return new Promise((resolve, reject) => {
          addon.saveData(data).then(() => {
            resolve({ saved: true });
          }).catch((err) => {
            resolve(err);
          });
        });
      }, data);
      let call = await getSpyCall('saveData');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(data);
      expect(result).to.deep.equal('not saved');
    });
  });

  describe('.addTransaction(attrs)', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.on('addTransaction', (attrs, callback) => {
            if (attrs.id === 'shouldCreate') {
              callback(null, { created: true });
            } else if (attrs.id === 'shouldClose') {
              callback(null);
            } else {
              callback('error');
            }
          });

          resolve();
        });
      });
    });

    afterEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.off('addTransaction');

          resolve();
        });
      });
    });

    it('should receive success result with new transaction from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let attrs = { id: 'shouldCreate' };

      let result = await addonFrame.evaluate((attrs) => {
        return new Promise((resolve, reject) => {
          addon.addTransaction(attrs).then((transaction) => {
            resolve(transaction);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, attrs);
      let call = await getSpyCall('addTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(attrs);
      expect(result).to.deep.equal({ created: true });
    });

    it('should receive success result without new transaction from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let attrs = { id: 'shouldClose' };

      let result = await addonFrame.evaluate((attrs) => {
        return new Promise((resolve, reject) => {
          addon.addTransaction(attrs).then((transaction) => {
            resolve(transaction);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, attrs);
      let call = await getSpyCall('addTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(attrs);
      expect(result).to.not.exist;
    });

    it('should receive error result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let attrs = { id: 'error' };

      let result = await addonFrame.evaluate((attrs) => {
        return new Promise((resolve, reject) => {
          addon.addTransaction(attrs).then((transaction) => {
            resolve(transaction);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, attrs);
      let call = await getSpyCall('addTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(attrs);
      expect(result).to.deep.equal('error');
    });
  });

  describe('.editTransaction(id)', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.on('editTransaction', (id, callback) => {
            if (id === 'shouldUpdate') {
              callback(null, { updated: true });
            } else if (id === 'shouldClose') {
              callback(null);
            } else {
              callback('error');
            }
          });

          resolve();
        });
      });
    });

    afterEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.off('editTransaction');

          resolve();
        });
      });
    });

    it('should receive success result with updated transaction from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let id = 'shouldUpdate';

      let result = await addonFrame.evaluate((id) => {
        return new Promise((resolve, reject) => {
          addon.editTransaction(id).then((updated) => {
            if (!updated) return resolve({ updated: false });
            resolve(updated);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, id);
      let call = await getSpyCall('editTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.deep.equal({ updated: true });
    });

    it('should receive success result without updated transaction from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let id = 'shouldClose';

      let result = await addonFrame.evaluate((id) => {
        return new Promise((resolve, reject) => {
          addon.editTransaction(id).then((updated) => {
            if (!updated) return resolve({ updated: false });
            resolve(updated);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, id);
      let call = await getSpyCall('editTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.deep.equal({ updated: false });
    });

    it('should receive error result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let id = 'test';

      let result = await addonFrame.evaluate((id) => {
        return new Promise((resolve, reject) => {
          addon.editTransaction(id).then((updated) => {
            if (!updated) return resolve({ updated: false });
            resolve(updated);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, id);
      let call = await getSpyCall('editTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.deep.equal('error');
    });
  });

  describe('.addInstitution(attrs)', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.on('addInstitution', (attrs, callback) => {
            if (attrs.id === 'shouldCreate') {
              callback(null, { created: true });
            } else if (attrs.id === 'shouldClose') {
              callback(null);
            } else {
              callback('error');
            }
          });

          resolve();
        });
      });
    });

    afterEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.off('addInstitution');

          resolve();
        });
      });
    });

    it('should receive success result with new institution from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let attrs = { id: 'shouldCreate' };

      let result = await addonFrame.evaluate((attrs) => {
        return new Promise((resolve, reject) => {
          addon.addInstitution(attrs).then((institution) => {
            resolve(institution);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, attrs);
      let call = await getSpyCall('addInstitution');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(attrs);
      expect(result).to.deep.equal({ created: true });
    });

    it('should receive success result without new institution from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let attrs = { id: 'shouldClose' };

      let result = await addonFrame.evaluate((attrs) => {
        return new Promise((resolve, reject) => {
          addon.addInstitution(attrs).then((institution) => {
            resolve(institution);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, attrs);
      let call = await getSpyCall('addInstitution');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(attrs);
      expect(result).to.not.exist;
    });

    it('should receive error result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let attrs = { id: 'error' };

      let result = await addonFrame.evaluate((attrs) => {
        return new Promise((resolve, reject) => {
          addon.addInstitution(attrs).then((institution) => {
            resolve(institution);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, attrs);
      let call = await getSpyCall('addInstitution');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(attrs);
      expect(result).to.deep.equal('error');
    });
  });

  describe('.downloadDocument(id)', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.on('downloadDocument', (id, callback) => {
            if (id === 'shouldPass') {
              callback(null, { _id: id });
            } else {
              callback('error');
            }
          });

          resolve();
        });
      });
    });

    afterEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.off('downloadDocument');

          resolve();
        });
      });
    });

    it('should receive success result with the doc object from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let id = 'shouldPass';

      let result = await addonFrame.evaluate((id) => {
        return new Promise((resolve, reject) => {
          addon.downloadDocument(id).then(resolve).catch(resolve);
        });
      }, id);
      let call = await getSpyCall('downloadDocument');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.deep.equal({ _id: id });
    });

    it('should receive error result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let id = 'test';

      let result = await addonFrame.evaluate((id) => {
        return new Promise((resolve, reject) => {
          addon.downloadDocument(id).then(resolve).catch(resolve);
        });
      }, id);
      let call = await getSpyCall('downloadDocument');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.deep.equal('error');
    });
  });
});
