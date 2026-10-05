// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://jaroncollis.com',
  // /thesis (the film) is unfinished and marked noindex: keep it out of the sitemap too
  integrations: [sitemap({ filter: (page) => !page.includes('/thesis') })]
});