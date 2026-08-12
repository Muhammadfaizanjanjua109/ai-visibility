// ============================================================
// Prompt Discovery (v0.7.0)
// Template-based generation of realistic AI-search prompts for a
// brand/category — no AI call needed to produce the prompts themselves.
// ============================================================

import type { DiscoveryConfig, PromptCluster } from '../types'
import { inferVerb } from './verb-map'

const MAX_COMPARISON_PROMPTS = 10

function discoveryPrompts(category: string, year: number): string[] {
    return [
        `best ${category} in ${year}`,
        `top ${category} tools`,
        `what is the best ${category}`,
        `${category} recommendations`,
        `most popular ${category}`,
    ]
}

/** Up to `MAX_COMPARISON_PROMPTS`, filled competitor-by-competitor (not template-by-template) so a cut-off favors breadth across competitors. */
function comparisonPrompts(brand: string, competitors: string[]): string[] {
    const prompts: string[] = []
    for (const competitor of competitors) {
        prompts.push(
            `${brand} vs ${competitor}`,
            `${competitor} alternatives`,
            `is ${brand} better than ${competitor}`,
            `${brand} or ${competitor} which is better`
        )
    }
    return prompts.slice(0, MAX_COMPARISON_PROMPTS)
}

function commercialPrompts(category: string): string[] {
    return [
        `cheapest ${category}`,
        `${category} for small business`,
        `${category} pricing comparison`,
        `free ${category} tools`,
        `best value ${category}`,
    ]
}

/** Falls back to two generic, verb-free prompts when `category` has no verb-map entry, so the cluster always returns 5 prompts. */
function problemPrompts(category: string): string[] {
    const verb = inferVerb(category)
    const verbPrompts = verb ? [`how to ${verb}`, `best way to ${verb}`] : [`how to get started with ${category}`, `why you need a ${category}`]

    return [...verbPrompts, `${category} for beginners`, `how to choose a ${category}`, `what to look for in a ${category}`]
}

function recommendationPrompts(category: string): string[] {
    return [`recommend a ${category}`, `what ${category} do you recommend`, `suggest a good ${category}`]
}

export class PromptDiscovery {
    discover(config: DiscoveryConfig): PromptCluster[] {
        const { brand, category } = config
        const competitors = config.competitors ?? []
        const year = new Date().getFullYear()

        const clusters: PromptCluster[] = [{ type: 'discovery', prompts: discoveryPrompts(category, year) }]

        // Omitted entirely (not emitted with an empty prompts[]) when there's nothing to compare against.
        if (competitors.length > 0) {
            clusters.push({ type: 'comparison', prompts: comparisonPrompts(brand, competitors) })
        }

        clusters.push(
            { type: 'commercial', prompts: commercialPrompts(category) },
            { type: 'problem', prompts: problemPrompts(category) },
            { type: 'recommendation', prompts: recommendationPrompts(category) }
        )

        return clusters
    }
}
