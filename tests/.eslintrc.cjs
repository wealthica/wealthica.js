module.exports = {
  extends: ['airbnb-base'],
  parserOptions: {
    // import.meta in build checks
    ecmaVersion: 2022,
  },
  rules: {
    'no-undef': 'off',
    'no-unused-expressions': 'off',
    'no-shadow': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
};
