import {
  describe, it, expect, beforeAll, afterAll, vi,
} from 'vitest';
import { JSDOM } from 'jsdom';
import Addon from '../../src/addon';

describe('Addon', () => {
  let addon;

  beforeAll(() => {
    // JsChannel requires JSON implementation while JSDOM does not provide one.
    window.JSON = {
      stringify: () => {},
      parse: () => {},
    };

    addon = new Addon({ window: new JSDOM().window });
    vi.spyOn(addon.channel, 'call');
    vi.spyOn(addon.channel, 'destroy');
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (addon) {
      addon.destroy();
      addon = undefined;
    }
  });

  it('should configure heightCalculationMethod for iFrameResizer', () => {
    expect(window.iFrameResizer.heightCalculationMethod).toBeDefined();
  });

  it('should setup js-channel channel', () => {
    expect(typeof addon.channel).toBe('object');
    expect(Object.keys(addon.channel).sort()).toEqual(['bind', 'call', 'destroy', 'notify', 'unbind']);
  });

  describe('.request(params)', () => {
    it("should call channel's `request` method with the right params", () => {
      const params = {
        method: 'GET', endpoint: 'test', query: { some: 'thing' }, body: { another: 'thing' },
      };
      addon.request(params);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params).toEqual(params);
    });

    it('should raise an error if params is not an object', async () => {
      const errorMessage = 'Params must be an object';
      const numCalls = addon.channel.call.mock.calls.length;

      await Promise.all(['string', 1, true, false, undefined, null, []].map((params) => (
        expect(addon.request(params)).rejects.toThrow(errorMessage)
      )));

      expect(addon.channel.call.mock.calls.length).toBe(numCalls);
    });

    it('should raise an error if method or endpoint is missing or invalid', async () => {
      const errorMessage = 'Invalid method or endpoint';
      const numCalls = addon.channel.call.mock.calls.length;

      await Promise.all([1, true, false, null, undefined, [], {}, ''].flatMap((invalid) => [
        expect(addon.request({ method: invalid, endpoint: 'test' })).rejects.toThrow(errorMessage),
        expect(addon.request({ method: 'test', endpoint: invalid })).rejects.toThrow(errorMessage),
      ]));

      expect(addon.channel.call.mock.calls.length).toBe(numCalls);
    });

    it('should raise an error if query is not an object', async () => {
      const errorMessage = 'Query must be an object';
      const numCalls = addon.channel.call.mock.calls.length;

      await Promise.all(['string', 1, true, false, null, []].map((query) => (
        expect(addon.request({ method: 'GET', endpoint: 'test', query })).rejects.toThrow(errorMessage)
      )));

      expect(addon.channel.call.mock.calls.length).toBe(numCalls);
    });

    it('should still proceed if query is not provided', () => {
      const validParams = { method: 'GET', endpoint: 'test', query: undefined };
      addon.request(validParams);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params).toEqual(validParams);
    });

    it('should raise an error if body is not an object', async () => {
      const errorMessage = 'Body must be an object';
      const numCalls = addon.channel.call.mock.calls.length;

      await Promise.all(['string', 1, true, false, null, []].map((body) => (
        expect(addon.request({ method: 'GET', endpoint: 'test', body })).rejects.toThrow(errorMessage)
      )));

      expect(addon.channel.call.mock.calls.length).toBe(numCalls);
    });

    it('should still proceed if body is not provided', () => {
      const validParams = { method: 'GET', endpoint: 'test', body: undefined };
      addon.request(validParams);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params).toEqual(validParams);
    });

    it('should pass effectiveUser if set', () => {
      const params = {
        method: 'GET', endpoint: 'test', query: { some: 'thing' }, body: { another: 'thing' },
      };
      addon.setEffectiveUser('test');
      addon.request(params);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params).toEqual({ ...params, effectiveUser: 'test' });
    });

    it('should not pass effectiveUser if not set or null', () => {
      const params = {
        method: 'GET', endpoint: 'test', query: { some: 'thing' }, body: { another: 'thing' },
      };
      addon.setEffectiveUser(null);
      addon.request(params);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params).toEqual(params);
    });
  });

  ['saveData', 'addTransaction', 'addInstitution'].forEach((method) => {
    describe(`.${method}(attrs)`, () => {
      it(`should call channel's \`${method}\` method with the attrs`, () => {
        const attrs = { test: 1 };
        addon[method](attrs);
        const [calledArgs] = addon.channel.call.mock.lastCall;

        expect(calledArgs.method).toBe(method);
        expect(calledArgs.params).toBe(attrs);
      });

      it('should raise an error if attrs is invalid', async () => {
        const errorMessage = method === 'saveData' ? 'Data must be an object' : 'Attrs must be an object';
        const numCalls = addon.channel.call.mock.calls.length;

        await Promise.all([1, true, false, null, [], ''].map((invalid) => (
          expect(addon[method](invalid)).rejects.toThrow(errorMessage)
        )));

        expect(addon.channel.call.mock.calls.length).toBe(numCalls);
      });
    });
  });

  [
    'editTransaction',
    'editInstitution', 'editAsset', 'editLiability',
    'deleteInstitution', 'deleteAsset', 'deleteLiability',
    'downloadDocument',
    'switchUser',
  ].forEach((method) => {
    describe(`.${method}(id)`, () => {
      it(`should call channel's \`${method}\` method with the id`, () => {
        const id = 'test';
        addon[method](id);
        const [calledArgs] = addon.channel.call.mock.lastCall;

        expect(calledArgs.method).toBe(method);
        expect(calledArgs.params).toEqual(id);
      });

      it('should raise an error if id is missing or invalid', async () => {
        const errorMessage = 'Invalid id';
        const numCalls = addon.channel.call.mock.calls.length;

        await Promise.all([1, true, false, null, undefined, [], {}, ''].map((invalid) => (
          expect(addon[method](invalid)).rejects.toThrow(errorMessage)
        )));

        expect(addon.channel.call.mock.calls.length).toBe(numCalls);
      });
    });
  });

  ['addInvestment', 'upgradePremium', 'getSharings', 'printPage'].forEach((method) => {
    describe(`.${method}()`, () => {
      it(`should call channel's \`${method}\` method`, () => {
        addon[method]();
        const [calledArgs] = addon.channel.call.mock.lastCall;

        expect(calledArgs.method).toBe(method);
      });
    });
  });

  describe('.destroy()', () => {
    it("should call channel's destroy", () => {
      addon.destroy();
      expect(addon.channel.destroy).toHaveBeenCalled();
      addon = undefined;
    });
  });
});
