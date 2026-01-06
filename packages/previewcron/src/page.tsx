import { readVercelJson, type ReadVercelJsonOptions } from './server/readVercelJson';
import { CronDashboard } from './client';

interface CronDevPageProps {
  /**
   * Custom path to vercel.json file
   * If not provided, will auto-detect in project root
   */
  vercelJsonPath?: string;

  /**
   * Base URL for cron jobs (defaults to http://localhost:3000)
   */
  baseUrl?: string;

  /**
   * Inline config instead of reading from file
   */
  config?: ReadVercelJsonOptions['config'];
}

/**
 * Server Component that reads vercel.json and renders the cron testing dashboard
 * Only works in development mode (NODE_ENV === 'development')
 *
 * @example
 * ```tsx
 * // app/api/cron/page.tsx or app/dev/cron/page.tsx
 * export { default } from 'previewcron'
 * ```
 *
 * @example With custom options
 * ```tsx
 * // app/api/cron/page.tsx
 * import CronDevPage from 'previewcron'
 *
 * export default function Page() {
 *   return <CronDevPage baseUrl="http://localhost:4000" />
 * }
 * ```
 */
export default async function CronDevPage({
  vercelJsonPath,
  baseUrl = 'http://localhost:3000',
  config,
}: CronDevPageProps = {}) {
  // Development-only guard
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="previewcron-root">
        <div className="pc-dashboard">
          <div className="pc-dashboard__content">
            <div className="pc-dashboard__empty">
              <div className="pc-dashboard__empty-content">
                <p className="pc-dashboard__empty-title">Not Available</p>
                <p className="pc-dashboard__empty-text">
                  Cron testing dashboard is only available in development mode.
                  Set NODE_ENV=development to access this page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Read vercel.json
  const result = await readVercelJson({
    path: vercelJsonPath,
    config,
    baseUrl,
  });

  return <CronDashboard crons={result.crons} baseUrl={result.baseUrl} />;
}
