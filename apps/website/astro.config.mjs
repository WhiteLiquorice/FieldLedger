import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://fieldledger.bridgewayapps.com',
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
});
