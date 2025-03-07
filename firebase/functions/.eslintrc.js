module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2020,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "max-len": ["error", { "code": 145 }],
    "indent": ["error", 2],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "camelcase": "off",
    "no-unused-vars": ["warn"],
    "comma-dangle": ["error", "only-multiline"],
    "new-cap": "off"
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
