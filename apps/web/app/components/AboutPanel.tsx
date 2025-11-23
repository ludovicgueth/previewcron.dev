export function AboutPanel() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        About
      </h2>
      <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          A developer tool designed to test and trigger cron jobs for Vercel
          deployments in non-production environments.
        </p>
        <p>
          Since Vercel only executes cron jobs in production, this tool enables
          you to:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Test cron endpoints on preview deployments</li>
          <li>Debug cron jobs in local development</li>
          <li>Manually trigger scheduled tasks for testing</li>
          <li>Monitor execution time and response status</li>
        </ul>
        <p className="pt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Perfect for developers working with Vercel cron jobs who need to test
          before deploying to production.
        </p>
        <p className="border-t border-zinc-200 pt-3 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          Privacy: All data remains in your browser. We do not store, collect,
          or transmit any configuration data, URLs, tokens, or API responses to
          any server.
        </p>
        <p className="pt-2 text-xs italic text-zinc-500 dark:text-zinc-500">
          This is an independent tool and is not affiliated with, endorsed by,
          or sponsored by Vercel Inc.
        </p>
      </div>
    </div>
  );
}
