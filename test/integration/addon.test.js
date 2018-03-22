import _ from 'lodash';

describe('Addon', () => {
  let page;

  const getSpyCall = async (eventName) => {
    let spyCallsHandle = await page.evaluateHandle(() => {
      return new Promise((resolve, reject) => {
        setTimeout(function() {
          resolve(container.emit.getCalls().map(function(c) { return c.args }));
        });
      });
    });

    let spyCalls = await spyCallsHandle.jsonValue();
    return _.find(spyCalls, (c) => { return c[0] === eventName });
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
    it('should trigger `request` event in AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let params = { method: 'GET', endpoint: 'test', query: { some: 'thing' }};
      addonFrame.evaluate((params) => {
        addon.request(params);
      }, params);
      let call = await getSpyCall('request');

      expect(call).to.exist;
      expect(call[2]).to.deep.equal(params);
    });
  });

  describe('.saveData(data)', () => {
    it('should trigger `saveData` event in AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let data = { test: 1 };
      addonFrame.evaluate((data) => {
        addon.saveData(data);
      }, data);
      let call = await getSpyCall('saveData');

      expect(call).to.exist;
      expect(call[2]).to.deep.equal(data);
    });
  });

  describe('.editTransaction(options)', () => {
    it('should trigger `editTransaction` event in AddonContainer', async () => {
      let addonFrame = (await page.frames())[1];
      let options = { id: 'test', somethingelse: 'somethingelse' };
      addonFrame.evaluate((options) => {
        addon.editTransaction(options);
      }, options);
      let call = await getSpyCall('editTransaction');

      expect(call).to.exist;
      expect(call[2]).to.deep.equal(options);
    });
  });
});
