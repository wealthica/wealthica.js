import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// `serve` is spawned through node with its JS entry, not through node_modules/.bin:
// the .bin shim is a shell script on Windows and cannot be fork()ed there.
export default async function setup() {
  const serveMain = require.resolve('serve/build/main.js');
  const server = spawn(process.execPath, [serveMain, '.', '-p', '9898', '-n'], { stdio: 'ignore' });

  const deadline = Date.now() + 15000;
  /* eslint-disable no-await-in-loop -- polling until the server answers */
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch('http://localhost:9898/tests/integration/addon-container.html');
      if (res.ok || res.status === 301) break;
    } catch (e) { /* not up yet */ }
    if (Date.now() > deadline) throw new Error('static server did not start on :9898');
    await new Promise((r) => { setTimeout(r, 250); });
  }

  return () => { server.kill('SIGTERM'); };
}
