import Channel from 'js-channel';
import EventEmitter from 'eventemitter3';
import { Promise } from 'es6-promise';
import { iframeResizer } from 'iframe-resizer';
import * as _ from 'lodash';

class AddonContainer extends EventEmitter {
  constructor (options={}) {
    super();

    let self = this;
    self.options = options;

    if (!options.iframe) throw new Error('Iframe not defined');

    // Init iframe resizer. This will receive size changes from the addons
    // and resize the iframe accordingly
    iframeResizer({
      checkOrigin: true,
      heightCalculationMethod: window.ieVersion <= 10 ? 'max' : 'lowestElement',
      resizeFrom: 'child',
      resizedCallback (data) {
        self.emit('iframeResized', data);
      },
    }, options.iframe);

    // Create js channel
    self.channel = Channel.build({
      window: options.iframe.contentWindow,
      origin: options.origin || '*',
      scope: options.id || options.iframe.contentWindow.location.origin,
      postMessageObserver (origin, message) {
        self.emit('postMessage', origin, message);
      },
      gotMessageObserver (origin, message) {
        self.emit('gotMessage', origin, message);
      },
    });

    for (let event of ['saveData', 'request', 'editTransaction']) {
      self.channel.bind(event, (tx, data) => {
        let eventName = event, eventData = data;

        tx.delayReturn(true);

        let callback = (err, result) => {
          if (err) return tx.error(err);

          tx.complete(result);
        }

        self.emit(eventName, eventData, callback);
      });
    }

    self.channel.call({
      method: 'init',
      params: options.options,
      success (result) {
        self.emit('init', result);
      }
    });
  }

  trigger (eventName, eventData) {
    let self = this;
    let params = { eventName: eventName };
    if (eventData) params.eventData = eventData;

    return new Promise((resolve, reject) => {
      self.channel.call({
        method: '_event',
        params: params,
        success: resolve,
        error: reject
      });
    });
  }

  update (data) {
    let self = this;
    if (!_.isObject(data)) throw new Error('Data must be an object');

    return new Promise((resolve, reject) => {
      self.channel.call({
        method: 'update',
        params: data,
        success: resolve,
        error: reject
      });
    });
  }

  reload () {
    let self = this;

    return new Promise((resolve, reject) => {
      self.channel.call({
        method: 'reload',
        success: resolve,
        error: reject
      });
    });
  }

  destroy () {
    this.channel.destroy();
  }
}

module.exports = AddonContainer;
