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

  describe('.editTransaction(options)', () => {
    beforeEach(async () => {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          container.on('editTransaction', (options, callback) => {
            if (options.shouldUpdate) {
              callback(null, { updated: true });
            } else if (options.shouldClose) {
              callback(null);
            } else {
              callback('error');
            }
          });

          resolve();
        });
      });
    });

    it('should receive success result with updated transaction from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let options = { id: 'test', shouldUpdate: true };

      let result = await addonFrame.evaluate((options) => {
        return new Promise((resolve, reject) => {
          addon.editTransaction(options).then((updated) => {
            if (!updated) return resolve({ updated: false });
            resolve(updated);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, options);
      let call = await getSpyCall('editTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(options);
      expect(result).to.deep.equal({ updated: true });
    });

    it('should receive success result without updated transaction from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let options = { id: 'test', shouldClose: true };

      let result = await addonFrame.evaluate((options) => {
        return new Promise((resolve, reject) => {
          addon.editTransaction(options).then((updated) => {
            if (!updated) return resolve({ updated: false });
            resolve(updated);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, options);
      let call = await getSpyCall('editTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(options);
      expect(result).to.deep.equal({ updated: false });
    });

    it('should receive error result from AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let options = { id: 'test' };

      let result = await addonFrame.evaluate((options) => {
        return new Promise((resolve, reject) => {
          addon.editTransaction(options).then((updated) => {
            if (!updated) return resolve({ updated: false });
            resolve(updated);
          }).catch((err) => {
            resolve(err);
          });
        });
      }, options);
      let call = await getSpyCall('editTransaction');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(options);
      expect(result).to.deep.equal('error');
    });
  });
});
