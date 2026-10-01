module.exports = {
  root: true,
  extends: ['airbnb-base'],
  ignorePatterns: ['dist/', 'node_modules/'],
  overrides: [
    {
      files: ['scripts/**', 'vite.config.*.mjs', 'vitest*.config.mjs', 'tests/**'],
      rules: {
        // Build scripts and tests import devDependencies on purpose
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
