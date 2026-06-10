/**
 * `previewcron` CLI.
 *
 * Spins up a tiny local server that reads vercel.json from the current
 * directory, serves the cron dashboard, and proxies cron triggers to the
 * target app (default http://localhost:3000). Running locally means it can
 * hit localhost directly — no CORS, no SSRF restrictions.
 *
 * Usage: npx previewcron [options]
 */
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { readVercelJson } from "../server/readVercelJson";
import type { VercelCron } from "../shared/types";

const DEFAULT_PORT = 4747;
const DEFAULT_BASE_URL = "http://localhost:3000";

/** Read the version from the package's own package.json (dist/cli → package root). */
function getVersion(): string {
  try {
    const pkgUrl = new URL("../../package.json", import.meta.url);
    return JSON.parse(readFileSync(pkgUrl, "utf-8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

interface CliOptions {
  port: number;
  baseUrl: string;
  vercelJsonPath?: string;
  open: boolean;
}

function printHelp(): void {
  console.log(`previewcron — trigger & test your Vercel cron jobs locally or on preview deployments

Usage:
  npx previewcron [options]

Options:
  -p, --port <number>     Port for the dashboard (default: ${DEFAULT_PORT})
  -b, --base-url <url>    Target app base URL (default: ${DEFAULT_BASE_URL})
      --vercel-json <p>   Path to vercel.json (default: ./vercel.json)
      --no-open           Do not open the browser automatically
  -v, --version           Print version
  -h, --help              Show this help
`);
}

function parseArgs(argv: string[]): CliOptions | "help" | "version" {
  const options: CliOptions = {
    port: DEFAULT_PORT,
    baseUrl: DEFAULT_BASE_URL,
    open: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        return "help";
      case "-v":
      case "--version":
        return "version";
      case "-p":
      case "--port": {
        const value = Number(argv[++i]);
        if (!Number.isInteger(value) || value <= 0 || value > 65535) {
          throw new Error(`Invalid port: ${argv[i]}`);
        }
        options.port = value;
        break;
      }
      case "-b":
      case "--base-url":
        options.baseUrl = (argv[++i] ?? "").replace(/\/$/, "");
        if (!options.baseUrl) throw new Error("Missing value for --base-url");
        break;
      case "--vercel-json":
        options.vercelJsonPath = argv[++i];
        if (!options.vercelJsonPath) throw new Error("Missing value for --vercel-json");
        break;
      case "--no-open":
        options.open = false;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

/**
 * Resolve CRON_SECRET so the Authorization header can be pre-filled.
 * Checks the environment first, then .env.local and .env in the cwd.
 */
async function resolveCronSecret(): Promise<string | undefined> {
  const fromEnv = process.env.CRON_SECRET?.trim();
  if (fromEnv) return fromEnv;

  for (const file of [".env.local", ".env"]) {
    try {
      const content = await readFile(join(process.cwd(), file), "utf-8");
      // Use [ \t]* (not \s*) so the match never crosses a newline — otherwise
      // an empty `CRON_SECRET=` would greedily capture the next line's value.
      const match = content.match(/^[ \t]*CRON_SECRET[ \t]*=[ \t]*(.*)$/m);
      if (match) {
        const value = match[1].trim().replace(/^["']|["']$/g, "").trim();
        if (value) return value;
      }
    } catch {
      // File missing — ignore.
    }
  }
  return undefined;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request body too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function htmlShell(initial: unknown): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview Cron</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/previewcron.css" />
  <style>
    html, body { margin: 0; min-height: 100%; }
    body { background: #000; }
    @media (prefers-color-scheme: light) { body { background: #fff; } }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>window.__PREVIEWCRON__ = ${JSON.stringify(initial).replace(/</g, "\\u003c")};</script>
  <script src="/assets/dashboard.js"></script>
</body>
</html>`;
}

async function handleTrigger(
  req: IncomingMessage,
  res: ServerResponse,
  baseUrl: string
): Promise<void> {
  const startTime = Date.now();
  try {
    const parsed = JSON.parse(await readBody(req)) as {
      path?: string;
      authHeader?: string;
    };
    if (!parsed.path || typeof parsed.path !== "string") {
      sendJson(res, 400, { ok: false, error: "Missing 'path'", durationMs: 0 });
      return;
    }

    const url = `${baseUrl}${parsed.path}`;
    const headers: Record<string, string> = {};
    if (parsed.authHeader && parsed.authHeader.trim()) {
      headers["Authorization"] = parsed.authHeader.trim();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      const body = await response.text();
      sendJson(res, 200, {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        body,
        durationMs: Date.now() - startTime,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out after 60s"
          : err.message
        : "Unknown error";
    sendJson(res, 200, { ok: false, error: message, durationMs: Date.now() - startTime });
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const data = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data),
  });
  res.end(data);
}

async function serveAsset(
  res: ServerResponse,
  filePath: string,
  contentType: string
): Promise<void> {
  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-cache",
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
}

function listen(server: ReturnType<typeof createServer>, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && port < 65535) {
        server.removeListener("error", onError);
        listen(server, port + 1).then(resolve, reject);
      } else {
        reject(err);
      }
    };
    server.once("error", onError);
    // Bind to loopback only: the dashboard embeds CRON_SECRET and exposes a
    // trigger proxy — it must never be reachable from the local network.
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", onError);
      resolve(port);
    });
  });
}

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {
      /* Browser open is best-effort. */
    });
    child.unref();
  } catch {
    /* Ignore — the URL is printed for manual opening. */
  }
}

async function main(): Promise<void> {
  let options: CliOptions | "help" | "version";
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    printHelp();
    process.exit(1);
  }

  if (options === "help") return printHelp();
  if (options === "version") return console.log(getVersion());

  const { port, baseUrl, vercelJsonPath, open } = options;

  const result = await readVercelJson({ path: vercelJsonPath, baseUrl });
  const crons: VercelCron[] = result.crons;
  const cronSecret = await resolveCronSecret();

  const initial = {
    crons,
    baseUrl,
    authHeader: cronSecret ? `Bearer ${cronSecret}` : "",
    source: result.source,
    filePath: result.filePath,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const dashboardJsPath = join(here, "browser.js");
  const cssPath = join(here, "..", "previewcron.css");

  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    if (req.method === "POST" && url === "/api/trigger") {
      void handleTrigger(req, res, baseUrl);
      return;
    }
    if (url === "/assets/dashboard.js") {
      void serveAsset(res, dashboardJsPath, "text/javascript; charset=utf-8");
      return;
    }
    if (url === "/assets/previewcron.css") {
      void serveAsset(res, cssPath, "text/css; charset=utf-8");
      return;
    }
    if (url === "/" || url.startsWith("/?")) {
      const html = htmlShell(initial);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  });

  const actualPort = await listen(server, port);
  const dashboardUrl = `http://localhost:${actualPort}`;

  console.log(`\n  ▲ Preview Cron\n`);
  if (result.source === "file" && result.filePath) {
    console.log(`  vercel.json   ${result.filePath}`);
  }
  console.log(`  cron jobs     ${crons.length} found`);
  console.log(`  target        ${baseUrl}`);
  if (cronSecret) console.log(`  auth          CRON_SECRET detected, pre-filled`);
  console.log(`\n  ➜ Dashboard:  ${dashboardUrl}\n`);
  console.log(`  Press Ctrl+C to stop.\n`);

  if (open) openBrowser(dashboardUrl);

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
