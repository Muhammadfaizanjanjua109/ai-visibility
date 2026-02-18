import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', 'examples/', 'src/cli/'],
        },
        include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    },
})
