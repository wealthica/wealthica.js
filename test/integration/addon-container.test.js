import _ from 'lodash';

describe('AddonContainer', () => {
  let page, addonFrame;

  const getSpyCall = async (eventName) => {
    let spyCallsHandle = await addonFrame.evaluateHandle(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(addon.emit.getCalls().map((c) => c.args));
        });
      });
    });

    let spyCalls = await spyCallsHandle.jsonValue();
    return _.find(spyCalls, (c) => c[0] === eventName);
  }

  before(async () => {
    page = await browser.newPage();
    await page.goto(url);
    addonFrame = (await page.frames())[1];
  });

  after(async () => {
    await page.close();
  });

  beforeEach(async () => {
    await addonFrame.evaluate(() => {
      return new Promise((resolve, reject) => {
        sinon.spy(addon, 'emit');
        resolve();
      });
    });
  });

  afterEach(async () => {
    await addonFrame.evaluate(() => {
      return new Promise((resolve, reject) => {
        addon.emit.restore();
        resolve();
      });
    });
  });

  describe('init', () => {
    it('should pass options to Addon', async () => {
      let optionsHandle = await addonFrame.evaluateHandle(() => {
        return Promise.resolve(window.addonOptions);
      });
      let options = await optionsHandle.jsonValue();
      expect(options).to.deep.equal({ test: 'test' });
    });

    it('should default id to addon iframe src', async () => {
      let idHandle = await page.evaluateHandle(() => {
        return Promise.resolve(window.container.id);
      });
      let id = await idHandle.jsonValue();
      expect(id).to.equal('http://localhost:9898/test/integration/addon.html');
    });
  });

  describe('.trigger(eventName, eventData)', () => {
    it('should pass the event to Addon', async () => {
      let eventName = 'test event';
      let eventData = { test: 'data' };
      page.evaluate((eventName, eventData) => {
        container.trigger(eventName, eventData);
      }, eventName, eventData);
      let call = await getSpyCall(eventName);

      expect(call).to.exist;
      expect(call[1]).to.deep.equal(eventData);
    });
  });

  describe('.update(data)', () => {
    it('should trigger `update` event in Addon', async () => {
      let data = { test: 'test' };
      page.evaluate((data) => {
        container.update(data);
      }, data);
      let call = await getSpyCall('update');
      expect(call).to.exist;
      expect(call[1]).to.deep.equal(data);
    });
  });

  describe('.reload()', () => {
    it('should trigger `reload` event in Addon', async () => {
      page.evaluate(() => {
        container.reload();
      });
      let call = await getSpyCall('reload');

      expect(call).to.exist;
    });
  });
});
