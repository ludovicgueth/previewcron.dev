"use client";

import { useState } from "react";
import { FileCode } from "lucide-react";
import { CORS_ALLOWED_ORIGIN } from "../../constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CorsSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CorsSetupDialog({ isOpen, onOpenChange }: CorsSetupDialogProps) {
  const [copied, setCopied] = useState(false);

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
  const allowedOrigin = '${CORS_ALLOWED_ORIGIN}';

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
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
  );
}
