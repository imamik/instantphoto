import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React Hooks (enforces rules-of-hooks + exhaustive-deps)
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Prettier (must be last – disables conflicting formatting rules)
  prettierRecommended,

  // Per-project tweaks
  {
    rules: {
      // TypeScript handles unused vars via noUnusedLocals/noUnusedParameters
      '@typescript-eslint/no-unused-vars': 'off',
      // Allow explicit `any` with a warning (e.g. in GL helper casts)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Global ignores
  {
    ignores: ['dist/**', 'storybook-static/**', 'node_modules/**', 'coverage/**'],
  },
)
