"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { VercelConfig, CronJobWithStatus, CronPanelConfig } from "./types";
import { CronJobsList } from "./components/CronJobsList";
import { ConfigForm } from "./components/ConfigForm";
import { AboutPanel } from "./components/AboutPanel";

export default function Home() {
  const [config, setConfig] = useState<CronPanelConfig>({
    previewUrl: "",
    deployProtectionToken: "",
    customHeaders: "",
  });
  const [cronJobs, setCronJobs] = useState<CronJobWithStatus[]>([]);
  const [error, setError] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleConfigSubmit = useCallback(
    (
      vercelJson: string,
      previewUrl: string,
      token?: string,
      customHeaders?: string
    ) => {
      try {
        const parsed: VercelConfig = JSON.parse(vercelJson);

        if (!parsed.crons || parsed.crons.length === 0) {
          setError("No cron jobs found in vercel.json");
          setCronJobs([]);
          return;
        }

        const jobs: CronJobWithStatus[] = parsed.crons.map((cron, index) => ({
          ...cron,
          id: `${cron.path}-${index}`,
          status: "idle" as const,
        }));

        setCronJobs(jobs);
        setConfig({ previewUrl, deployProtectionToken: token, customHeaders });
        setError("");
      } catch {
        setError("Invalid JSON format. Please check your vercel.json");
        setCronJobs([]);
      }
    },
    []
  );

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
      const url = `${config.previewUrl}${job.path}`;
      const isLocalhost =
        url.includes("localhost") || url.includes("127.0.0.1");

      let data;
      let statusCode;

      if (isLocalhost) {
        // Direct fetch for localhost (browser can access it)
        const headers: HeadersInit = {};
        if (config.deployProtectionToken) {
          headers["x-vercel-protection-bypass"] = config.deployProtectionToken;
        }

        // Parse custom headers with validation
        if (config.customHeaders) {
          const lines = config.customHeaders.split("\n");
          lines.forEach((line) => {
            const colonIndex = line.indexOf(":");
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              const value = line.substring(colonIndex + 1).trim();
              // Validate header name
              if (key && value && /^[a-z0-9_-]+$/i.test(key)) {
                const lowerKey = key.toLowerCase();
                // Block sensitive headers
                if (
                  !["host", "connection", "content-length"].some((blocked) =>
                    lowerKey.startsWith(blocked)
                  )
                ) {
                  headers[key] = value;
                }
              }
            }
          });
        }

        const response = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        statusCode = response.status;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const responseText = await response.text();

        data = {
          success: isSuccess,
          message: isSuccess
            ? `Success: ${responseText.substring(0, 1000)}`
            : `Error: ${responseText.substring(0, 1000)}`,
          statusCode,
        };
      } else {
        // Use API proxy for external URLs (to avoid CORS)
        const headers: HeadersInit = {};
        if (config.deployProtectionToken) {
          headers["x-vercel-protection-bypass"] = config.deployProtectionToken;
        }

        // Parse custom headers with validation
        if (config.customHeaders) {
          const lines = config.customHeaders.split("\n");
          lines.forEach((line) => {
            const colonIndex = line.indexOf(":");
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              const value = line.substring(colonIndex + 1).trim();
              // Validate header name
              if (key && value && /^[a-z0-9_-]+$/i.test(key)) {
                const lowerKey = key.toLowerCase();
                // Block sensitive headers
                if (
                  !["host", "connection", "content-length"].some((blocked) =>
                    lowerKey.startsWith(blocked)
                  )
                ) {
                  headers[key] = value;
                }
              }
            }
          });
        }

        const response = await fetch("/api/trigger-cron", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, headers }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const responseData = await response.json();

        // Handle non-JSON or unexpected response format
        if (!responseData || typeof responseData !== "object") {
          throw new Error("Invalid response format from API");
        }

        data = responseData;
        statusCode = data.statusCode;
      }

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
                status: data.success ? "success" : "error",
                lastRun: new Date(),
                response: data.message,
                statusCode: statusCode,
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-full p-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Preview Cron
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Test Vercel cron jobs on preview and local environments
            </p>
          </div>
          <a
            href="https://github.com/ludovicgueth/previewcron"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="View on GitHub"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="space-y-6">
              <ConfigForm onSubmit={handleConfigSubmit} error={error} />
              <AboutPanel />
            </div>
          </div>

          <div className="lg:col-span-8">
            {cronJobs.length > 0 ? (
              <CronJobsList cronJobs={cronJobs} onRunCron={handleRunCron} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-12 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="text-center">
                  <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                    No cron jobs loaded
                  </p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Paste your vercel.json and preview URL to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
