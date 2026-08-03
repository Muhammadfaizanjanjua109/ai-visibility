import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'

// @unhead/vue v3: createHead comes from the '/client' subpath. The legacy
// root-level createHead (still exported for migration) is deprecated and
// will be removed in @unhead/vue v4.
const app = createApp(App)
app.use(createHead())
app.mount('#app')
