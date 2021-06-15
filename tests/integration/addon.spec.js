import { expect } from 'chai';
import _ from 'lodash';

describe('Addon', () => {
  let page;

  const getSpyCall = async (eventName) => {
    const spyCallsHandle = await page.evaluateHandle(() => new Promise((resolve) => {
      setTimeout(() => {
        resolve(container.emit.getCalls().map((c) => c.args));
      });
    }));

    const spyCalls = await spyCallsHandle.jsonValue();
    return _.find(spyCalls, (c) => c[0] === eventName);
  };

  before(async () => {
    page = await browser.newPage();
    await page.goto(url);
  });

  after(async () => {
    await page.close();
  });

  beforeEach(async () => {
    await page.evaluate(() => new Promise((resolve) => {
      sinon.spy(container, 'emit');
      resolve();
    }));
  });

  afterEach(async () => {
    await page.evaluate(() => new Promise((resolve) => {
      container.emit.restore();
      resolve();
    }));
  });

  describe('.request(params)', () => {
    beforeEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.on('request', (params, callback) => {
          if (params.query && params.query.shouldSuccess) {
            callback(null, { success: true });
          } else {
            callback('error');
          }
        });

        resolve();
      }));
    });

    it('should receive success result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const params = { method: 'GET', endpoint: 'test', query: { shouldSuccess: true } };
      const result = await addonFrame.evaluate((params) => new Promise((resolve) => {
        addon.request(params).then((result) => {
          resolve(result);
        }).catch((err) => {
          resolve(err);
        });
      }), params);
      const call = await getSpyCall('request');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(params);
      expect(result).to.deep.equal({ success: true });
    });

    it('should receive error result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const params = { method: 'GET', endpoint: 'test', query: { some: 'thing' } };
      const result = await addonFrame.evaluate((params) => new Promise((resolve) => {
        addon.request(params).then((result) => {
          resolve(result);
        }).catch((err) => {
          resolve(err);
        });
      }), params);
      const call = await getSpyCall('request');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(params);
      expect(result).to.equal('error');
    });
  });

  describe('.saveData(data)', () => {
    beforeEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.on('saveData', (data, callback) => {
          if (data.shouldSave) {
            callback();
          } else {
            callback('not saved');
          }
        });

        resolve();
      }));
    });

    it('should receive success result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const data = { shouldSave: true };

      const result = await addonFrame.evaluate((data) => new Promise((resolve) => {
        addon.saveData(data).then(() => {
          resolve({ saved: true });
        }).catch((err) => {
          resolve(err);
        });
      }), data);
      const call = await getSpyCall('saveData');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(data);
      expect(result).to.deep.equal({ saved: true });
    });

    it('should receive error result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const data = { shouldSave: false };

      const result = await addonFrame.evaluate((data) => new Promise((resolve) => {
        addon.saveData(data).then(() => {
          resolve({ saved: true });
        }).catch((err) => {
          resolve(err);
        });
      }), data);
      const call = await getSpyCall('saveData');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(data);
      expect(result).to.deep.equal('not saved');
    });
  });

  ['addTransaction', 'addInstitution'].forEach((method) => {
    describe(`.${method}(attrs)`, () => {
      beforeEach(async () => {
        await page.evaluate((method) => new Promise((resolve) => {
          container.on(method, (attrs, callback) => {
            if (attrs.id === 'shouldCreate') {
              callback(null, { created: true });
            } else if (attrs.id === 'shouldClose') {
              callback(null);
            } else {
              callback('error');
            }
          });

          resolve();
        }), method);
      });

      afterEach(async () => {
        await page.evaluate((method) => new Promise((resolve) => {
          container.off(method);

          resolve();
        }), method);
      });

      it('should receive success result with new item from AddonContainer', async () => {
        const addonFrame = (await page.frames())[1];
        const attrs = { id: 'shouldCreate' };

        const result = await addonFrame.evaluate(({ attrs, method }) => new Promise((resolve) => {
          addon[method](attrs).then((item) => {
            resolve(item);
          }).catch((err) => {
            resolve(err);
          });
        }), { attrs, method });
        const call = await getSpyCall(method);

        expect(call).to.exist;
        expect(call[1]).to.deep.equal(attrs);
        expect(result).to.deep.equal({ created: true });
      });

      it('should receive success result without new item from AddonContainer', async () => {
        const addonFrame = (await page.frames())[1];
        const attrs = { id: 'shouldClose' };

        const result = await addonFrame.evaluate(({ attrs, method }) => new Promise((resolve) => {
          addon[method](attrs).then((item) => {
            resolve(item);
          }).catch((err) => {
            resolve(err);
          });
        }), { attrs, method });
        const call = await getSpyCall(method);

        expect(call).to.exist;
        expect(call[1]).to.deep.equal(attrs);
        expect(result).to.not.exist;
      });

      it('should receive error result from AddonContainer', async () => {
        const addonFrame = (await page.frames())[1];
        const attrs = { id: 'error' };

        const result = await addonFrame.evaluate(({ attrs, method }) => new Promise((resolve) => {
          addon[method](attrs).then((item) => {
            resolve(item);
          }).catch((err) => {
            resolve(err);
          });
        }), { attrs, method });
        const call = await getSpyCall(method);

        expect(call).to.exist;
        expect(call[1]).to.deep.equal(attrs);
        expect(result).to.equal('error');
      });
    });
  });

  [
    'editTransaction',
    'editInstitution', 'editAsset', 'editLiability',
    'deleteInstitution', 'deleteAsset', 'deleteLiability',
  ].forEach((method) => {
    describe(`.${method}(id)`, () => {
      beforeEach(async () => {
        await page.evaluate((method) => new Promise((resolve) => {
          container.on(method, (id, callback) => {
            if (id === 'shouldUpdate') {
              callback(null, { updated: true });
            } else if (id === 'shouldClose') {
              callback(null);
            } else {
              callback('error');
            }
          });

          resolve();
        }), method);
      });

      afterEach(async () => {
        await page.evaluate((method) => new Promise((resolve) => {
          container.off(method);

          resolve();
        }), method);
      });

      it('should receive success result with updated data from AddonContainer', async () => {
        const addonFrame = (await page.frames())[1];
        const id = 'shouldUpdate';

        const result = await addonFrame.evaluate(({ id, method }) => new Promise((resolve) => {
          addon[method](id).then((updated) => {
            if (updated) resolve(updated);
            else resolve({ updated: false });
          }).catch((err) => {
            resolve(err);
          });
        }), { id, method });
        const call = await getSpyCall(method);

        expect(call).to.exist;
        expect(call[1]).to.deep.equal(id);
        expect(result).to.deep.equal({ updated: true });
      });

      it('should receive success result without updated data from AddonContainer', async () => {
        const addonFrame = (await page.frames())[1];
        const id = 'shouldClose';

        const result = await addonFrame.evaluate(({ id, method }) => new Promise((resolve) => {
          addon[method](id).then((updated) => {
            if (updated) resolve(updated);
            else resolve({ updated: false });
          }).catch((err) => {
            resolve(err);
          });
        }), { id, method });
        const call = await getSpyCall(method);

        expect(call).to.exist;
        expect(call[1]).to.deep.equal(id);
        expect(result).to.deep.equal({ updated: false });
      });

      it('should receive error result from AddonContainer', async () => {
        const addonFrame = (await page.frames())[1];
        const id = 'test';

        const result = await addonFrame.evaluate(({ id, method }) => new Promise((resolve) => {
          addon[method](id).then((updated) => {
            if (updated) resolve(updated);
            else resolve({ updated: false });
          }).catch((err) => {
            resolve(err);
          });
        }), { id, method });
        const call = await getSpyCall(method);

        expect(call).to.exist;
        expect(call[1]).to.deep.equal(id);
        expect(result).to.equal('error');
      });
    });
  });

  describe('.addInvestment()', () => {
    afterEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.off('addInvestment');

        resolve();
      }));
    });

    describe('when container returns result', () => {
      beforeEach(async () => {
        await page.evaluate(() => new Promise((resolve) => {
          container.on('addInvestment', (callback) => {
            callback(null, { created: true });
          });

          resolve();
        }));
      });

      it('should receive result from AddonContainer', async () => {
        const addonFrame = (await page.frames())[1];

        const result = await addonFrame.evaluate(() => new Promise((resolve) => {
          addon.addInvestment().then((result) => {
            resolve(result);
          }).catch((err) => {
            resolve(err);
          });
        }));
        const call = await getSpyCall('addInvestment');

        expect(call).to.exist;
        expect(result).to.deep.equal({ created: true });
      });
    });

    describe('when container returns neither error nor result', () => {
      beforeEach(async () => {
        await page.evaluate(() => new Promise((resolve) => {
          container.on('addInvestment', (callback) => {
            callback();
          });

          resolve();
        }));
      });

      it('should proceed as a success', async () => {
        const addonFrame = (await page.frames())[1];

        const result = await addonFrame.evaluate(() => new Promise((resolve) => {
          addon.addInvestment().then((result) => {
            resolve(result);
          }).catch((err) => {
            resolve(err);
          });
        }));
        const call = await getSpyCall('addInvestment');

        expect(call).to.exist;
        expect(result).to.not.exist;
      });
    });

    describe('when container returns an error', () => {
      beforeEach(async () => {
        await page.evaluate(() => new Promise((resolve) => {
          container.on('addInvestment', (callback) => {
            callback('error');
          });

          resolve();
        }));
      });

      it('should receive the error', async () => {
        const addonFrame = (await page.frames())[1];

        const result = await addonFrame.evaluate(() => new Promise((resolve) => {
          addon.addInvestment().then((result) => {
            resolve(result);
          }).catch((err) => {
            resolve(err);
          });
        }));
        const call = await getSpyCall('addInvestment');

        expect(call).to.exist;
        expect(result).to.equal('error');
      });
    });
  });

  describe('.downloadDocument(id)', () => {
    beforeEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.on('downloadDocument', (id, callback) => {
          if (id === 'shouldPass') {
            callback();
          } else {
            callback('error');
          }
        });

        resolve();
      }));
    });

    afterEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.off('downloadDocument');

        resolve();
      }));
    });

    it('should receive success result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const id = 'shouldPass';

      const result = await addonFrame.evaluate((id) => new Promise((resolve) => {
        addon.downloadDocument(id).then(resolve).catch(resolve);
      }), id);
      const call = await getSpyCall('downloadDocument');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.not.exist;
    });

    it('should receive error result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const id = 'test';

      const result = await addonFrame.evaluate((id) => new Promise((resolve) => {
        addon.downloadDocument(id).then(resolve).catch(resolve);
      }), id);
      const call = await getSpyCall('downloadDocument');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.equal('error');
    });
  });

  describe('.upgradePremium()', () => {
    beforeEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.on('upgradePremium', (callback) => {
          callback();
        });

        resolve();
      }));
    });

    afterEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.off('upgradePremium');

        resolve();
      }));
    });

    it('should be successful', async () => {
      const addonFrame = (await page.frames())[1];

      const result = await addonFrame.evaluate(() => new Promise((resolve, reject) => {
        addon.upgradePremium().then(resolve).catch(reject);
      }));
      const call = await getSpyCall('upgradePremium');

      expect(call).to.exist;
      expect(result).to.not.exist;
    });
  });

  describe('.getSharings()', () => {
    const sharings = [{ id: 'test1' }, { id: 'test2' }];

    afterEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.off('getSharings');

        resolve();
      }));
    });

    describe('when container returns result', () => {
      beforeEach(async () => {
        await page.evaluate((sharings) => new Promise((resolve) => {
          container.on('getSharings', (callback) => {
            callback(null, sharings);
          });

          resolve();
        }), sharings);
      });

      it('should receive the result', async () => {
        const addonFrame = (await page.frames())[1];

        const result = await addonFrame.evaluate(() => new Promise((resolve) => {
          addon.getSharings().then((sharings) => {
            resolve(sharings);
          }).catch((err) => {
            resolve(err);
          });
        }));
        const call = await getSpyCall('getSharings');

        expect(call).to.exist;
        expect(result).to.deep.equal(sharings);
      });
    });

    describe('when container returns error', () => {
      beforeEach(async () => {
        await page.evaluate(() => new Promise((resolve) => {
          container.on('getSharings', (callback) => {
            callback('error');
          });

          resolve();
        }));
      });

      it('should receive the error', async () => {
        const addonFrame = (await page.frames())[1];

        const result = await addonFrame.evaluate(() => new Promise((resolve) => {
          addon.getSharings().then((sharings) => {
            resolve(sharings);
          }).catch((err) => {
            resolve(err);
          });
        }));
        const call = await getSpyCall('getSharings');

        expect(call).to.exist;
        expect(result).to.equal('error');
      });
    });
  });

  describe('.switchUser(id)', () => {
    beforeEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.on('switchUser', (id, callback) => {
          if (id === 'shouldPass') {
            callback();
          } else {
            callback('error');
          }
        });

        resolve();
      }));
    });

    afterEach(async () => {
      await page.evaluate(() => new Promise((resolve) => {
        container.off('switchUser');

        resolve();
      }));
    });

    it('should receive success result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const id = 'shouldPass';

      const result = await addonFrame.evaluate((id) => new Promise((resolve) => {
        addon.switchUser(id).then(resolve).catch(resolve);
      }), id);
      const call = await getSpyCall('switchUser');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.not.exist;
    });

    it('should receive error result from AddonContainer', async () => {
      const addonFrame = (await page.frames())[1];
      const id = 'test';

      const result = await addonFrame.evaluate((id) => new Promise((resolve) => {
        addon.switchUser(id).then(resolve).catch(resolve);
      }), id);
      const call = await getSpyCall('switchUser');

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(id);
      expect(result).to.equal('error');
    });
  });
});
