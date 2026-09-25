import { build } from 'vite';

// Four IIFE bundles for <script> consumers. Same file names as 1.x, same globals
// (`Addon` / `AddonContainer` are the classes themselves, `exports: 'default'`).
// Dependencies are inlined. Target is Vite's default (baseline-widely-available).
const bundles = [
  { entry: './src/addon.js', name: 'Addon', file: 'addon.js', minify: false },
  { entry: './src/addon.js', name: 'Addon', file: 'addon.min.js', minify: true },
  { entry: './src/addon-container.js', name: 'AddonContainer', file: 'addon-container.js', minify: false },
  { entry: './src/addon-container.js', name: 'AddonContainer', file: 'addon-container.min.js', minify: true },
];

for (const { entry, name, file, minify } of bundles) {
  // eslint-disable-next-line no-await-in-loop
  await build({
    configFile: false,
    logLevel: 'warn',
    build: {
      emptyOutDir: false,
      minify,
      sourcemap: minify,
      lib: { entry, name, formats: ['iife'], fileName: () => file },
      rollupOptions: { output: { exports: 'default', dir: 'dist' } },
    },
  });
  console.log(`built dist/${file}`);
}
