"use client";

import type { CronJobWithStatus } from "../types";
import { CronJobItem } from "./CronJobItem";

interface CronJobsListProps {
  cronJobs: CronJobWithStatus[];
  onRunCron: (cronId: string) => void;
}

export function CronJobsList({ cronJobs, onRunCron }: CronJobsListProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-6 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Cron Jobs
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Easily monitor and manage your cron jobs.
            </p>
          </div>
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {cronJobs.length} {cronJobs.length === 1 ? "job" : "jobs"}
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          All scheduled times use the UTC timezone.
        </p>

        <div className="space-y-3">
          {cronJobs.map((job) => (
            <CronJobItem key={job.id} job={job} onRunCron={onRunCron} />
          ))}
        </div>
      </div>
    </div>
  );
}
