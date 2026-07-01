import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    test: {
        environment: 'node',
        include: ['**/*.test.ts'],
        exclude: ['node_modules/**', '.next/**'],
        env: {
            CHECKURL_TRUSTED_IP_HEADER: 'x-vercel-forwarded-for'
        },
        coverage: {
            provider: 'v8',
            include: ['src/core/checkurl/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.d.ts'],
            thresholds: {
                statements: 85,
                lines: 85,
                functions: 70,
                branches: 68
            }
        }
    }
});
