"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { SavedProject } from "../types";
import {
  getProjects,
  saveProject,
  deleteProject,
  deriveProjectName,
} from "../utils/configStorage";
import { CONFIG_DEBOUNCE_MS } from "../constants";

interface ConfigFormProps {
  onSubmit: (
    vercelJson: string,
    previewUrl: string,
    authHeader?: string,
    bypassToken?: string
  ) => void;
  onReset: () => void;
  error: string;
}

interface JsonValidation {
  isValid: boolean;
  error: string | null;
  cronCount: number;
}

function validateVercelJson(json: string): JsonValidation {
  if (!json.trim()) {
    return { isValid: true, error: null, cronCount: 0 };
  }

  try {
    const parsed = JSON.parse(json);

    if (typeof parsed !== "object" || parsed === null) {
      return { isValid: false, error: "JSON must be an object", cronCount: 0 };
    }

    if (!parsed.crons) {
      return {
        isValid: false,
        error: 'Missing "crons" property',
        cronCount: 0,
      };
    }

    if (!Array.isArray(parsed.crons)) {
      return {
        isValid: false,
        error: '"crons" must be an array',
        cronCount: 0,
      };
    }

    if (parsed.crons.length === 0) {
      return { isValid: false, error: "No cron jobs defined", cronCount: 0 };
    }

    for (let i = 0; i < parsed.crons.length; i++) {
      const cron = parsed.crons[i];
      if (!cron.path || typeof cron.path !== "string") {
        return {
          isValid: false,
          error: `Cron ${i + 1}: missing or invalid "path"`,
          cronCount: 0,
        };
      }
      if (!cron.schedule || typeof cron.schedule !== "string") {
        return {
          isValid: false,
          error: `Cron ${i + 1}: missing or invalid "schedule"`,
          cronCount: 0,
        };
      }
    }

    return { isValid: true, error: null, cronCount: parsed.crons.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid JSON";
    return { isValid: false, error: message, cronCount: 0 };
  }
}

export function ConfigForm({ onSubmit, onReset, error }: ConfigFormProps) {
  const [vercelJson, setVercelJson] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [bypassToken, setBypassToken] = useState("");
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time JSON validation
  const jsonValidation = useMemo(
    () => validateVercelJson(vercelJson),
    [vercelJson]
  );

  // On mount: load saved projects and restore the most recently used one.
  useEffect(() => {
    const saved = getProjects();
    setProjects(saved);
    if (saved.length > 0) {
      loadProject(saved[0]);
    }
  }, []);

  const loadProject = (project: SavedProject) => {
    setSelectedProject(project.name);
    setVercelJson(project.vercelJson);
    setPreviewUrl(project.previewUrl);
    setAuthHeader(project.authHeader || "");
    setBypassToken(project.bypassToken || "");
  };

  const isLocalhost =
    previewUrl.includes("localhost") || previewUrl.includes("127.0.0.1");

  // Debounced auto-save + auto-submit whenever the form changes. Everything is
  // persisted silently under a project name derived from the preview URL — no
  // save button needed. Save and submit share one validity gate so a half-typed
  // URL or a cleared textarea can never overwrite a good saved project.
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!vercelJson || !previewUrl || !jsonValidation.isValid) return;

      const name = deriveProjectName(previewUrl);
      if (name) {
        setProjects(
          saveProject({
            name,
            vercelJson,
            previewUrl,
            authHeader: authHeader || undefined,
            bypassToken: bypassToken || undefined,
          })
        );
        setSelectedProject(name);
      }

      onSubmit(
        vercelJson,
        previewUrl,
        authHeader || undefined,
        bypassToken || undefined
      );
    }, CONFIG_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelJson, previewUrl, authHeader, bypassToken, jsonValidation.isValid]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const project = projects.find((p) => p.name === e.target.value);
    if (project) loadProject(project);
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;
    setProjects(deleteProject(selectedProject));
    // Clear the form too — otherwise the auto-save would immediately
    // re-create the project from the still-filled fields.
    loadProject({ name: "", vercelJson: "", previewUrl: "", updatedAt: 0 });
    onReset();
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Configuration
        </h2>
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedProject}
              onChange={handleSelectChange}
              aria-label="Saved projects"
              className="max-w-44 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {!selectedProject && <option value="">Projects…</option>}
              {projects.map((project) => (
                <option key={project.name} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProject && (
              <button
                type="button"
                onClick={handleDeleteProject}
                title={`Forget "${selectedProject}"`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="vercel-json"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              vercel.json content
            </label>
            {jsonValidation.cronCount > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400">
                {jsonValidation.cronCount} cron job
                {jsonValidation.cronCount !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
          <textarea
            id="vercel-json"
            value={vercelJson}
            onChange={(e) => setVercelJson(e.target.value)}
            placeholder='{"crons": [{"path": "/api/cron/example", "schedule": "0 * * * *"}]}'
            className={`h-48 w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
              vercelJson && !jsonValidation.isValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700"
                : "border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
            }`}
            required
          />
          {vercelJson && jsonValidation.error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {jsonValidation.error}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="preview-url"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Preview URL
          </label>
          <input
            type="url"
            id="preview-url"
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
            placeholder="https://your-app-abc123.vercel.app"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
            required
          />
          {isLocalhost && (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    For localhost, run{" "}
                    <code className="rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">
                      npx previewcron
                    </code>{" "}
                    in your project
                  </p>
                  <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                    This web app cannot reach localhost due to browser
                    security. The CLI reads your vercel.json automatically and
                    opens the same dashboard locally — no install needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="bypass-token"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Vercel bypass token (optional)
          </label>
          <input
            type="text"
            id="bypass-token"
            value={bypassToken}
            onChange={(e) => setBypassToken(e.target.value)}
            placeholder="Required if your preview has Deployment Protection"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Sent as <code>x-vercel-protection-bypass</code>. Vercel protects
            previews by default — find this token in your project&apos;s
            Deployment Protection settings.
          </p>
        </div>

        <div>
          <label
            htmlFor="auth-header"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Authorization header (optional)
          </label>
          <input
            type="text"
            id="auth-header"
            value={authHeader}
            onChange={(e) => setAuthHeader(e.target.value)}
            placeholder="Bearer YOUR_CRON_SECRET"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            For protected cron endpoints — same header Vercel sends in
            production (<code>Bearer $CRON_SECRET</code>).
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
