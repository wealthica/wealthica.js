import {
  describe, it, expect, beforeAll, afterAll, vi,
} from 'vitest';
import { JSDOM } from 'jsdom';
import Addon from '../../src/addon';

describe('API', () => {
  let addon;

  beforeAll(() => {
    // JsChannel requires JSON implementation while JSDOM does not provide one.
    window.JSON = {
      stringify: () => {},
      parse: () => {},
    };

    addon = new Addon({ window: new JSDOM().window });
    vi.spyOn(addon.channel, 'call');
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (addon) {
      addon.destroy();
      addon = undefined;
    }
  });

  describe('.getAssets(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getAssets(query);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('assets');
      expect(calledArgs.params.query).toBe(query);
      expect(calledArgs.params.method).toBe('GET');
    });
  });

  describe('.getCurrencies(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getCurrencies(query);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('currencies');
      expect(calledArgs.params.query).toBe(query);
      expect(calledArgs.params.method).toBe('GET');
    });
  });

  describe('.getInstitutions(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getInstitutions(query);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('institutions');
      expect(calledArgs.params.query).toBe(query);
      expect(calledArgs.params.method).toBe('GET');
    });
  });

  describe('.getInstitution(id)', () => {
    it('should execute request', () => {
      addon.api.getInstitution('test');
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('institutions/test');
      expect(calledArgs.params.method).toBe('GET');
    });
  });

  describe('.pollInstitution(id, v)', () => {
    it('should execute request', () => {
      addon.api.pollInstitution('test', 1);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('institutions/test/poll?v=1');
      expect(calledArgs.params.method).toBe('GET');
    });
  });

  describe('.syncInstitution(id)', () => {
    it('should execute request', () => {
      addon.api.syncInstitution('test');
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('institutions/test/sync');
      expect(calledArgs.params.method).toBe('POST');
    });
  });

  describe('.addInstitution(data)', () => {
    it('should execute request', () => {
      const data = { some: 'thing' };
      addon.api.addInstitution(data);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('institutions');
      expect(calledArgs.params.body).toBe(data);
      expect(calledArgs.params.method).toBe('POST');
    });
  });

  describe('.getLiabilities(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getLiabilities(query);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('liabilities');
      expect(calledArgs.params.query).toBe(query);
    });
  });

  describe('.getPositions(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getPositions(query);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('positions');
      expect(calledArgs.params.query).toBe(query);
    });
  });

  describe('.getTransactions(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getTransactions(query);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('transactions');
      expect(calledArgs.params.query).toBe(query);
    });
  });

  describe('.updateTransaction(id, attrs)', () => {
    it('should execute request', () => {
      const attrs = { some: 'thing' };
      addon.api.updateTransaction('test', attrs);
      const [calledArgs] = addon.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('request');
      expect(calledArgs.params.endpoint).toBe('transactions/test');
      expect(calledArgs.params.body).toBe(attrs);
    });
  });
});
