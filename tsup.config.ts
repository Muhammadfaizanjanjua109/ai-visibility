import { defineConfig } from 'tsup'

export default defineConfig([
    // Main library bundle
    {
        entry: {
            index: 'src/index.ts',
        },
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: true,
        treeshake: true,
        external: ['express', 'fastify'],
    },
    // CLI bundle (separate to avoid conflicts)
    {
        entry: {
            'cli/index': 'src/cli/index.ts',
        },
        format: ['cjs'],
        dts: false,
        splitting: false,
        sourcemap: false,
        clean: false,  // Don't clean, preserve main bundle
        treeshake: true,
        external: ['express', 'fastify'],
    },
])
