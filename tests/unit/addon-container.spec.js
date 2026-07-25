import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import sinon from 'sinon';
import AddonContainer from '../../src/addon-container';

chai.use(chaiAsPromised);
const { expect } = chai;

describe('AddonContainer', () => {
  let container;

  before(() => {
    // JsChannel requires JSON implementation.
    window.JSON = {
      stringify: () => {},
      parse: () => {},
    };

    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.src = 'about:blank';
    container = new AddonContainer({ iframe });
    sinon.spy(container.channel, 'call');
    sinon.spy(container.channel, 'destroy');
  });

  after(() => {
    if (container) {
      container.destroy();
      container = undefined;
    }
  });

  it('should setup js-channel channel', () => {
    expect(container.channel).to.be.an('object');
    expect(container.channel).to.have.all.keys('bind', 'unbind', 'notify', 'call', 'destroy');
  });

  describe('.trigger(eventName, eventData)', () => {
    it('should pass the event via _event through the channel', () => {
      const eventName = 'test event';
      const eventData = 'test data';
      container.trigger(eventName, eventData);
      const spyCall = container.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('_event');
      expect(calledArgs.params).to.deep.equal({
        eventName: 'test event',
        eventData: 'test data',
      });
    });

    it('should not pass undefined eventData', () => {
      const eventName = 'test event';
      container.trigger(eventName);
      const spyCall = container.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('_event');
      expect(calledArgs.params).to.deep.equal({ eventName: 'test event' });
    });
  });

  describe('.update(data)', () => {
    it('should send the updated data through the channel', () => {
      const data = { test: 'test' };
      container.update(data);
      const spyCall = container.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('update');
      expect(calledArgs.params).to.deep.equal({ test: 'test' });
    });

    it('should raise an error if data is not an object', () => {
      const errorMessage = 'Data must be an object';
      const numCalls = container.channel.call.getCalls().length;

      ['string', 1, true, false, undefined, null].forEach((params) => {
        expect(container.update(params)).to.eventually.be.rejectedWith(errorMessage);
      });

      expect(container.channel.call.getCalls().length).to.equal(numCalls);
    });
  });

  describe('.reload()', () => {
    it('should call reload on the channel', () => {
      container.reload();
      const spyCall = container.channel.call.lastCall;
      const calledArgs = spyCall.args[0];

      expect(calledArgs.method).to.equal('reload');
    });
  });

  describe('.createTxCallback(tx)', () => {
    let tx;

    beforeEach(() => {
      tx = { complete: sinon.stub(), error: sinon.stub() };
    });

    it('should call tx.complete on the first success invocation', () => {
      const cb = container.createTxCallback(tx);
      cb(null, 'result');

      expect(tx.complete.calledOnceWithExactly('result')).to.equal(true);
      expect(tx.error.notCalled).to.equal(true);
    });

    it('should call tx.error when the first arg is truthy', () => {
      const cb = container.createTxCallback(tx);
      const err = new Error('boom');
      cb(err);

      expect(tx.error.calledOnceWithExactly(err)).to.equal(true);
      expect(tx.complete.notCalled).to.equal(true);
    });

    it('should be a no-op on the second invocation (idempotent)', () => {
      const cb = container.createTxCallback(tx);
      cb(null, 'first');
      cb(null, 'second');

      expect(tx.complete.calledOnce).to.equal(true);
      expect(tx.complete.firstCall.args).to.deep.equal(['first']);
    });

    it('should ignore complete-after-error and error-after-complete', () => {
      const cbA = container.createTxCallback(tx);
      cbA(new Error('first'));
      cbA(null, 'second');
      expect(tx.error.calledOnce).to.equal(true);
      expect(tx.complete.notCalled).to.equal(true);

      const tx2 = { complete: sinon.stub(), error: sinon.stub() };
      const cbB = container.createTxCallback(tx2);
      cbB(null, 'first');
      cbB(new Error('second'));
      expect(tx2.complete.calledOnce).to.equal(true);
      expect(tx2.error.notCalled).to.equal(true);
    });

    it('should swallow jschannel "nonexistent message" string throws from tx.complete', () => {
      tx.complete.callsFake(() => { throw 'complete called for nonexistent message: 42'; }); // eslint-disable-line no-throw-literal
      const cb = container.createTxCallback(tx);

      expect(() => cb(null, 'x')).to.not.throw();
    });

    it('should swallow jschannel "nonexistent message" string throws from tx.error', () => {
      tx.error.callsFake(() => { throw 'error called for nonexistent message: 42'; }); // eslint-disable-line no-throw-literal
      const cb = container.createTxCallback(tx);

      expect(() => cb(new Error('boom'))).to.not.throw();
    });

    it('should propagate non-lifecycle errors from tx.complete', () => {
      tx.complete.throws(new Error('real bug'));
      const cb = container.createTxCallback(tx);

      expect(() => cb(null, 'x')).to.throw('real bug');
    });

    it('should propagate non-matching string throws', () => {
      tx.complete.callsFake(() => { throw 'something else entirely'; }); // eslint-disable-line no-throw-literal
      const cb = container.createTxCallback(tx);

      expect(() => cb(null, 'x')).to.throw();
    });
  });

  describe('.destroy()', () => {
    it("should call channel's destroy", () => {
      container.destroy();
      const spyCall = container.channel.destroy.lastCall;
      container = undefined;

      expect(spyCall).to.exist;
    });
  });
});
