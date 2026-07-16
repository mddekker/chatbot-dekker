import js from '@eslint/js'
import globals from 'globals'

// Bewust minimaal: vooral no-undef (vangt vergeten imports) en echte fouten.
export default [
  { ignores: ['dist', 'node_modules', 'supabase'] },
  {
    files: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Componenten in JSX worden zonder react-plugin niet als 'gebruikt' gezien.
      'no-unused-vars': 'off',
    },
  },
]
