import { defineConfig } from 'tsup';

export default defineConfig([
  // Client components bundle (with "use client")
  {
    entry: {
      client: 'src/client.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    outExtension: () => ({ js: '.js' }),
    external: ['react', 'react-dom', 'next'],
    banner: {
      js: '"use client";',
    },
    esbuildOptions(options) {
      options.banner = {
        js: '"use client";',
      };
    },
  },
  // Main export (re-exports client)
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    outExtension: () => ({ js: '.js' }),
    external: ['react', 'react-dom', 'next'],
    esbuildPlugins: [
      {
        name: 'make-client-external',
        setup(build) {
          // Mark ./client imports as external and resolve to ./client.js
          build.onResolve({ filter: /^\.\/client$/ }, () => ({
            path: './client.js',
            external: true,
          }));
        },
      },
    ],
  },
  // Page export bundle (Server Component - no "use client")
  {
    entry: {
      'page-export': 'src/page-export.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    outExtension: () => ({ js: '.js' }),
    external: ['react', 'react-dom', 'next'],
    esbuildPlugins: [
      {
        name: 'make-client-external',
        setup(build) {
          // Mark ./client imports as external and resolve to ./client.js
          build.onResolve({ filter: /^\.\/client$/ }, () => ({
            path: './client.js',
            external: true,
          }));
        },
      },
    ],
  },
  // Pure server utilities (no "use client")
  {
    entry: {
      'server/index': 'src/server/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    outExtension: () => ({ js: '.js' }),
    external: ['react', 'react-dom', 'next'],
  },
]);
