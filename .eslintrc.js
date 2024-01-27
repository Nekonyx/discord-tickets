module.exports = {
  rules: {
    'no-useless-assign/no-useless-assign': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'linebreak-style': ['error', 'windows'],
    'perfectionist/sort-interfaces': 'warn',
    'perfectionist/sort-classes': 'off',
    'no-duplicate-imports': 'error',
    'one-var': ['warn', 'never'],
    quotes: ['off', 'single'],
    semi: ['error', 'never'],
    indent: ['off', 2],
    curly: 'warn'
  },
  overrides: [
    {
      parserOptions: {
        sourceType: 'module'
      },
      env: {
        node: true
      },
      files: ['.eslintrc.{js,cjs}']
    }
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:perfectionist/recommended-line-length'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'perfectionist', 'no-useless-assign'],
  env: {
    browser: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser'
}
