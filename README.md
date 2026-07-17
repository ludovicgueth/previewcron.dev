# Preview Cron

Trigger & test your Vercel cron jobs. Vercel only runs them in production —
this project lets you test them anywhere, two ways:

## Local development → `npx previewcron`

Run it in your project — no install, no setup:

```bash
npx previewcron
```

It reads your `vercel.json`, detects `CRON_SECRET` and
`VERCEL_AUTOMATION_BYPASS_SECRET`, and opens a dashboard to trigger each cron
against your dev server. Works with any framework. See the
[CLI documentation](./packages/previewcron/README.md).

## Preview deployments → [previewcron.dev](https://previewcron.dev)

1. Paste your `vercel.json`
2. Enter your preview URL (e.g. `https://my-app-abc123.vercel.app`)
3. Add your Vercel bypass token if the preview has Deployment Protection
4. Click "Run" on any cron job

Nothing is stored: your configuration and tokens stay in your browser's
memory and disappear when you close the tab.

## Why two ways?

The web app cannot reach `localhost` (browser security); the CLI runs on your
machine, so it can. Same dashboard, same experience.

## Development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

**License:** MIT
