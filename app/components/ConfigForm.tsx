"use client";

import { useState, useEffect, useRef } from "react";
import type { SavedConfig } from "../types";
import {
  getSavedConfigs,
  saveConfig,
  deleteConfig,
} from "../utils/configStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileCode } from "lucide-react";

interface ConfigFormProps {
  onSubmit: (
    vercelJson: string,
    previewUrl: string,
    token?: string,
    customHeaders?: string
  ) => void;
  error: string;
}

export function ConfigForm({ onSubmit, error }: ConfigFormProps) {
  const [configName, setConfigName] = useState("");
  const [vercelJson, setVercelJson] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [token, setToken] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(
    getSavedConfigs()
  );
  const [selectedConfigName, setSelectedConfigName] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCorsDialogOpen, setIsCorsDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isLocalhost =
    previewUrl.includes("localhost") || previewUrl.includes("127.0.0.1");

  const corsSnippet = `// Create this file: middleware.ts (in your app's root directory)
// This allows previewcron.dev to call your localhost API endpoints

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only enable CORS in development (disabled in production)
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const allowedOrigin = 'https://previewcron.dev';

  // Handle CORS preflight (OPTIONS request)
  if (request.method === 'OPTIONS') {
    if (origin === allowedOrigin) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    return new NextResponse(null, { status: 204 });
  }

  // Handle actual request (GET, etc.)
  const response = NextResponse.next();
  if (origin === allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

export const config = {
  matcher: '/api/cron/:path*',
};`;

  const handleCopy = () => {
    navigator.clipboard.writeText(corsSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Debounced auto-submit when config changes
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only auto-submit if both fields have values
    if (vercelJson && previewUrl) {
      debounceTimerRef.current = setTimeout(() => {
        onSubmit(
          vercelJson,
          previewUrl,
          token || undefined,
          customHeaders || undefined
        );
      }, 500); // 500ms debounce
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // onSubmit is intentionally excluded from deps to prevent unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vercelJson, previewUrl, token, customHeaders]);

  const handleSaveConfig = () => {
    if (!configName.trim()) {
      return;
    }

    if (!vercelJson || !previewUrl) {
      setIsDialogOpen(false);
      return;
    }

    const config: SavedConfig = {
      name: configName,
      vercelJson,
      previewUrl,
      deployProtectionToken: token || undefined,
      customHeaders: customHeaders || undefined,
    };

    saveConfig(config);
    setSavedConfigs(getSavedConfigs());
    setSelectedConfigName(configName);
    setIsDialogOpen(false);
    setConfigName("");
  };

  const handleLoadConfig = (configName: string) => {
    if (!configName) return;

    const configs = getSavedConfigs();
    const config = configs.find((c) => c.name === configName);

    if (config) {
      setConfigName(config.name);
      setVercelJson(config.vercelJson);
      setPreviewUrl(config.previewUrl);
      setToken(config.deployProtectionToken || "");
      setCustomHeaders(config.customHeaders || "");
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedConfigName(name);
    if (name) {
      handleLoadConfig(name);
    }
  };

  const handleDeleteConfig = () => {
    if (!selectedConfigName) return;
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteConfig = () => {
    if (!selectedConfigName) return;
    deleteConfig(selectedConfigName);
    setSavedConfigs(getSavedConfigs());
    setSelectedConfigName("");
    setIsDeleteDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      vercelJson,
      previewUrl,
      token || undefined,
      customHeaders || undefined
    );
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
                  onClick={handleDeleteConfig}
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
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setConfigName("");
              }
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Configuration</DialogTitle>
                <DialogDescription>
                  Save your current configuration for quick reuse later. Stored
                  securely in your browser local storage.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label
                    htmlFor="dialog-config-name"
                    className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    Configuration Name
                  </label>
                  <input
                    type="text"
                    id="dialog-config-name"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="e.g., your-app-name - localhost"
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                {previewUrl && (
                  <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Preview:
                    </p>
                    <p className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                      {previewUrl}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={!configName.trim()}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Save
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Configuration</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this configuration? This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {selectedConfigName && (
                <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Configuration:
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedConfigName}
                  </p>
                </div>
              )}
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteConfig}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  Delete
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="vercel-json"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            vercel.json content
          </label>
          <textarea
            id="vercel-json"
            value={vercelJson}
            onChange={(e) => setVercelJson(e.target.value)}
            placeholder='{"crons": [{"path": "/api/cron/example", "schedule": "0 * * * *"}]}'
            className="h-48 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
            required
          />
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

          <Dialog open={isCorsDialogOpen} onOpenChange={setIsCorsDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>CORS Setup for Localhost Testing</DialogTitle>
                <DialogDescription>
                  Create a{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
                    middleware.ts
                  </code>{" "}
                  file in your app&apos;s root directory
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 w-full min-w-0">
                <div className="w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-2 pt-2">
                    <div className="flex items-center gap-2 rounded-t-md border-x border-t border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200">
                      <FileCode className="h-3.5 w-3.5 text-zinc-400" />
                      middleware.ts
                    </div>
                    <div className="px-2 pb-2 text-xs font-medium text-zinc-500">
                      Next.js
                    </div>
                  </div>
                  <pre className="w-full max-h-[400px] overflow-x-auto overflow-y-auto p-4 text-xs text-zinc-100 whitespace-pre">
                    <code>{corsSnippet}</code>
                  </pre>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Safe: CORS only active in development (disabled in production)
                </p>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsCorsDialogOpen(false)}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
