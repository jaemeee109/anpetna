// .eslintrc.cjs
module.exports = {
  root: true,
  extends: ['next', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname, 
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    'react/no-unescaped-entities': 'off',
    '@next/next/no-page-custom-font': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  // (선택) JS 설정 파일들은 TS 파서 대신 기본 파서로 처리
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      parser: 'espree',
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  ],
  ignorePatterns: ['node_modules/', '.next/', 'dist/'],
};
