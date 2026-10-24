/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode single` produit un unique fichier HTML autonome
// (polices et scripts inclus), utilisé pour la version jouable en ligne.
// `vite build --mode apercu` construit la page d'aperçu publiée dans /apercu/ du site (séries à venir ouvertes,
// hors ligne, sauvegarde à part) ; les moteurs de recherche ne l'indexent pas.
const noindex: Plugin = {
  name: 'apercu-noindex',
  transformIndexHtml: (html) =>
    html.replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />').replace(/<title>(.*?)<\/title>/, '<title>$1 · aperçu</title>'),
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : []), ...(mode === 'apercu' ? [noindex] : [])],
  base: './',
  build: {
    outDir: mode === 'single' ? 'dist-single' : mode === 'apercu' ? 'dist/apercu' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
  },
  test: {
    environment: 'node',
    // les tests de distribution simulent des milliers de boosters : trop lents pour 5 s sur une petite machine
    testTimeout: 30_000,
  },
}));
