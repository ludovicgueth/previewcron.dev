"use client";

import { useState, useRef, useEffect } from "react";
import type { CronJobWithStatus, VercelCron } from "../shared/types";
import { CronJobsList } from "./CronJobsList";

interface CronDashboardProps {
  crons: VercelCron[];
  baseUrl: string;
}

export function CronDashboard({ crons, baseUrl }: CronDashboardProps) {
  const [cronJobs, setCronJobs] = useState<CronJobWithStatus[]>(() =>
    crons.map((cron, index) => ({
      ...cron,
      id: `${cron.path}-${index}`,
      status: "idle" as const,
    }))
  );
  const [authHeader, setAuthHeader] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleRunCron = async (cronId: string) => {
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const startTime = Date.now();

    setCronJobs((prev) =>
      prev.map((job) =>
        job.id === cronId
          ? { ...job, status: "loading" as const, startTime }
          : job
      )
    );

    const job = cronJobs.find((j) => j.id === cronId);
    if (!job) return;

    try {
      const url = `${baseUrl}${job.path}`;

      // Build headers
      const headers: HeadersInit = {};
      if (authHeader.trim()) {
        headers["Authorization"] = authHeader.trim();
      }

      // Direct fetch for localhost
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers,
      });

      const statusCode = response.status;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const responseText = await response.text();

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      const duration = Date.now() - startTime;

      setCronJobs((prev) =>
        prev.map((j) =>
          j.id === cronId
            ? {
                ...j,
                status: isSuccess ? "success" : "error",
                lastRun: new Date(),
                response: isSuccess
                  ? `Success: ${responseText.substring(0, 1000)}`
                  : `Error: ${responseText.substring(0, 1000)}`,
                statusCode,
                duration,
                startTime: undefined,
              }
            : j
        )
      );
    } catch (err) {
      // Don't update state if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      const duration = Date.now() - startTime;

      setCronJobs((prev) =>
        prev.map((j) =>
          j.id === cronId
            ? {
                ...j,
                status: "error",
                lastRun: new Date(),
                response: err instanceof Error ? err.message : "Unknown error",
                duration,
                startTime: undefined,
              }
            : j
        )
      );
    } finally {
      // Clear abort controller reference
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (cronJobs.length === 0) {
    return (
      <div className="previewcron-root">
        <div className="pc-dashboard">
          <div className="pc-dashboard__content">
            <header className="pc-dashboard__header">
              <div className="pc-dashboard__header-row">
                <div>
                  <h1 className="pc-dashboard__title">Preview Cron</h1>
                  <p className="pc-dashboard__subtitle">
                    Local development cron testing via{" "}
                    <a
                      href="https://www.npmjs.com/package/previewcron"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pc-dashboard__link"
                    >
                      previewcron
                    </a>
                  </p>
                </div>
                <a
                  href="https://github.com/ludovicgueth/previewcron.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pc-dashboard__github"
                  aria-label="View on GitHub"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="pc-dashboard__github-icon"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span className="pc-dashboard__github-text">GitHub</span>
                </a>
              </div>
            </header>

            <div className="pc-dashboard__empty">
              <div className="pc-dashboard__empty-content">
                <p className="pc-dashboard__empty-title">No cron jobs found</p>
                <p className="pc-dashboard__empty-text">
                  Add cron jobs to your vercel.json file to get started
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="previewcron-root">
      <div className="pc-dashboard">
        <div className="pc-dashboard__content">
          <header className="pc-dashboard__header">
            <div className="pc-dashboard__header-row">
              <div>
                <h1 className="pc-dashboard__title">Preview Cron</h1>
                <p className="pc-dashboard__subtitle">
                  Local development cron testing via{" "}
                  <a
                    href="https://www.npmjs.com/package/previewcron"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pc-dashboard__link"
                  >
                    previewcron
                  </a>
                </p>
              </div>
              <a
                href="https://github.com/ludovicgueth/previewcron.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="pc-dashboard__github"
                aria-label="View on GitHub"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="pc-dashboard__github-icon"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span className="pc-dashboard__github-text">GitHub</span>
              </a>
            </div>
          </header>

          <div className="pc-layout">
            <div className="pc-layout__left">
              <div className="pc-auth-card">
                <h2 className="pc-auth-card__title">Configuration</h2>
                <div className="pc-auth">
                  <label htmlFor="pc-auth-input" className="pc-auth__label">
                    Authorization (optional)
                  </label>
                  <input
                    type="text"
                    id="pc-auth-input"
                    className="pc-auth__input"
                    value={authHeader}
                    onChange={(e) => setAuthHeader(e.target.value)}
                    placeholder="Bearer YOUR_TOKEN"
                  />
                </div>
              </div>
            </div>

            <div className="pc-layout__right">
              <CronJobsList cronJobs={cronJobs} onRunCron={handleRunCron} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
