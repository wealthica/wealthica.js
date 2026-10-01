import {
  describe, it, expect, beforeAll, afterAll, beforeEach, afterEach,
} from 'vitest';
import puppeteer from 'puppeteer';
import _ from 'lodash';

const url = 'http://localhost:9898/tests/integration/addon-container.html';
let browser;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
});

afterAll(async () => {
  await browser.close();
});

describe('AddonContainer', () => {
  let page;
  let addonFrame;

  const getSpyCall = async (eventName) => {
    // Events travel through postMessage; wait for the one we expect instead of relying on slowMo
    await addonFrame.waitForFunction(
      (name) => addon.emit.getCalls().some((c) => c.args[0] === name),
      { timeout: 5000 },
      eventName,
    ).catch(() => {});
    const spyCallsHandle = await addonFrame.evaluateHandle(() => new Promise((resolve) => {
      setTimeout(() => {
        resolve(addon.emit.getCalls().map((c) => c.args));
      });
    }));

    const spyCalls = await spyCallsHandle.jsonValue();
    return _.find(spyCalls, (c) => c[0] === eventName);
  };

  beforeAll(async () => {
    page = await browser.newPage();
    await page.goto(url);
    // the addon iframe must have booted before the tests poke at window.container / addon
    await page.waitForFunction(() => window.container !== undefined);
    [, addonFrame] = await page.frames();
    await addonFrame.waitForFunction(() => window.addonOptions !== undefined);
  });

  afterAll(async () => {
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

      expect(options).toEqual({ test: 'test' });
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

      expect(call).toBeDefined();
      expect(call[1]).toEqual(eventData);
    });
  });

  describe('.update(data)', () => {
    it('should trigger `update` event in Addon', async () => {
      const data = { test: 'test' };
      page.evaluate((data) => {
        container.update(data);
      }, data);
      const call = await getSpyCall('update');
      expect(call).toBeDefined();
      expect(call[1]).toEqual(data);
    });
  });

  describe('.reload()', () => {
    it('should trigger `reload` event in Addon', async () => {
      page.evaluate(() => {
        container.reload();
      });
      const call = await getSpyCall('reload');

      expect(call).toBeDefined();
    });
  });
});
