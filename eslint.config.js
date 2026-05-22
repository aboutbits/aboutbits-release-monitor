import tsConfig from '@aboutbits/eslint-config/configs/ts'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  { ignores: ['node_modules/', 'dist/', 'out/'] },
  ...tsConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Ignore Bun built-in module specifiers (bun:test, bun:sqlite, etc.)
      'import/no-unresolved': ['error', { ignore: ['^bun:'] }],
      // Backend app - console logging is intentional
      'no-console': 'off',
    },
  },
])
