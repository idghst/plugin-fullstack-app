import config from '@starter/eslint-config';
export default [
  ...config,
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];
