// chalk v5+ is ESM-only; the CLI bundle is CJS, so every command loads it
// via a dynamic import instead of a static one.
export async function getChalk() {
    const { default: chalk } = await import('chalk')
    return chalk
}

export type Chalk = Awaited<ReturnType<typeof getChalk>>
