/* global window */
import Channel from 'js-channel';
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
      'addInvestment',
      'editInstitution',
      'editAsset',
      'editLiability',
      'deleteInstitution',
      'deleteAsset',
      'deleteLiability',
      'downloadDocument',
      'upgradePremium',
      'getSharings',
      'switchUser',
    ].forEach((event) => {
      this.channel.bind(event, (tx, data) => {
        const eventName = event;
        const eventData = data;

        tx.delayReturn(true);

        const callback = (err, result) => {
          if (err) return tx.error(err);

          return tx.complete(result);
        };

        this.emit(eventName, eventData || callback, eventData ? callback : undefined);
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
}

module.exports = AddonContainer;
