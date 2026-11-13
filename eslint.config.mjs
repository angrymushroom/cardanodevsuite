import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ['.next/**', 'node_modules/**'],
    rules: {
      // The existing UI uses loose props; tightening them is separate from the chain migration.
      '@typescript-eslint/no-explicit-any': 'off',
      // React Compiler is not enabled in this project.
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
