"use client";

import type { CronJobWithStatus } from "../shared/types";
import { CronJobItem } from "./CronJobItem";

interface CronJobsListProps {
  cronJobs: CronJobWithStatus[];
  onRunCron: (cronId: string) => void;
}

export function CronJobsList({ cronJobs, onRunCron }: CronJobsListProps) {
  return (
    <div className="pc-jobs-list">
      <div className="pc-jobs-list__header">
        <div className="pc-jobs-list__header-content">
          <h2 className="pc-jobs-list__title">Cron Jobs</h2>
          <p className="pc-jobs-list__subtitle">Test your cron jobs locally</p>
        </div>
        <div className="pc-jobs-list__count">
          {cronJobs.length} {cronJobs.length === 1 ? "job" : "jobs"}
        </div>
      </div>

      <div className="pc-jobs-list__content">
        <p className="pc-jobs-list__note">
          All scheduled times use the UTC timezone.
        </p>

        <div className="pc-jobs-list__items">
          {cronJobs.map((job) => (
            <CronJobItem key={job.id} job={job} onRunCron={onRunCron} />
          ))}
        </div>
      </div>
    </div>
  );
}
