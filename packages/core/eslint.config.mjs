import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.base],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: ['src/domain/**'], mode: 'full' },
        { type: 'application', pattern: ['src/application/**'], mode: 'full' },
        {
          type: 'infrastructure',
          pattern: ['src/infrastructure/**'],
          mode: 'full',
        },
        {
          type: 'presentation',
          pattern: ['src/presentation/**'],
          mode: 'full',
        },
        { type: 'shared', pattern: ['src/shared/**'], mode: 'full' },
      ],
      'boundaries/ignore': ['src/index.ts', 'src/hooks.ts', 'src/__tests__/**'],
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      'boundaries/no-unknown': ['error'],
      'boundaries/no-unknown-files': ['error'],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // domain — can only import from domain
            {
              from: ['domain'],
              allow: ['domain'],
            },
            // application — can import from domain + application
            {
              from: ['application'],
              allow: ['domain', 'application'],
            },
            // infrastructure — can import from domain, application (ports), shared, infrastructure
            {
              from: ['infrastructure'],
              allow: ['domain', 'application', 'shared', 'infrastructure'],
            },
            // presentation — can import from domain, application, shared, presentation
            {
              from: ['presentation'],
              allow: ['domain', 'application', 'shared', 'presentation'],
            },
            // shared — can import from domain + shared
            {
              from: ['shared'],
              allow: ['domain', 'shared'],
            },
          ],
        },
      ],
    },
  },
);
