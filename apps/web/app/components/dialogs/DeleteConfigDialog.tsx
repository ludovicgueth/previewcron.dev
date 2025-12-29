"use client";

import type { SavedConfig } from "../../types";
import { deleteConfig, getSavedConfigs } from "../../utils/configStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  configName: string;
  onDelete: (configs: SavedConfig[]) => void;
}

export function DeleteConfigDialog({
  isOpen,
  onOpenChange,
  configName,
  onDelete,
}: DeleteConfigDialogProps) {
  const handleDelete = () => {
    if (!configName) return;
    deleteConfig(configName);
    onDelete(getSavedConfigs());
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Configuration</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this configuration? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {configName && (
          <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Configuration:
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {configName}
            </p>
          </div>
        )}
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
