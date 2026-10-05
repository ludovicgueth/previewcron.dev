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
    clean: true,
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
    minify: true,
    outExtension: () => ({ js: '.js' }),
  },
]);
