"use client";

import { useState, useEffect } from "react";
import type { CronJobWithStatus } from "../shared/types";
import { parseCronSchedule } from "../shared/cronParser";

interface CronJobItemProps {
  job: CronJobWithStatus;
  onRunCron: (cronId: string) => void;
}

export function CronJobItem({ job, onRunCron }: CronJobItemProps) {
  const [currentDuration, setCurrentDuration] = useState(0);

  useEffect(() => {
    if (job.status === "loading" && job.startTime) {
      const interval = setInterval(() => {
        setCurrentDuration(Date.now() - job.startTime!);
      }, 50);

      return () => clearInterval(interval);
    }
  }, [job.status, job.startTime]);

  const displayDuration =
    job.status === "loading" ? currentDuration : job.duration;
  const formattedDuration = displayDuration
    ? `${(displayDuration / 1000).toFixed(2)}s`
    : null;

  const isSuccessStatusCode = job.statusCode && job.statusCode >= 200 && job.statusCode < 300;

  return (
    <div className="pc-job-item" data-status={job.status}>
      <div className="pc-job-item__content">
        <div className="pc-job-item__path-row">
          <span className="pc-job-item__path">{job.path}</span>
          <span className="pc-job-item__status" />
        </div>

        <div className="pc-job-item__schedule-row">
          <span className="pc-job-item__schedule">{job.schedule}</span>
          <span className="pc-job-item__separator">•</span>
          <span className="pc-job-item__description">
            {parseCronSchedule(job.schedule)}
          </span>
        </div>

        {job.lastRun && (
          <div className="pc-job-item__meta">
            <span>Last run: {job.lastRun.toLocaleString()}</span>
            {formattedDuration && (
              <>
                <span className="pc-job-item__separator">•</span>
                <span className="pc-job-item__duration">{formattedDuration}</span>
              </>
            )}
            {job.statusCode && (
              <span
                className="pc-job-item__status-code"
                data-success={isSuccessStatusCode ? "true" : "false"}
              >
                {job.statusCode}
              </span>
            )}
          </div>
        )}

        {job.response && (
          <div className="pc-job-item__response" data-status={job.status}>
            {job.response}
          </div>
        )}
      </div>

      <button
        onClick={() => onRunCron(job.id)}
        disabled={job.status === "loading"}
        className="pc-job-item__button"
      >
        {job.status === "loading" ? (
          <>
            <svg
              className="pc-job-item__spinner"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="pc-job-item__spinner-track"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="pc-job-item__spinner-head"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Running
          </>
        ) : (
          "Run"
        )}
      </button>
    </div>
  );
}
