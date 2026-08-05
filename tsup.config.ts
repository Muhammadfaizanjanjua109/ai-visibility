import { defineConfig } from 'tsup'

export default defineConfig([
    // Main library bundle + subpath exports
    {
        entry: {
            index: 'src/index.ts',
            detector: 'src/entrypoints/detector.ts',
            schema: 'src/entrypoints/schema.ts',
            generators: 'src/entrypoints/generators.ts',
            express: 'src/entrypoints/express.ts',
            next: 'src/entrypoints/next.ts',
            // Internal-only build artifact, not part of package.json's
            // exports map — see src/entrypoints/scoring-weights-internal.ts
            'scoring-weights-internal': 'src/entrypoints/scoring-weights-internal.ts',
        },
        format: ['cjs', 'esm'],
        dts: true,
        splitting: false,
        sourcemap: true,
        clean: true,
        treeshake: true,
        external: ['express', 'fastify', 'next'],
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
