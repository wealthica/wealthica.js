import { expect } from 'chai';
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
        expect(addon.request.bind(addon, params)).to.throw(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should raise an error if method or endpoint is missing or invalid', () => {
      let errorMessage = 'Invalid method or endpoint';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.request.bind(addon, { method: invalid, endpoint: 'test' })).to.throw(errorMessage);
        expect(addon.request.bind(addon, { method: 'test', endpoint: invalid })).to.throw(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should raise an error if query is not an object', () => {
      let errorMessage = 'Query must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, null, []].forEach((query) => {
        expect(addon.request.bind(addon, { method: 'GET', endpoint: 'test', query: query })).to.throw(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should still proceed if query is not provided', () => {
      let validParams = { method: 'GET', endpoint: 'test', query: undefined };
      expect(addon.request.bind(addon, validParams)).not.to.throw();
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('request');
      expect(calledArgs.params).to.deep.equal(validParams);
    });

    it('should raise an error if body is not an object', () => {
      let errorMessage = 'Body must be an object';
      let numCalls = addon.channel.call.getCalls().length;

      ['string', 1, true, false, null, []].forEach((body) => {
        expect(addon.request.bind(addon, { method: 'GET', endpoint: 'test', body: body })).to.throw(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });

    it('should still proceed if body is not provided', () => {
      let validParams = { method: 'GET', endpoint: 'test', body: undefined };
      expect(addon.request.bind(addon, validParams)).not.to.throw();
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
        expect(addon.saveData.bind(addon, invalid)).to.throw(errorMessage);
      });

      expect(addon.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.editTransaction(options)', () => {
    it("should call channel's `editTransaction` method with the id", () => {
      let options = { id: 'test', somethingelse: 'somethingelse' };
      addon.editTransaction(options);
      let spyCall = addon.channel.call.lastCall;
      let calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('editTransaction');
      expect(calledArgs.params.id).to.deep.equal(options.id);
    });

    it('should raise an error if id is missing or invalid', () => {
      let errorMessage = 'Invalid id';
      let numCalls = addon.channel.call.getCalls().length;

      [1, true, false, null, undefined, [], {}, ''].forEach((invalid) => {
        expect(addon.editTransaction.bind(addon, { id: invalid })).to.throw(errorMessage);
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
