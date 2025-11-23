"use client";

import { useState, useEffect } from "react";
import type { CronJobWithStatus } from "../types";
import { parseCronSchedule } from "../utils/cronParser";

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

  return (
    <div className="group relative flex items-start justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {job.path}
          </div>
          {job.status === "success" && (
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          )}
          {job.status === "error" && (
            <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
          )}
          {job.status === "loading" && (
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs dark:bg-zinc-800">
            {job.schedule}
          </span>
          <span className="text-zinc-400 dark:text-zinc-600">•</span>
          <span>{parseCronSchedule(job.schedule)}</span>
        </div>
        {job.lastRun && (
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            <span>Last run: {job.lastRun.toLocaleString()}</span>
            {formattedDuration && (
              <>
                <span className="text-zinc-400 dark:text-zinc-600">•</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono ${
                    job.status === "loading"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {formattedDuration}
                </span>
              </>
            )}
            {job.statusCode && (
              <span
                className={`rounded px-1.5 py-0.5 font-mono ${
                  job.statusCode >= 200 && job.statusCode < 300
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {job.statusCode}
              </span>
            )}
          </div>
        )}
        {job.response && (
          <div
            className={`mt-3 max-h-48 max-w-2xl overflow-auto rounded-md border p-3 text-xs font-mono whitespace-pre-wrap break-words ${
              job.status === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {job.response}
          </div>
        )}
      </div>

      <button
        onClick={() => onRunCron(job.id)}
        disabled={job.status === "loading"}
        className="ml-4 flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        {job.status === "loading" ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
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
