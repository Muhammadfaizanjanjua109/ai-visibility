<template>
  <div>
    <h1>My Nuxt App</h1>
  </div>
</template>

<script setup lang="ts">
import { SchemaBuilder } from 'ai-visibility/schema'

// useHead is auto-imported by Nuxt (backed by @unhead/vue). This runs on
// the server for the initial render, so the schema is present in the HTML
// response — no client-only caveat here, unlike a pure SPA.
const schema = SchemaBuilder.website({
  name: 'My Nuxt App',
  url: 'https://example.com',
  searchAction: {
    urlTemplate: 'https://example.com/search?q={search_term_string}',
  },
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(schema),
    },
  ],
})
</script>
