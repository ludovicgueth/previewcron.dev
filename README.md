# Preview Cron

Test and trigger Vercel cron jobs on preview deployments and local environments.

**Why?** Vercel only runs cron jobs in production. This tool lets you test them easily.

## Usage

1. Paste your `vercel.json` content
2. Enter your preview URL (or use localhost:3000)
3. Click "Run" to trigger any cron job

## Testing Localhost from previewcron.dev

If using the deployed app at [previewcron.dev](https://previewcron.dev) to test your **localhost**, add this to your app's `next.config.ts`:

```typescript
async headers() {
  // Only enable CORS in development (disabled in production)
  if (process.env.NODE_ENV !== 'development') {
    return [];
  }

  return [
    {
      source: '/api/cron/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://previewcron.dev' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
      ],
    },
  ];
}
```

**This is safe** - CORS headers are automatically removed in production.

Alternatively, run Preview Cron locally (`npm run dev`) to avoid CORS entirely.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

**License:** MIT
