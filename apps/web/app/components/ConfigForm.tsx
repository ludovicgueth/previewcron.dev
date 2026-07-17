"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { CONFIG_DEBOUNCE_MS } from "../constants";

interface ConfigFormProps {
  onSubmit: (
    vercelJson: string,
    previewUrl: string,
    authHeader?: string,
    bypassToken?: string
  ) => void;
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

function SecretInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide value" : "Show value"}
        title={visible ? "Hide value" : "Show value"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        {visible ? (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export function ConfigForm({ onSubmit, error }: ConfigFormProps) {
  const [vercelJson, setVercelJson] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [bypassToken, setBypassToken] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time JSON validation
  const jsonValidation = useMemo(
    () => validateVercelJson(vercelJson),
    [vercelJson]
  );

  // Nothing is ever persisted — the form lives in memory for the tab's
  // lifetime. On mount, clear storage left behind by previous versions that
  // saved configs (the legacy format could contain tokens).
  useEffect(() => {
    try {
      localStorage.removeItem("previewcron_projects");
      localStorage.removeItem("previewcron_saved_configs");
    } catch {
      // Storage unavailable — nothing to clean.
    }
  }, []);

  const isLocalhost =
    previewUrl.includes("localhost") || previewUrl.includes("127.0.0.1");

  // Debounced auto-submit whenever the form is complete and valid.
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!vercelJson || !previewUrl || !jsonValidation.isValid) return;

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

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Configuration
        </h2>
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
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
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
          <SecretInput
            id="bypass-token"
            value={bypassToken}
            onChange={setBypassToken}
            placeholder="Required if your preview has Deployment Protection"
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
          <SecretInput
            id="auth-header"
            value={authHeader}
            onChange={setAuthHeader}
            placeholder="Bearer YOUR_CRON_SECRET"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            For protected cron endpoints — same header Vercel sends in
            production (<code>Bearer $CRON_SECRET</code>).
          </p>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Nothing is saved: your configuration and tokens stay in memory and
          are gone when you close the tab.
        </p>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
