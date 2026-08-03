# React Router (framework mode) Integration Example

Verified against React Router 8.3 (`create-react-router` scaffold), React
19.2, `ai-visibility` 0.3.1.

React Router in framework mode (the Remix successor) has a real Node
server, so this is a full integration. The same pattern — root
loader for request-level detection, resource routes returning a plain
`Response` for `robots.txt`/`llms.txt`, JSON-LD rendered in `Layout` — is
representative of Express+React SSR, Astro (React islands with a server
adapter), and TanStack Start too: all of them give you a request object
server-side and a place to return a `Response`, which is all
`ai-visibility/detector` and `/generators` need.

## Files

```
app/
  root.tsx              # root loader detects bots; JSON-LD in Layout's <head>
  routes.ts             # registers the two resource routes below
  routes/robots-txt.ts  # loader returns a plain Response — no component
  routes/llms-txt.ts    # same, for llms.txt
```

## Setup

```bash
npx create-react-router@latest my-app
cd my-app
npm install ai-visibility
# copy the files above in
npm run build
npm start
```

## Verifying it

```bash
curl http://localhost:3000/robots.txt
curl http://localhost:3000/llms.txt
curl http://localhost:3000/ | grep -F 'application/ld+json'
```

## A build/serve gotcha unrelated to ai-visibility

If you see `TypeError: dispatcher.getOwner is not a function` when serving
the production build, it's a React dev/prod build mismatch in the server
bundle, not an `ai-visibility` issue — set `NODE_ENV=production` explicitly
for **both** the build and the serve step:

```bash
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

We hit this while verifying this exact example and it went away immediately
once `NODE_ENV` was set for both steps.

## Related docs

- [Framework Integration Guide](../../docs/framework-integration.md)
- [API Reference](../../docs/api-reference.md)
