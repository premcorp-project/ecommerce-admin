import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
        },
    },
    css: {
        postcss: {
            plugins: [],
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
        css: false,
    },
});
