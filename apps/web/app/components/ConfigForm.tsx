"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { SavedConfig } from "../types";
import { getSavedConfigs } from "../utils/configStorage";
import { CONFIG_DEBOUNCE_MS } from "../constants";
import {
  SaveConfigDialog,
  DeleteConfigDialog,
  CorsSetupDialog,
} from "./dialogs";

interface ConfigFormProps {
  onSubmit: (
    vercelJson: string,
    previewUrl: string,
    token?: string,
    customHeaders?: string
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

export function ConfigForm({ onSubmit, error }: ConfigFormProps) {
  const [vercelJson, setVercelJson] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [token, setToken] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [selectedConfigName, setSelectedConfigName] = useState<string>("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCorsDialogOpen, setIsCorsDialogOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time JSON validation
  const jsonValidation = useMemo(
    () => validateVercelJson(vercelJson),
    [vercelJson]
  );

  // Load saved configs only on client side
  useEffect(() => {
    setSavedConfigs(getSavedConfigs());
  }, []);

  const isLocalhost =
    previewUrl.includes("localhost") || previewUrl.includes("127.0.0.1");

  // Debounced auto-submit when config changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (vercelJson && previewUrl && jsonValidation.isValid) {
      debounceTimerRef.current = setTimeout(() => {
        onSubmit(
          vercelJson,
          previewUrl,
          token || undefined,
          customHeaders || undefined
        );
      }, CONFIG_DEBOUNCE_MS);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelJson, previewUrl, token, customHeaders, jsonValidation.isValid]);

  const handleLoadConfig = (configName: string) => {
    if (!configName) return;
    const config = savedConfigs.find((c) => c.name === configName);
    if (config) {
      setVercelJson(config.vercelJson);
      setPreviewUrl(config.previewUrl);
      setToken(config.deployProtectionToken || "");
      setCustomHeaders(config.customHeaders || "");
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedConfigName(name);
    if (name) handleLoadConfig(name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonValidation.isValid) {
      onSubmit(
        vercelJson,
        previewUrl,
        token || undefined,
        customHeaders || undefined
      );
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Configuration
        </h2>
        <div className="flex items-center gap-2">
          {savedConfigs.length > 0 && (
            <>
              <select
                value={selectedConfigName}
                onChange={handleSelectChange}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Load saved...</option>
                {savedConfigs.map((config) => (
                  <option key={config.name} value={config.name}>
                    {config.name}
                  </option>
                ))}
              </select>
              {selectedConfigName && (
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  title="Delete selected configuration"
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
            </>
          )}

          <SaveConfigDialog
            previewUrl={previewUrl}
            vercelJson={vercelJson}
            token={token}
            customHeaders={customHeaders}
            onSave={(configs, savedName) => {
              setSavedConfigs(configs);
              setSelectedConfigName(savedName);
            }}
          />

          <DeleteConfigDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            configName={selectedConfigName}
            onDelete={(configs) => {
              setSavedConfigs(configs);
              setSelectedConfigName("");
            }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          {!previewUrl.includes("localhost:3000") && (
            <button
              type="button"
              onClick={() => setPreviewUrl("http://localhost:3000")}
              className="mt-2 inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Use localhost:3000
            </button>
          )}

          {isLocalhost && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
              <div className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Testing localhost from deployed app
                  </p>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                    You&apos;ll need to add CORS headers to your local app.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCorsDialogOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                    Show setup
                  </button>
                </div>
              </div>
            </div>
          )}

          <CorsSetupDialog
            isOpen={isCorsDialogOpen}
            onOpenChange={setIsCorsDialogOpen}
          />
        </div>

        <div>
          <label
            htmlFor="token"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Deploy Protection Token (optional)
          </label>
          <input
            type="text"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter token if your preview has deploy protection"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
          />
        </div>

        <div>
          <label
            htmlFor="customHeaders"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Custom Headers (optional)
          </label>
          <textarea
            id="customHeaders"
            value={customHeaders}
            onChange={(e) => setCustomHeaders(e.target.value)}
            placeholder={
              "Authorization: Bearer YOUR_SECRET\nx-cron-secret: secret123"
            }
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
          />
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
