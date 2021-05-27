import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import Addon from '../../src/addon';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('Addon', () => {
  let addon;

  before(() => {
    // JsChannel requires JSON implementation while JSDOM does not provide one.
    window.JSON = {
      stringify: () => {},
      parse: () => {},
    };

    addon = new Addon({ window: new JSDOM().window });
    sinon.spy(addon.channel, 'call');
    sinon.spy(addon.channel, 'destroy');
  });

  after(() => {
    if (addon) {
      addon.destroy();
      addon = undefined;
    }
  });

  it('should configure heightCalculationMethod for iFrameResizer', () => {
    expect(window.iFrameResizer.heightCalculationMethod).to.exist;
  });

  it('should setup js-channel channel', () => {
    expect(addon.channel).to.be.an('object');
    expect(addon.channel).to.have.all.keys('bind', 'unbind', 'notify', 'call', 'destroy');
  });

  describe('.request(params)', () => {
    it("should call channel's `request` method with the right params", () => {
      const params = {
        method: 'GET', endpoint: 'test', query: { some: 'thing' }, body: { another: 'thing' },
      };
      addon.request(params);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params).to.deep.equal(params);
    });

    it('should raise an error if params is not an object', () => {
      const errorMessage = 'Params must be an object';
      const numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, undefined, null, []].forEach((params) => {
        expect(addon.request(params)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should raise an error if method or endpoint is missing or invalid', () => {
      const errorMessage = 'Invalid method or endpoint';
      const numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.request({ method: invalid, endpoint: 'test' }))
          .to.eventually.be.rejectedWith(errorMessage);
        expect(addon.request({ method: 'test', endpoint: invalid }))
          .to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should raise an error if query is not an object', () => {
      const errorMessage = 'Query must be an object';
      const numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, null, []].forEach((query) => {
        expect(addon.request({ method: 'GET', endpoint: 'test', query }))
          .to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should still proceed if query is not provided', () => {
      const validParams = { method: 'GET', endpoint: 'test', query: undefined };
      addon.request(validParams);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params).to.deep.equal(validParams);
    });

    it('should raise an error if body is not an object', () => {
      const errorMessage = 'Body must be an object';
      const numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, null, []].forEach((body) => {
        expect(addon.request({ method: 'GET', endpoint: 'test', body }))
          .to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should still proceed if body is not provided', () => {
      const validParams = { method: 'GET', endpoint: 'test', body: undefined };
      addon.request(validParams);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params).to.deep.equal(validParams);
    });
  });

  describe('.saveData(data)', () => {
    it("should call channel's `saveData` method with the encoded data", () => {
      const data = { test: 1 };
      addon.saveData(data);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('saveData');
      expect(calledArgs.params).to.equal(data);
    });

    it('should raise an error if data is invalid', () => {
      const errorMessage = 'Data must be an object';
      const numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], ''].forEach((invalid) => {
        expect(addon.saveData(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.addTransaction(attrs)', () => {
    it("should call channel's `addTransaction` method with the attrs", () => {
      const attrs = { test: 1 };
      addon.addTransaction(attrs);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('addTransaction');
      expect(calledArgs.params).to.equal(attrs);
    });

    it('should raise an error if attrs is invalid', () => {
      const errorMessage = 'Attrs must be an object';
      const numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, [], ''].forEach((invalid) => {
        expect(addon.addTransaction(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.editTransaction(id)', () => {
    it("should call channel's `editTransaction` method with the id", () => {
      const id = 'test';
      addon.editTransaction(id);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('editTransaction');
      expect(calledArgs.params).to.deep.equal(id);
    });

    it('should raise an error if id is missing or invalid', () => {
      const errorMessage = 'Invalid id';
      const numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.editTransaction(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.addInstitution(attrs)', () => {
    it("should call channel's `addInstitution` method with the attrs", () => {
      const attrs = { test: 1 };
      addon.addInstitution(attrs);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('addInstitution');
      expect(calledArgs.params).to.equal(attrs);
    });

    it('should raise an error if attrs is invalid', () => {
      const errorMessage = 'Attrs must be an object';
      const numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, [], ''].forEach((invalid) => {
        expect(addon.addInstitution(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.addInvestment()', () => {
    it("should call channel's `addInvestment` method", () => {
      addon.addInvestment();
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('addInvestment');
    });
  });

  describe('.downloadDocument(id)', () => {
    it("should call channel's `downloadDocument` method with the id", () => {
      const id = 'test';
      addon.downloadDocument(id);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('downloadDocument');
      expect(calledArgs.params).to.deep.equal(id);
    });

    it('should raise an error if id is missing or invalid', () => {
      const errorMessage = 'Invalid id';
      const numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.downloadDocument(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.upgradePremium()', () => {
    it("should call channel's `upgradePremium` method", () => {
      addon.upgradePremium();
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('upgradePremium');
    });
  });

  describe('.getSharings()', () => {
    it("should call channel's `getSharings` method", () => {
      addon.getSharings();
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('getSharings');
    });
  });

  describe('.switchUser(id)', () => {
    it("should call channel's `switchUser` method with the id", () => {
      const id = 'test';
      addon.switchUser(id);
      const spyCall = addon.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('switchUser');
      expect(calledArgs.params).to.deep.equal(id);
    });

    it('should raise an error if id is missing or invalid', () => {
      const errorMessage = 'Invalid id';
      const numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.switchUser(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.destroy()', () => {
    it("should call channel's destroy", () => {
      addon.destroy();
      const spyCall = addon.channel.destroy.lastCall;
      addon = undefined;

      expect(spyCall).to.exist;
    });
  });
});
