import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('robots.txt', 'routes/robots-txt.ts'),
  route('llms.txt', 'routes/llms-txt.ts'),
] satisfies RouteConfig
