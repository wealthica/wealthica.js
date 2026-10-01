import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import * as acorn from 'acorn';

const require = createRequire(import.meta.url);
const cjs = readFileSync('dist/wealthica.cjs.js', 'utf8');
const es = readFileSync('dist/wealthica.es.js', 'utf8');

const EXTERNALS = [
  '@wealthica/js-channel',
  'es6-promise',
  'eventemitter3',
  'iframe-resizer',
  'lodash/isObject',
  'lodash/isPlainObject',
  'lodash/isString',
  'lodash/isUndefined',
];

describe('dist/wealthica.cjs.js', () => {
  it('keeps runtime dependencies external', () => {
    const required = [...cjs.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]).sort();
    expect(required).toEqual(EXTERNALS);
    expect(cjs).not.toMatch(/lodash\.js v4/); // whole lodash would carry its banner
  });

  it('exports both classes as named exports and installs iFrameResizer', () => {
    // The bundle touches window at import time (iframe-resizer), so give it a DOM
    const { window } = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/' });
    Object.assign(globalThis, { window, document: window.document, location: window.location });
    // Node 22 defines a getter-only global navigator
    Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
    // eslint-disable-next-line import/extensions, import/no-unresolved -- built by `yarn build`
    const lib = require('../../dist/wealthica.cjs.js');
    expect(typeof lib.Addon).toBe('function');
    expect(typeof lib.AddonContainer).toBe('function');
    expect(lib.default).toBeUndefined();
    expect(typeof window.iFrameResizer.heightCalculationMethod).toBe('function');
  });
});

describe('dist/wealthica.es.js', () => {
  it('keeps runtime dependencies external, including the side-effect import', () => {
    const imported = [...es.matchAll(/from "([^"]+)"|import "([^"]+)"/g)].map((m) => m[1] || m[2]).sort();
    expect(imported).toEqual(EXTERNALS);
    // The side-effect import is merged into the named one; either form executes iframe-resizer
    expect(es).toMatch(/(import|from) "iframe-resizer"/);
    expect(es).toMatch(/export \{[^}]*\bAddon\b[^}]*\bAddonContainer\b[^}]*\}/);
  });
});

// Vue CLI 4 / webpack 4 resolve `module` (the ES build) and parse it with acorn 6: no `?.` / `??`
describe.each([
  ['dist/wealthica.es.js', es, 'module'],
  ['dist/wealthica.cjs.js', cjs, 'script'],
])('%s', (file, src, sourceType) => {
  it('parses as ES2019 for webpack 4 consumers', () => {
    expect(() => acorn.parse(src, { ecmaVersion: 2019, sourceType })).not.toThrow();
  });
});
