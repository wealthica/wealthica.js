/* global window */
import Channel from '@wealthica/js-channel';
import EventEmitter from 'eventemitter3';
import { Promise } from 'es6-promise';
import { iframeResizer } from 'iframe-resizer';
import * as _ from 'lodash';

class AddonContainer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = options;

    if (!options.iframe) throw new Error('Iframe not defined');

    // Init iframe resizer. This will receive size changes from the addons
    // and resize the iframe accordingly
    iframeResizer({
      checkOrigin: true,
      heightCalculationMethod: window.ieVersion <= 10 ? 'max' : 'lowestElement',
      resizeFrom: 'child',
      resizedCallback: (data) => {
        this.emit('iframeResized', data);
      },
    }, options.iframe);

    // Create js channel
    this.channel = Channel.build({
      window: options.iframe.contentWindow,
      origin: options.origin || '*',
      scope: options.id || options.iframe.contentWindow.location.origin,
      postMessageObserver: (origin, message) => {
        this.emit('postMessage', origin, message);
      },
      gotMessageObserver: (origin, message) => {
        this.emit('gotMessage', origin, message);
      },
    });

    [
      'saveData',
      'request',
      'addTransaction',
      'editTransaction',
      'addInstitution',
      'addManualInstitution',
      'addManualAccount',
      'addInvestment',
      'editInstitution',
      'editAsset',
      'editLiability',
      'deleteInstitution',
      'deleteAsset',
      'deleteLiability',
      'downloadDocument',
      'downloadFile',
      'upgradePremium',
      'getSharings',
      'switchUser',
      'printPage',
      'toastSuccess',
      'toastError',
      'toastWarning',
      'setLoadingStatus',
      'addGroupPopup',
    ].forEach((event) => {
      this.channel.bind(event, (tx, data) => {
        const eventName = event;
        const eventData = data;

        tx.delayReturn(true);

        const callback = this.createTxCallback(tx);

        if (['setLoadingStatus', 'upgradePremium'].includes(event)) {
          this.emit(
            eventName,
            eventData !== undefined ? eventData : callback,
            eventData !== undefined ? callback : undefined,
          );
        } else {
          this.emit(eventName, eventData || callback, eventData ? callback : undefined);
        }
      });
    });

    this.channel.call({
      method: 'init',
      params: options.options,
      success: (result) => {
        this.emit('init', result);
      },
    });
  }

  trigger(eventName, eventData) {
    const params = { eventName };
    if (eventData) params.eventData = eventData;

    return new Promise((resolve, reject) => {
      this.channel.call({
        method: '_event',
        params,
        success: resolve,
        error: reject,
      });
    });
  }

  update(data) {
    return new Promise((resolve, reject) => {
      if (!_.isObject(data)) throw new Error('Data must be an object');

      this.channel.call({
        method: 'update',
        params: data,
        success: resolve,
        error: reject,
      });
    });
  }

  reload() {
    return new Promise((resolve, reject) => {
      this.channel.call({
        method: 'reload',
        success: resolve,
        error: reject,
      });
    });
  }

  destroy() {
    this.channel.destroy();
  }

  // Build the (err, result) callback handed to each registered host handler.
  // jschannel removes the transaction entry from its inbound table on the first
  // tx.complete()/tx.error() call and throws strings like
  // "complete called for nonexistent message: <id>" on any subsequent call.
  // The same throw happens when the channel has been destroyed (e.g. the host
  // navigated between addons) before an in-flight async handler finishes. We
  // can't dictate how host apps wire up their handlers, so make the callback
  // itself idempotent and swallow those lifecycle throws — they aren't
  // actionable bugs. Real exceptions from tx.error/tx.complete still propagate.
  // eslint-disable-next-line class-methods-use-this
  createTxCallback(tx) {
    let invoked = false;
    return (err, result) => {
      if (invoked) return undefined;
      invoked = true;
      try {
        if (err) return tx.error(err);
        return tx.complete(result);
      } catch (e) {
        if (typeof e === 'string' && /nonexistent message/.test(e)) {
          return undefined;
        }
        throw e;
      }
    };
  }
}

module.exports = AddonContainer;
