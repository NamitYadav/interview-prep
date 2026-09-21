import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
  },
  // scripts/ runs under Node, not in the page.
  {
    files: ['scripts/**'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // role="staff" test-harness prop on custom components is not a DOM aria-role.
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
    },
  },
);
