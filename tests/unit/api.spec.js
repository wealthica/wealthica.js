import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import Addon from '../../src/addon';

describe('API', () => {
  let addon;

  before(() => {
    // JsChannel requires JSON implementation while JSDOM does not provide one.
    window.JSON = {
      stringify: () => {},
      parse: () => {},
    };

    addon = new Addon({ window: new JSDOM().window });
    sinon.spy(addon.channel, 'call');
  });

  after(() => {
    if (addon) {
      addon.destroy();
      addon = undefined;
    }
  });

  describe('.getAssets(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getAssets(query);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('assets');
      expect(calledArgs.params.query).to.equal(query);
      expect(calledArgs.params.method).to.equal('GET');
    });
  });

  describe('.getCurrencies(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getCurrencies(query);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('currencies');
      expect(calledArgs.params.query).to.equal(query);
      expect(calledArgs.params.method).to.equal('GET');
    });
  });

  describe('.getInstitutions(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getInstitutions(query);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('institutions');
      expect(calledArgs.params.query).to.equal(query);
      expect(calledArgs.params.method).to.equal('GET');
    });
  });

  describe('.getInstitution(id)', () => {
    it('should execute request', () => {
      addon.api.getInstitution('test');
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('institutions/test');
      expect(calledArgs.params.method).to.equal('GET');
    });
  });

  describe('.pollInstitution(id, v)', () => {
    it('should execute request', () => {
      addon.api.pollInstitution('test', 1);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('institutions/test/poll?v=1');
      expect(calledArgs.params.method).to.equal('GET');
    });
  });

  describe('.syncInstitution(id)', () => {
    it('should execute request', () => {
      addon.api.syncInstitution('test');
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('institutions/test/sync');
      expect(calledArgs.params.method).to.equal('POST');
    });
  });

  describe('.addInstitution(data)', () => {
    it('should execute request', () => {
      const data = { some: 'thing' };
      addon.api.addInstitution(data);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('institutions');
      expect(calledArgs.params.body).to.equal(data);
      expect(calledArgs.params.method).to.equal('POST');
    });
  });

  describe('.getLiabilities(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getLiabilities(query);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('liabilities');
      expect(calledArgs.params.query).to.equal(query);
    });
  });

  describe('.getPositions(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getPositions(query);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('positions');
      expect(calledArgs.params.query).to.equal(query);
    });
  });

  describe('.getTransactions(query)', () => {
    it('should execute request', () => {
      const query = { some: 'thing' };
      addon.api.getTransactions(query);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('transactions');
      expect(calledArgs.params.query).to.equal(query);
    });
  });

  describe('.updateTransaction(id, attrs)', () => {
    it('should execute request', () => {
      const attrs = { some: 'thing' };
      addon.api.updateTransaction('test', attrs);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params.endpoint).to.equal('transactions/test');
      expect(calledArgs.params.body).to.equal(attrs);
    });
  });
});
