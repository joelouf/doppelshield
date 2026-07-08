import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**']
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    next.configs['core-web-vitals'],
    {
        plugins: { 'react-hooks': reactHooks },
        rules: reactHooks.configs.recommended.rules
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: {
            globals: {
                process: 'readonly',
                console: 'readonly',
                module: 'writable',
                require: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                Buffer: 'readonly'
            }
        }
    },
    {
        rules: {
            'no-empty': ['error', { allowEmptyCatch: true }]
        }
    },
    eslintConfigPrettier
);
