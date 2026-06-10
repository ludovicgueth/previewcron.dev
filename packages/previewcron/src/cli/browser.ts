/**
 * Standalone browser dashboard for the `previewcron` CLI.
 *
 * Reuses the shared cron parser and the `previewcron` CSS, reproducing the
 * exact same DOM class names as the React components so the look is identical.
 * Triggers run through the CLI's local proxy (`POST /api/trigger`) to avoid
 * cross-origin issues when the dashboard (e.g. :4747) hits the app (e.g. :3000).
 */
import { parseCronSchedule } from "../shared/cronParser";

type Status = "idle" | "loading" | "success" | "error";

interface Job {
  path: string;
  schedule: string;
  id: string;
  status: Status;
  lastRun?: Date;
  response?: string;
  statusCode?: number;
  duration?: number;
  startTime?: number;
}

interface InitialData {
  crons: { path: string; schedule: string }[];
  baseUrl: string;
  authHeader: string;
  source: "file" | "inline";
  filePath?: string;
}

interface TriggerResult {
  ok: boolean;
  status?: number;
  statusText?: string;
  body?: string;
  durationMs: number;
  error?: string;
}

declare global {
  interface Window {
    __PREVIEWCRON__: InitialData;
  }
}

const data = window.__PREVIEWCRON__;

const GITHUB_ICON =
  '<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />';

const SPINNER =
  '<svg class="pc-job-item__spinner" fill="none" viewBox="0 0 24 24"><circle class="pc-job-item__spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="pc-job-item__spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const jobs: Job[] = data.crons.map((cron, index) => ({
  ...cron,
  id: `${cron.path}-${index}`,
  status: "idle",
}));

// Live duration timers keyed by job id.
const timers = new Map<string, ReturnType<typeof setInterval>>();

let authHeader = data.authHeader || "";

function headerHtml(): string {
  return `
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
    </header>`;
}

function jobItemHtml(job: Job): string {
  const description = escapeHtml(parseCronSchedule(job.schedule));
  const isSuccessCode = job.statusCode != null && job.statusCode >= 200 && job.statusCode < 300;

  const isLoading = job.status === "loading";
  // Render the duration span while loading too, so the live timer interval has
  // an element to write into (it ticks from startTime until the run completes).
  const durationText = isLoading
    ? "0.00s"
    : job.duration != null
      ? `${(job.duration / 1000).toFixed(2)}s`
      : null;

  const meta =
    isLoading || job.lastRun
      ? `<div class="pc-job-item__meta">
        <span>${isLoading ? "Running…" : `Last run: ${escapeHtml(job.lastRun!.toLocaleString())}`}</span>
        ${durationText != null ? `<span class="pc-job-item__separator">•</span><span class="pc-job-item__duration" data-role="duration">${durationText}</span>` : ""}
        ${job.statusCode != null ? `<span class="pc-job-item__status-code" data-success="${isSuccessCode ? "true" : "false"}">${job.statusCode}</span>` : ""}
      </div>`
      : "";

  const response = job.response
    ? `<div class="pc-job-item__response" data-status="${job.status}">${escapeHtml(job.response)}</div>`
    : "";

  const button =
    job.status === "loading"
      ? `<button class="pc-job-item__button" data-role="run" disabled>${SPINNER}Running</button>`
      : `<button class="pc-job-item__button" data-role="run">Run</button>`;

  return `<div class="pc-job-item" data-status="${job.status}" data-id="${escapeHtml(job.id)}">
    <div class="pc-job-item__content">
      <div class="pc-job-item__path-row">
        <span class="pc-job-item__path">${escapeHtml(job.path)}</span>
        <span class="pc-job-item__status"></span>
      </div>
      <div class="pc-job-item__schedule-row">
        <span class="pc-job-item__schedule">${escapeHtml(job.schedule)}</span>
        <span class="pc-job-item__separator">•</span>
        <span class="pc-job-item__description">${description}</span>
      </div>
      ${meta}
      ${response}
    </div>
    ${button}
  </div>`;
}

function emptyHtml(): string {
  return `<div class="previewcron-root"><div class="pc-dashboard"><div class="pc-dashboard__content">
    ${headerHtml()}
    <div class="pc-dashboard__empty"><div class="pc-dashboard__empty-content">
      <p class="pc-dashboard__empty-title">No cron jobs found</p>
      <p class="pc-dashboard__empty-text">Add cron jobs to your vercel.json file to get started</p>
    </div></div>
  </div></div></div>`;
}

function dashboardHtml(): string {
  const items = jobs.map(jobItemHtml).join("");
  return `<div class="previewcron-root"><div class="pc-dashboard"><div class="pc-dashboard__content">
    ${headerHtml()}
    <div class="pc-layout">
      <div class="pc-layout__left">
        <div class="pc-auth-card">
          <h2 class="pc-auth-card__title">Configuration</h2>
          <div class="pc-auth">
            <label for="pc-auth-input" class="pc-auth__label">Authorization (optional)</label>
            <input type="text" id="pc-auth-input" class="pc-auth__input" placeholder="Bearer YOUR_TOKEN" value="${escapeHtml(authHeader)}" />
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
            <div class="pc-jobs-list__items" data-role="items">${items}</div>
          </div>
        </div>
      </div>
    </div>
  </div></div></div>`;
}

function renderItem(job: Job): void {
  const node = document.querySelector(`.pc-job-item[data-id="${cssEscape(job.id)}"]`);
  if (!node) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = jobItemHtml(job);
  const next = wrapper.firstElementChild;
  if (next) node.replaceWith(next);
}

function cssEscape(value: string): string {
  // Job ids come from vercel.json paths; keep selector matching safe.
  return value.replace(/["\\]/g, "\\$&");
}

async function runJob(job: Job): Promise<void> {
  job.status = "loading";
  job.startTime = Date.now();
  job.response = undefined;
  job.statusCode = undefined;
  job.duration = undefined;
  renderItem(job);

  const existing = timers.get(job.id);
  if (existing) clearInterval(existing);
  const timer = setInterval(() => {
    const el = document.querySelector(
      `.pc-job-item[data-id="${cssEscape(job.id)}"] [data-role="duration"]`
    );
    if (el && job.startTime) {
      el.textContent = `${((Date.now() - job.startTime) / 1000).toFixed(2)}s`;
    }
  }, 50);
  timers.set(job.id, timer);

  try {
    const res = await fetch("/api/trigger", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: job.path, authHeader }),
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
      const text = result.body ?? "";
      job.response = result.ok
        ? `Success: ${text.substring(0, 1000)}`
        : `Error: ${text.substring(0, 1000)}`;
    }
  } catch (err) {
    job.status = "error";
    job.response = err instanceof Error ? err.message : "Unknown error";
  } finally {
    const t = timers.get(job.id);
    if (t) clearInterval(t);
    timers.delete(job.id);
    job.startTime = undefined;
    renderItem(job);
  }
}

function mount(): void {
  const root = document.getElementById("root");
  if (!root) return;

  root.innerHTML = jobs.length === 0 ? emptyHtml() : dashboardHtml();

  const authInput = document.getElementById("pc-auth-input") as HTMLInputElement | null;
  if (authInput) {
    authInput.addEventListener("input", () => {
      authHeader = authInput.value;
    });
  }

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest('[data-role="run"]');
    if (!button) return;
    const item = button.closest(".pc-job-item");
    const id = item?.getAttribute("data-id");
    const job = jobs.find((j) => j.id === id);
    if (job && job.status !== "loading") void runJob(job);
  });
}

mount();
