import { defineConfig } from 'vite';

// ES + CJS builds for bundlers and Node. Runtime dependencies stay external: they are
// declared in package.json `dependencies`, so the consumer installs them once and a Vue CLI /
// Vite consumer never ends up with two copies of eventemitter3 or a whole lodash.
export default defineConfig({
  build: {
    emptyOutDir: false,
    target: 'es2020',
    minify: false,
    lib: {
      entry: './src/index.js',
      name: 'Wealthica',
      fileName: 'wealthica',
    },
    rollupOptions: {
      external: [
        '@wealthica/js-channel',
        'eventemitter3',
        'es6-promise',
        'iframe-resizer',
        /^lodash(\/.*)?$/,
      ],
      output: [
        { format: 'es', dir: 'dist', entryFileNames: 'wealthica.es.js' },
        { format: 'cjs', dir: 'dist', entryFileNames: 'wealthica.cjs.js', exports: 'named' },
      ],
    },
  },
});
