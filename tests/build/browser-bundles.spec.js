import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import * as acorn from 'acorn';

const OWN = (o) => {
  const s = new Set();
  let p = o;
  while (p && p !== Object.prototype && p !== Function.prototype) {
    Object.getOwnPropertyNames(p).forEach((k) => s.add(k));
    p = Object.getPrototypeOf(p);
  }
  return [...s].filter((k) => !k.startsWith('__') && !['constructor', 'length', 'name', 'prototype', 'arguments', 'caller',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf', 'apply', 'bind', 'call'].includes(k)).sort();
};

// Contract from 1.0.11 (EventEmitter3 members included)
const EMITTER = ['addListener', 'emit', 'eventNames', 'listenerCount', 'listeners', 'off', 'on', 'once', 'removeAllListeners', 'removeListener'];
const ADDON_PROTO = [...EMITTER, 'addGroupPopup', 'addInstitution', 'addInvestment', 'addManualAccount', 'addManualInstitution',
  'addTransaction', 'deleteAsset', 'deleteInstitution', 'deleteLiability', 'destroy', 'downloadDocument', 'downloadFile', 'editAsset',
  'editInstitution', 'editLiability', 'editTransaction', 'getSharings', 'printPage', 'request', 'saveData', 'setEffectiveUser',
  'setLoadingStatus', 'switchUser', 'toastError', 'toastSuccess', 'toastWarning', 'upgradePremium'].sort();
const CONTAINER_PROTO = [...EMITTER, 'createTxCallback', 'destroy', 'reload', 'trigger', 'update'].sort();
const STATIC = ['EventEmitter', 'prefixed'];

const load = (file) => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://example.test/' });
  dom.window.eval(readFileSync(file, 'utf8'));
  return dom.window;
};

describe.each([
  ['dist/addon.js', 'Addon', ADDON_PROTO],
  ['dist/addon.min.js', 'Addon', ADDON_PROTO],
  ['dist/addon-container.js', 'AddonContainer', CONTAINER_PROTO],
  ['dist/addon-container.min.js', 'AddonContainer', CONTAINER_PROTO],
])('%s', (file, global, proto) => {
  it(`defines window.${global} as the class with the 1.0.11 API`, () => {
    const window = load(file);
    const Klass = window[global];
    expect(typeof Klass).toBe('function');
    expect(OWN(Klass)).toEqual(STATIC);
    expect(OWN(Klass.prototype)).toEqual(proto);
  });

  it('is a plain browser script (no CommonJS leftovers) within the target', () => {
    const src = readFileSync(file, 'utf8');
    expect(() => acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' })).not.toThrow();

    // Inlined CommonJS deps keep `module`/`exports` as locals of the bundler's wrapper, so check
    // that the script never reaches for the globals instead of grepping the text
    const touched = [];
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      runScripts: 'outside-only', url: 'https://example.test/',
    });
    ['require', 'module', 'exports'].forEach((k) => {
      Object.defineProperty(dom.window, k, {
        get() { touched.push(k); return undefined; },
        configurable: true,
      });
    });
    dom.window.eval(src);
    expect(touched).toEqual([]);
  });
});

it('minified bundles stay in the 1.0.11 size class (lodash not inlined whole)', () => {
  expect(statSync('dist/addon.min.js').size).toBeLessThan(80_000); // 1.0.11: 55 004
  expect(statSync('dist/addon-container.min.js').size).toBeLessThan(70_000); // 1.0.11: 46 398
});

it('Addon installs the iframe-resizer height calculation on load', () => {
  const window = load('dist/addon.js');
  expect(typeof window.iFrameResizer.heightCalculationMethod).toBe('function');
});
