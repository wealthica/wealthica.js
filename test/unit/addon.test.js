import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const { expect } = chai;

import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import Addon from '../../src/addon';

describe('Addon', () => {
  let addon;

  before(() => {
    // JsChannel requires JSON implementation while JSDOM does not provide one.
    window.JSON = {
      stringify: () => {},
      parse: () => {}
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
      let params = { method: 'GET', endpoint: 'test', query: { some: 'thing' }, body: { another: 'thing' } };
      addon.request(params);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params).to.deep.equal(params);
    });

    it('should raise an error if params is not an object', () => {
      let errorMessage = 'Params must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, undefined, null, []].forEach((params) => {
        expect(addon.request(params)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should raise an error if method or endpoint is missing or invalid', () => {
      let errorMessage = 'Invalid method or endpoint';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.request({ method: invalid, endpoint: 'test' }))
          .to.eventually.be.rejectedWith(errorMessage);
        expect(addon.request({ method: 'test', endpoint: invalid }))
          .to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should raise an error if query is not an object', () => {
      let errorMessage = 'Query must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, null, []].forEach((query) => {
        expect(addon.request({ method: 'GET', endpoint: 'test', query: query }))
          .to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should still proceed if query is not provided', () => {
      let validParams = { method: 'GET', endpoint: 'test', query: undefined };
      addon.request(validParams);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params).to.deep.equal(validParams);
    });

    it('should raise an error if body is not an object', () => {
      let errorMessage = 'Body must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, null, []].forEach((body) => {
        expect(addon.request({ method: 'GET', endpoint: 'test', body: body }))
          .to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should still proceed if body is not provided', () => {
      let validParams = { method: 'GET', endpoint: 'test', body: undefined };
      addon.request(validParams);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params).to.deep.equal(validParams);
    });
  });

  describe('.saveData(data)', () => {
    it("should call channel's `saveData` method with the encoded data", () => {
      let data = { test: 1 };
      addon.saveData(data);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('saveData');
      expect(calledArgs.params).to.equal(data);
    });

    it('should raise an error if data is invalid', () => {
      let errorMessage = 'Data must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], ''].forEach((invalid) => {
        expect(addon.saveData(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.addTransaction(attrs)', () => {
    it("should call channel's `addTransaction` method with the attrs", () => {
      let attrs = { test: 1 };
      addon.addTransaction(attrs);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('addTransaction');
      expect(calledArgs.params).to.equal(attrs);
    });

    it('should raise an error if attrs is invalid', () => {
      let errorMessage = 'Attrs must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, [], ''].forEach((invalid) => {
        expect(addon.addTransaction(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.editTransaction(id)', () => {
    it("should call channel's `editTransaction` method with the id", () => {
      let id = 'test';
      addon.editTransaction(id);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('editTransaction');
      expect(calledArgs.params).to.deep.equal(id);
    });

    it('should raise an error if id is missing or invalid', () => {
      let errorMessage = 'Invalid id';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.editTransaction(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.addInstitution(attrs)', () => {
    it("should call channel's `addInstitution` method with the attrs", () => {
      let attrs = { test: 1 };
      addon.addInstitution(attrs);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('addInstitution');
      expect(calledArgs.params).to.equal(attrs);
    });

    it('should raise an error if attrs is invalid', () => {
      let errorMessage = 'Attrs must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, [], ''].forEach((invalid) => {
        expect(addon.addInstitution(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.downloadDocument(id)', () => {
    it("should call channel's `downloadDocument` method with the id", () => {
      let id = 'test';
      addon.downloadDocument(id);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('downloadDocument');
      expect(calledArgs.params).to.deep.equal(id);
    });

    it('should raise an error if id is missing or invalid', () => {
      let errorMessage = 'Invalid id';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.downloadDocument(invalid)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.destroy()', () => {
    it("should call channel's destroy", () => {
      addon.destroy();
      let spyCall = addon.channel.destroy.lastCall;
      addon = undefined;

      expect(spyCall).to.exist;
    });
  });
})
