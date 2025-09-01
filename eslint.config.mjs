import tsBaseConfig from '@map-colonies/eslint-config/ts-base';
import jestConfig from '@map-colonies/eslint-config/jest';
import { config } from '@map-colonies/eslint-config/helpers';

export default [
  {
    ignores: ['devScripts/index.ts'],
  },
  ...config(jestConfig, tsBaseConfig),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
  },
];
