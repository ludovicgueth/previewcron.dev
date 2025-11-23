# Preview Cron

Test and trigger Vercel cron jobs on preview deployments and local environments.

**Why?** Vercel only runs cron jobs in production. This tool lets you test them easily.

## Usage

1. Paste your `vercel.json` content
2. Enter your preview URL (or use localhost:3000)
3. Click "Run" to trigger any cron job

## Testing Localhost from previewcron.dev

**Important:** To test your localhost API endpoints from previewcron.dev, you need to enable CORS in your app.

**Use middleware.ts** (recommended) - This is the reliable way to enable CORS for API routes. `next.config.ts` headers() doesn't work reliably for API routes in Next.js.

Create a `middleware.ts` file in your app's root directory:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only enable CORS in development (disabled in production)
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  const allowedOrigin = "https://previewcron.dev";

  // Handle CORS preflight (OPTIONS request)
  if (request.method === "OPTIONS") {
    if (origin === allowedOrigin) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    return new NextResponse(null, { status: 204 });
  }

  // Handle actual request (GET, etc.)
  const response = NextResponse.next();
  if (origin === allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  return response;
}

export const config = {
  matcher: "/api/cron/:path*",
};
```

**Why middleware instead of `next.config.ts`?**

- `next.config.ts` headers() doesn't work reliably for API routes in Next.js
- Middleware has access to the request object, allowing dynamic origin checking
- Middleware properly handles OPTIONS preflight requests

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
