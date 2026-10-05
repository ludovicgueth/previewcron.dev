/**
 * Browser dashboard for the `previewcron` CLI.
 * Triggers go through the CLI's local proxy (`POST /api/trigger`), which looks
 * the cron up by index, so the page never chooses the URL that gets called.
 */
import { parseCronSchedule } from "../cronParser";
import type { VercelCron } from "../types";

interface Job extends VercelCron {
  status: "idle" | "loading" | "success" | "error";
  lastRun?: Date;
  response?: string;
  statusCode?: number;
  duration?: number;
}

interface TriggerResult {
  ok: boolean;
  status?: number;
  body?: string;
  durationMs: number;
  error?: string;
}

declare global {
  interface Window {
    __PREVIEWCRON__: { crons: VercelCron[]; baseUrl: string; authHeader: string; bypassToken: string };
  }
}

const data = window.__PREVIEWCRON__;
const jobs: Job[] = data.crons.map((cron) => ({ ...cron, status: "idle" }));

const GITHUB_ICON =
  '<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />';

const SPINNER =
  '<svg class="pc-job-item__spinner" fill="none" viewBox="0 0 24 24"><circle class="pc-job-item__spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="pc-job-item__spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>';

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function jobItemHtml(job: Job, index: number): string {
  const isLoading = job.status === "loading";
  // Loading renders "0.00s" so the live timer has an element to write into.
  const duration = isLoading ? "0.00s" : job.duration != null ? `${(job.duration / 1000).toFixed(2)}s` : null;

  const meta =
    isLoading || job.lastRun
      ? `<div class="pc-job-item__meta">
        <span>${isLoading ? "Running…" : `Last run: ${escapeHtml(job.lastRun?.toLocaleString() ?? "")}`}</span>
        ${duration != null ? `<span class="pc-job-item__separator">•</span><span class="pc-job-item__duration" data-role="duration">${duration}</span>` : ""}
        ${job.statusCode != null ? `<span class="pc-job-item__status-code" data-success="${job.status === "success"}">${job.statusCode}</span>` : ""}
      </div>`
      : "";

  const response = job.response
    ? `<div class="pc-job-item__response" data-status="${job.status}">${escapeHtml(job.response)}</div>`
    : "";

  return `<div class="pc-job-item" data-status="${job.status}" data-id="${index}">
    <div class="pc-job-item__content">
      <div class="pc-job-item__path-row">
        <span class="pc-job-item__path">${escapeHtml(job.path)}</span>
        <span class="pc-job-item__status"></span>
      </div>
      <div class="pc-job-item__schedule-row">
        <span class="pc-job-item__schedule">${escapeHtml(job.schedule)}</span>
        <span class="pc-job-item__separator">•</span>
        <span class="pc-job-item__description">${escapeHtml(parseCronSchedule(job.schedule))}</span>
      </div>
      ${meta}
      ${response}
    </div>
    ${isLoading ? `<button class="pc-job-item__button" data-role="run" disabled>${SPINNER}Running</button>` : `<button class="pc-job-item__button" data-role="run">Run</button>`}
  </div>`;
}

function pageHtml(body: string): string {
  return `<div class="previewcron-root"><div class="pc-dashboard"><div class="pc-dashboard__content">
    <header class="pc-dashboard__header">
      <div class="pc-dashboard__header-row">
        <div>
          <h1 class="pc-dashboard__title">Preview Cron</h1>
          <p class="pc-dashboard__subtitle">
            Trigger &amp; test your Vercel cron jobs locally or on preview deployments
          </p>
        </div>
        <a href="https://github.com/ludovicgueth/previewcron.dev" target="_blank" rel="noopener noreferrer" class="pc-dashboard__github" aria-label="View on GitHub">
          <svg viewBox="0 0 24 24" class="pc-dashboard__github-icon" fill="currentColor" aria-hidden="true">${GITHUB_ICON}</svg>
          <span class="pc-dashboard__github-text">GitHub</span>
        </a>
      </div>
    </header>
    ${body}
  </div></div></div>`;
}

const EMPTY = `<div class="pc-dashboard__empty"><div class="pc-dashboard__empty-content">
  <p class="pc-dashboard__empty-title">No cron jobs found</p>
  <p class="pc-dashboard__empty-text">Add cron jobs to vercel.json, vercel.ts or vercel.toml to get started</p>
</div></div>`;

function dashboardHtml(): string {
  return `<div class="pc-layout">
    <div class="pc-layout__left">
      <div class="pc-auth-card">
        <h2 class="pc-auth-card__title">Configuration</h2>
        <div class="pc-auth">
          <label for="pc-auth-input" class="pc-auth__label">Authorization (optional)</label>
          <input type="text" id="pc-auth-input" class="pc-auth__input" placeholder="Bearer YOUR_TOKEN" value="${escapeHtml(data.authHeader)}" />
        </div>
        <div class="pc-auth">
          <label for="pc-bypass-input" class="pc-auth__label">Vercel bypass token (optional)</label>
          <input type="text" id="pc-bypass-input" class="pc-auth__input" placeholder="x-vercel-protection-bypass" value="${escapeHtml(data.bypassToken)}" />
        </div>
        <p class="pc-auth__hint">Target: <code>${escapeHtml(data.baseUrl)}</code></p>
      </div>
    </div>
    <div class="pc-layout__right">
      <div class="pc-jobs-list">
        <div class="pc-jobs-list__header">
          <div class="pc-jobs-list__header-content">
            <h2 class="pc-jobs-list__title">Cron Jobs</h2>
            <p class="pc-jobs-list__subtitle">Test your cron jobs locally</p>
          </div>
          <div class="pc-jobs-list__count">${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}</div>
        </div>
        <div class="pc-jobs-list__content">
          <p class="pc-jobs-list__note">All scheduled times use the UTC timezone.</p>
          <div class="pc-jobs-list__items">${jobs.map(jobItemHtml).join("")}</div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderItem(index: number): void {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = jobItemHtml(jobs[index], index);
  const next = wrapper.firstElementChild;
  if (next) document.querySelector(`.pc-job-item[data-id="${index}"]`)?.replaceWith(next);
}

function inputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement).value;
}

async function runJob(index: number): Promise<void> {
  const job = jobs[index];
  Object.assign(job, { status: "loading", response: undefined, statusCode: undefined, duration: undefined } satisfies Partial<Job>);
  renderItem(index);

  const startTime = Date.now();
  const timer = setInterval(() => {
    const el = document.querySelector(`.pc-job-item[data-id="${index}"] [data-role="duration"]`);
    if (el) el.textContent = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
  }, 50);

  try {
    const res = await fetch("/api/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        index,
        path: job.path,
        schedule: job.schedule,
        authHeader: inputValue("pc-auth-input"),
        bypassToken: inputValue("pc-bypass-input"),
      }),
    });
    const result: TriggerResult = await res.json();
    job.duration = result.durationMs;
    job.lastRun = new Date();
    if (result.error) {
      job.status = "error";
      job.response = result.error;
    } else {
      job.statusCode = result.status;
      job.status = result.ok ? "success" : "error";
      job.response = `${result.ok ? "Success" : "Error"}: ${(result.body ?? "").substring(0, 1000)}`;
    }
  } catch (err) {
    job.status = "error";
    job.response = err instanceof Error ? err.message : "Unknown error";
  } finally {
    clearInterval(timer);
    renderItem(index);
  }
}

const root = document.getElementById("root");
if (root) {
  root.innerHTML = pageHtml(jobs.length === 0 ? EMPTY : dashboardHtml());
  root.addEventListener("click", (event) => {
    const item = (event.target as HTMLElement).closest('[data-role="run"]')?.closest(".pc-job-item");
    const index = Number(item?.getAttribute("data-id"));
    if (jobs[index] && jobs[index].status !== "loading") void runJob(index);
  });
}
