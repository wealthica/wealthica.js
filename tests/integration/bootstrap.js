import puppeteer from 'puppeteer';
import { expect } from 'chai';
import { fork } from 'child_process';
import _ from 'lodash';

const globalVariables = _.pick(global, ['browser', 'expect', 'server', 'url']);

// puppeteer options
const opts = {
  headless: true,
  slowMo: 100,
  timeout: 10000,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
};

// expose variables
before(async () => {
  global.expect = expect;
  global.server = fork('node_modules/.bin/serve', ['.', '-p', '9898'], {
    stdio: 'ignore',
  });
  global.server.unref();
  global.url = 'http://localhost:9898/tests/integration/addon-container.html';
  global.browser = await puppeteer.launch(opts);
});

// close browser and reset global variables
after(async () => {
  server.kill('SIGTERM');
  await browser.close();

  global.browser = globalVariables.browser;
  global.expect = globalVariables.expect;
  global.server = globalVariables.server;
  global.url = globalVariables.url;
});
