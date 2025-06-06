import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://beadfanatic.co.uk',
  output: 'hybrid',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    }
  }),
  integrations: [
    tailwind({
      applyBaseStyles: false
    }), 
    mdx(), 
    sitemap()
  ],
  vite: {
    define: {
      __DATE__: `'${new Date().toISOString()}'`
    }
  },
  image: {
    domains: ['beadfanatic.co.uk']
  }
});