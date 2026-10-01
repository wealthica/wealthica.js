import {
  describe, it, expect, beforeAll, afterAll, beforeEach, vi,
} from 'vitest';
import AddonContainer from '../../src/addon-container';

describe('AddonContainer', () => {
  let container;

  beforeAll(() => {
    // JsChannel requires JSON implementation.
    window.JSON = {
      stringify: () => {},
      parse: () => {},
    };

    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.src = 'about:blank';
    container = new AddonContainer({ iframe });
    vi.spyOn(container.channel, 'call');
    vi.spyOn(container.channel, 'destroy');
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (container) {
      container.destroy();
      container = undefined;
    }
  });

  it('should setup js-channel channel', () => {
    expect(typeof container.channel).toBe('object');
    expect(Object.keys(container.channel).sort()).toEqual(['bind', 'call', 'destroy', 'notify', 'unbind']);
  });

  describe('.trigger(eventName, eventData)', () => {
    it('should pass the event via _event through the channel', () => {
      const eventName = 'test event';
      const eventData = 'test data';
      container.trigger(eventName, eventData);
      const [calledArgs] = container.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('_event');
      expect(calledArgs.params).toEqual({
        eventName: 'test event',
        eventData: 'test data',
      });
    });

    it('should not pass undefined eventData', () => {
      const eventName = 'test event';
      container.trigger(eventName);
      const [calledArgs] = container.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('_event');
      expect(calledArgs.params).toEqual({ eventName: 'test event' });
    });
  });

  describe('.update(data)', () => {
    it('should send the updated data through the channel', () => {
      const data = { test: 'test' };
      container.update(data);
      const [calledArgs] = container.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('update');
      expect(calledArgs.params).toEqual({ test: 'test' });
    });

    it('should raise an error if data is not an object', async () => {
      const errorMessage = 'Data must be an object';
      const numCalls = container.channel.call.mock.calls.length;

      await Promise.all(['string', 1, true, false, undefined, null].map((params) => (
        expect(container.update(params)).rejects.toThrow(errorMessage)
      )));

      expect(container.channel.call.mock.calls.length).toBe(numCalls);
    });
  });

  describe('.reload()', () => {
    it('should call reload on the channel', () => {
      container.reload();
      const [calledArgs] = container.channel.call.mock.lastCall;

      expect(calledArgs.method).toBe('reload');
    });
  });

  describe('.createTxCallback(tx)', () => {
    let tx;

    beforeEach(() => {
      tx = { complete: vi.fn(), error: vi.fn() };
    });

    it('should call tx.complete on the first success invocation', () => {
      const cb = container.createTxCallback(tx);
      cb(null, 'result');

      expect(tx.complete).toHaveBeenCalledExactlyOnceWith('result');
      expect(tx.error).not.toHaveBeenCalled();
    });

    it('should call tx.error when the first arg is truthy', () => {
      const cb = container.createTxCallback(tx);
      const err = new Error('boom');
      cb(err);

      expect(tx.error).toHaveBeenCalledExactlyOnceWith(err);
      expect(tx.complete).not.toHaveBeenCalled();
    });

    it('should be a no-op on the second invocation (idempotent)', () => {
      const cb = container.createTxCallback(tx);
      cb(null, 'first');
      cb(null, 'second');

      expect(tx.complete).toHaveBeenCalledTimes(1);
      expect(tx.complete.mock.calls[0]).toEqual(['first']);
    });

    it('should ignore complete-after-error and error-after-complete', () => {
      const cbA = container.createTxCallback(tx);
      cbA(new Error('first'));
      cbA(null, 'second');
      expect(tx.error).toHaveBeenCalledTimes(1);
      expect(tx.complete).not.toHaveBeenCalled();

      const tx2 = { complete: vi.fn(), error: vi.fn() };
      const cbB = container.createTxCallback(tx2);
      cbB(null, 'first');
      cbB(new Error('second'));
      expect(tx2.complete).toHaveBeenCalledTimes(1);
      expect(tx2.error).not.toHaveBeenCalled();
    });

    it('should swallow jschannel "nonexistent message" string throws from tx.complete', () => {
      tx.complete.mockImplementation(() => { throw 'complete called for nonexistent message: 42'; }); // eslint-disable-line no-throw-literal
      const cb = container.createTxCallback(tx);

      expect(() => cb(null, 'x')).not.toThrow();
    });

    it('should swallow jschannel "nonexistent message" string throws from tx.error', () => {
      tx.error.mockImplementation(() => { throw 'error called for nonexistent message: 42'; }); // eslint-disable-line no-throw-literal
      const cb = container.createTxCallback(tx);

      expect(() => cb(new Error('boom'))).not.toThrow();
    });

    it('should propagate non-lifecycle errors from tx.complete', () => {
      tx.complete.mockImplementation(() => { throw new Error('real bug'); });
      const cb = container.createTxCallback(tx);

      expect(() => cb(null, 'x')).toThrow('real bug');
    });

    it('should propagate non-matching string throws', () => {
      tx.complete.mockImplementation(() => { throw 'something else entirely'; }); // eslint-disable-line no-throw-literal
      const cb = container.createTxCallback(tx);

      expect(() => cb(null, 'x')).toThrow();
    });
  });

  describe('.destroy()', () => {
    it("should call channel's destroy", () => {
      container.destroy();
      expect(container.channel.destroy).toHaveBeenCalled();
      container = undefined;
    });
  });
});
