"use client";

import { useState } from "react";
import type { SavedConfig } from "../../types";
import { saveConfig, getSavedConfigs } from "../../utils/configStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SaveConfigDialogProps {
  previewUrl: string;
  vercelJson: string;
  token?: string;
  customHeaders?: string;
  onSave: (configs: SavedConfig[], savedName: string) => void;
}

export function SaveConfigDialog({
  previewUrl,
  vercelJson,
  token,
  customHeaders,
  onSave,
}: SaveConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [configName, setConfigName] = useState("");

  const handleSave = () => {
    if (!configName.trim()) return;
    if (!vercelJson || !previewUrl) {
      setIsOpen(false);
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
    onSave(getSavedConfigs(), configName);
    setIsOpen(false);
    setConfigName("");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setConfigName("");
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
            onClick={() => setIsOpen(false)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!configName.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
