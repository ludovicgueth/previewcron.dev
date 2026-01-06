# Preview Cron

Test and trigger Vercel cron jobs on preview deployments and local environments.

**Why?** Vercel only runs cron jobs in production. This tool lets you test them easily.

## Two Ways to Test

### 1. Preview Deployments → [previewcron.dev](https://previewcron.dev)

Use the web app to test cron jobs on **Vercel preview URLs**:

1. Go to [previewcron.dev](https://previewcron.dev)
2. Paste your `vercel.json` content
3. Enter your preview URL (e.g., `https://my-app-abc123.vercel.app`)
4. Click "Run" to trigger any cron job

### 2. Local Development → npm package

For testing on **localhost**, install the npm package:

```bash
npm install previewcron --save-dev
```

Then create a page in your Next.js app:

```tsx
// app/dev/cron/page.tsx
import "previewcron/styles.css";
export { default } from "previewcron/page";
```

Visit `http://localhost:3000/dev/cron` to test your cron jobs locally.

See the [SDK documentation](./packages/previewcron/README.md) for more options.

## Why Two Methods?

- **previewcron.dev** cannot reach `localhost` due to browser security policies
- The **npm package** runs inside your app, so it can call your local endpoints directly

## Development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

**License:** MIT
