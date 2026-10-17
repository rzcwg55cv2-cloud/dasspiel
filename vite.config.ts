/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { serviceWorker } from './build/service-worker-plugin';

export default defineConfig({
  // Relative Pfade: Die App läuft so unter jeder Adresse,
  // z. B. lokal unter / und auf GitHub Pages unter /dasspiel/.
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
  build: {
    // Alles in einem Bundle, damit nach der Installation nichts nachgeladen werden muss.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
