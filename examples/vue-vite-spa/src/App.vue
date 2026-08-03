<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { SchemaBuilder } from 'ai-visibility/schema'

// IMPORTANT: this only reaches crawlers that execute JavaScript. A pure
// client SPA's initial HTML response has nothing for anyone else — the
// build-time injection in vite.config.ts (transformIndexHtml) is what
// makes the WebSite schema visible to non-JS-executing crawlers too.
// Reach for useHead() specifically for schema that's genuinely dynamic
// per client-side route (e.g. a product page fetched after navigation).
const productSchema = SchemaBuilder.product({
  name: 'Example Product',
  price: 29,
  currency: 'USD',
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(productSchema),
    },
  ],
})
</script>

<template>
  <h1>My Vue App</h1>
</template>
