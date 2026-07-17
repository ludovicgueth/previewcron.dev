# previewcron

Trigger & test your Vercel cron jobs from a simple dashboard. Vercel only runs
cron jobs in production — this tool lets you test them anywhere.

## Usage

Run it in your project — no install, no setup, no files to add:

```bash
npx previewcron
```

It reads `vercel.json` from the current directory, opens a dashboard in your
browser, and lets you trigger each cron job against your local dev server
(default `http://localhost:3000`). Works with any framework that uses a
`vercel.json` — Next.js, SvelteKit, Astro, Remix, Nuxt…

Secrets are picked up automatically from your environment, `.env.local`, or
`.env`:

- `CRON_SECRET` → pre-fills the `Authorization: Bearer …` header (the same
  header Vercel sends in production)
- `VERCEL_AUTOMATION_BYPASS_SECRET` → pre-fills the
  `x-vercel-protection-bypass` header

Because the dashboard runs locally, it can hit `localhost` directly — no CORS,
no SSRF restrictions.

## Options

```bash
npx previewcron [options]

  -p, --port <number>     Port for the dashboard (default: 4747)
  -b, --base-url <url>    Target app base URL (default: http://localhost:3000)
      --vercel-json <p>   Path to vercel.json (default: ./vercel.json)
      --no-open           Do not open the browser automatically
  -v, --version           Print version
  -h, --help              Show this help
```

Your dev server runs on another port:

```bash
npx previewcron --base-url http://localhost:4000
```

Target a preview deployment (the dashboard proxies requests locally, so any
URL works — use the bypass token field if the preview has Deployment
Protection):

```bash
npx previewcron --base-url https://my-app-abc123-team.vercel.app
```

## Testing preview deployments without the CLI

Prefer a hosted UI? Use [previewcron.dev](https://previewcron.dev) — paste
your `vercel.json`, enter the preview URL, and trigger your crons from the
browser.

## Security

- The dashboard binds to `127.0.0.1` only — it is never reachable from your
  network.
- Secrets are only sent to the target you choose; nothing leaves your machine
  otherwise.

## License

MIT — [Ludovic Gueth](https://github.com/ludovicgueth)

## Links

- [GitHub](https://github.com/ludovicgueth/previewcron.dev)
- [previewcron.dev](https://previewcron.dev)
