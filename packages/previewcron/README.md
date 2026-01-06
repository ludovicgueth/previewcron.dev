# PreviewCron SDK

Test Vercel cron jobs locally in your Next.js development environment with a simple UI.

## Features

- Auto-reads `vercel.json` from your project
- Beautiful dashboard UI to test cron jobs
- Real-time execution status and duration tracking
- Authorization header support for protected endpoints
- Development-only (automatically disabled in production)
- Zero configuration for basic usage
- Vanilla CSS (no Tailwind required)
- TypeScript support

## Installation

```bash
npm install previewcron --save-dev
# or
bun add -d previewcron
# or
yarn add -D previewcron
```

## Quick Start

### 1. Create a page for the dashboard

You can place this anywhere in your Next.js app. Common locations:

```tsx
// app/dev/cron/page.tsx
// OR app/admin/cron-test/page.tsx

export { default } from "previewcron/page";
```

### 2. Import the styles

Add the CSS import to your layout or page:

```tsx
// app/dev/cron/layout.tsx (recommended)
import "previewcron/styles.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
```

Or import directly in your page:

```tsx
// app/dev/cron/page.tsx
import "previewcron/styles.css";
export { default } from "previewcron/page";
```

### 3. Make sure you have a `vercel.json` file

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 0 0 0"
    }
  ]
}
```

### 4. Start your dev server and visit the dashboard

```bash
npm run dev
```

Then navigate to the route you created (e.g., `http://localhost:3000/dev/cron`)

That's it! You'll see all your cron jobs listed and can test them with a single click.

## Authorization Support

The dashboard includes an optional Authorization header input. This is useful for testing cron endpoints that require authentication:

1. Enter your authorization value in the "Authorization" field (e.g., `Bearer YOUR_SECRET_TOKEN`)
2. Click "Run" on any cron job
3. The Authorization header will be included in the request

## Advanced Usage

### Custom Base URL

If your dev server runs on a different port:

```tsx
// app/dev/cron/page.tsx
import CronDevPage from "previewcron/page";

export default function Page() {
  return <CronDevPage baseUrl="http://localhost:4000" />;
}
```

### Custom vercel.json Path

If your `vercel.json` is in a different location:

```tsx
import CronDevPage from "previewcron/page";

export default function Page() {
  return <CronDevPage vercelJsonPath="./config/vercel.json" />;
}
```

### Inline Configuration

Instead of reading from a file, you can pass the config directly:

```tsx
import CronDevPage from "previewcron/page";

export default function Page() {
  return (
    <CronDevPage
      config={{
        crons: [
          {
            path: "/api/cron/test",
            schedule: "* * * * *",
          },
        ],
      }}
    />
  );
}
```

### Using Individual Components

For more control, you can use the individual components:

```tsx
"use client";

import { CronDashboard } from "previewcron/client";
import "previewcron/styles.css";
import type { VercelCron } from "previewcron";

export default function CustomCronPage() {
  const crons: VercelCron[] = [
    { path: "/api/cron/test", schedule: "0 0 * * *" },
  ];

  return <CronDashboard crons={crons} baseUrl="http://localhost:3000" />;
}
```

## API Reference

### `CronDevPage` (Default Export)

Server Component that reads vercel.json and renders the dashboard.

**Props:**

- `vercelJsonPath?: string` - Custom path to vercel.json file
- `baseUrl?: string` - Base URL for cron jobs (default: `http://localhost:3000`)
- `config?: VercelConfig` - Inline config instead of reading from file

### `CronDashboard` (Client Component)

Client Component for rendering the dashboard.

**Props:**

- `crons: VercelCron[]` - Array of cron jobs
- `baseUrl: string` - Base URL for making requests

### Server Utilities

```typescript
import { readVercelJson } from 'previewcron/server';

const result = await readVercelJson({
  path: './vercel.json', // optional
  baseUrl: 'http://localhost:3000', // optional
  config: { crons: [...] }, // optional inline config
});
```

### Shared Types

```typescript
import type { VercelCron, VercelConfig, CronJobWithStatus } from "previewcron";
```

### Utilities

```typescript
import { parseCronSchedule } from "previewcron";

const readable = parseCronSchedule("0 0 * * *"); // "At 12:00 AM"
```

## Security

This package is designed for **development use only**. The dashboard:

- Only works when `NODE_ENV === 'development'`
- Returns a 404-like page in production
- Does not include any authentication

Never expose the cron testing dashboard in production environments.

## Styling

The package includes its own vanilla CSS stylesheet that works without Tailwind or any other CSS framework. The styles:

- Use CSS custom properties for theming
- Support light and dark mode (via `prefers-color-scheme`)
- Are scoped under `.previewcron-root` to avoid conflicts
- Use the JetBrains Mono font family

Import the styles in your layout or page:

```tsx
import "previewcron/styles.css";
```

## How It Works

1. The SDK reads your `vercel.json` file (server-side)
2. Extracts all cron job definitions
3. Renders a two-column dashboard UI (configuration on left, jobs on right)
4. When you click "Run", it makes a direct fetch to your local endpoint
5. Optionally includes an Authorization header if provided
6. Displays the response, status code, and execution time

## Testing vs Production

- **Local Development (SDK)**: Test cron jobs on `localhost` with this package
- **Preview Deployments**: Use [previewcron.dev](https://previewcron.dev) to test on Vercel preview URLs
- **Production**: Cron jobs run automatically on schedule via Vercel

## Examples

### Testing a cleanup cron

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

```typescript
// app/api/cron/cleanup/route.ts
export async function GET() {
  // Your cleanup logic
  await cleanupOldData();

  return Response.json({ success: true, message: "Cleanup completed" });
}
```

Now you can test this endpoint instantly from the dashboard instead of waiting for the schedule or manually visiting the URL!

## License

MIT

## Author

Ludovic Gueth

## Links

- [GitHub](https://github.com/ludovicgueth/previewcron.dev)
- [Web App](https://previewcron.dev)
