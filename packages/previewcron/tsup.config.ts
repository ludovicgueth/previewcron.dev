import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI server (Node, executable) — bundles its own dependencies
  {
    entry: {
      'cli/index': 'src/cli/index.ts',
    },
    format: ['esm'],
    platform: 'node',
    target: 'node18',
    dts: false,
    sourcemap: false,
    clean: true,
    outExtension: () => ({ js: '.mjs' }),
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  // CLI browser dashboard (vanilla, self-contained IIFE for <script>)
  {
    entry: {
      'cli/browser': 'src/cli/browser.ts',
    },
    format: ['iife'],
    platform: 'browser',
    target: 'es2020',
    dts: false,
    sourcemap: false,
    minify: true,
    outExtension: () => ({ js: '.js' }),
  },
]);
