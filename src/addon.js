import Channel from 'js-channel';
import EventEmitter from 'eventemitter3';
import { Promise } from 'es6-promise';
import { iframeResizerContentWindow } from 'iframe-resizer';
import * as _ from 'lodash';

import iframeResizerOptions from './iframe-resizer-options';

window.iFrameResizer = iframeResizerOptions;

class Addon extends EventEmitter {
  constructor(options={}) {
    super();

    let self = this;
    self.options = options;

    self.channel = Channel.build({
      window: options.window || window.parent,
      origin: '*',
      scope: options.scope || 'default',
      postMessageObserver (origin, message) {
        self.emit('postMessage', origin, message);
      },
      gotMessageObserver (origin, message) {
        self.emit('gotMessage', origin, message);
      },
    });

    for (let event of ['init', 'update', 'reload', '_event']) {
      self.channel.bind(event, (tx, data) => {
        let eventName = event, eventData = data;

        if (event === '_event') {
          eventName = data.eventName;
          eventData = data.eventData;
        }
        self.emit(eventName, eventData);

        return 'success';
      })
    }
  }

  request(params) {
    let self = this;
    if (!_.isPlainObject(params)) throw new Error('Params must be an object');

    let method, endpoint, query;
    ({ method, endpoint, query } = params);

    if (!method || !endpoint || !_.isString(method) || !_.isString(endpoint))
      throw new Error('Invalid method or endpoint');
    if (!_.isUndefined(query) && !_.isPlainObject(query)) throw new Error('Query must be an object');

    return new Promise((resolve, reject) => {
      self.channel.call({
        method: 'request',
        params: params,
        success (response) { resolve(response) },
        error (err) { reject(err) }
      });
    });
  }

  saveData(data) {
    let self = this;
    if (!_.isPlainObject(data)) throw new Error('Data must be an object');

    return new Promise((resolve, reject) => {
      self.channel.call({
        method: 'saveData',
        params: data,
        success () { resolve() },
        error (err) { reject(err) }
      });
    });
  }

  editTransaction(options={}) {
    let self = this;

    if (!_.isPlainObject(options)) throw new Error('Options must be an object');
    if (!options.id || !_.isString(options.id)) throw new Error('Invalid id');

    return new Promise((resolve, reject) => {
      self.channel.call({
        method: 'editTransaction',
        params: options,
        success (transaction) { resolve(transaction) },
        error (err) { reject(err) }
      });
    });
  }

  destroy() {
    this.channel.destroy();
  }
}

export default Addon;
