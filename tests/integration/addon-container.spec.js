import _ from 'lodash';

describe('AddonContainer', () => {
  let page;
  let addonFrame;

  const getSpyCall = async (eventName) => {
    const spyCallsHandle = await addonFrame.evaluateHandle(() => new Promise((resolve) => {
      setTimeout(() => {
        resolve(addon.emit.getCalls().map((c) => c.args));
      });
    }));

    const spyCalls = await spyCallsHandle.jsonValue();
    return _.find(spyCalls, (c) => c[0] === eventName);
  };

  before(async () => {
    page = await browser.newPage();
    await page.goto(url);
    [, addonFrame] = await page.frames();
  });

  after(async () => {
    await page.close();
  });

  beforeEach(async () => {
    await addonFrame.evaluate(() => new Promise((resolve) => {
      sinon.spy(addon, 'emit');
      resolve();
    }));
  });

  afterEach(async () => {
    await addonFrame.evaluate(() => new Promise((resolve) => {
      addon.emit.restore();
      resolve();
    }));
  });

  describe('init', () => {
    it('should pass options to Addon', async () => {
      const optionsHandle = await addonFrame
        .evaluateHandle(() => Promise.resolve(window.addonOptions));
      const options = await optionsHandle.jsonValue();

      expect(options).to.deep.equal({ test: 'test' });
    });
  });

  describe('.trigger(eventName, eventData)', () => {
    it('should pass the event to Addon', async () => {
      const eventName = 'test event';
      const eventData = { test: 'data' };
      page.evaluate((eventName, eventData) => {
        container.trigger(eventName, eventData);
      }, eventName, eventData);
      const call = await getSpyCall(eventName);

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(eventData);
    });
  });

  describe('.update(data)', () => {
    it('should trigger `update` event in Addon', async () => {
      const data = { test: 'test' };
      page.evaluate((data) => {
        container.update(data);
      }, data);
      const call = await getSpyCall('update');
      expect(call).to.exist;
      expect(call[1]).to.deep.equal(data);
    });
  });

  describe('.reload()', () => {
    it('should trigger `reload` event in Addon', async () => {
      page.evaluate(() => {
        container.reload();
      });
      const call = await getSpyCall('reload');

      expect(call).to.exist;
    });
  });
});
