/**
 * `previewcron` CLI.
 *
 * Spins up a tiny local server that reads the project's cron jobs, serves the
 * cron dashboard, and proxies cron triggers to the target app (default
 * http://localhost:3000) with the same request Vercel's scheduler sends.
 * Running locally means it can hit localhost directly — no CORS, no SSRF
 * restrictions.
 *
 * Usage: npx previewcron [options]
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "http";
import { once } from "events";
import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { text } from "stream/consumers";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import type { VercelCron } from "../types";

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
      --vercel-json <p>   Config file with "crons" (default: ./vercel.json, then .vercel/)
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
        options.baseUrl = (argv[++i] ?? "").replace(/\/+$/, "");
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
 * Resolve a secret so the dashboard fields can be pre-filled.
 * Checks the environment first, then .env.local and .env in the cwd.
 */
async function resolveSecret(name: string): Promise<string | undefined> {
  const fromEnv = process.env[name]?.trim();
  if (fromEnv) return fromEnv;

  for (const file of [".env.local", ".env"]) {
    const content = await readFile(join(process.cwd(), file), "utf-8").catch(() => "");
    // [ \t]* (not \s*) so an empty `NAME=` never captures the next line.
    const match = content.match(new RegExp(`^[ \\t]*(?:export[ \\t]+)?${name}[ \\t]*=[ \\t]*(.*)$`, "m"));
    if (!match) continue;
    // Like dotenv: a quoted value ends at its closing quote, an unquoted one at `#`.
    const raw = match[1].trim();
    const quoted = /^(["'`])((?:\\.|(?!\1)[^\\])*)\1/.exec(raw);
    const value = quoted ? quoted[2] : raw.split("#")[0].trim();
    if (value) return value;
  }
  return undefined;
}

interface Config {
  crons?: unknown;
  schedules?: unknown;
}

/** Parses a JSON config file, or returns undefined when it does not exist. */
async function readConfig(filePath: string): Promise<Config | undefined> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  try {
    const parsed: unknown = JSON.parse(content);
    return (parsed !== null && typeof parsed === "object" ? parsed : {}) as Config;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }
}

/**
 * Reads crons the way Vercel resolves its config: vercel.json wins, else the
 * compiled vercel.ts / vercel.toml in .vercel/vercel.json. Framework-generated
 * crons (e.g. Nitro v3) only exist in the Build Output after `vercel build`.
 */
async function readCrons(path?: string): Promise<{ crons: VercelCron[]; filePath?: string }> {
  const cwd = process.cwd();
  let filePath: string | undefined;
  let config: Config | undefined;
  for (const file of path ? [path] : [join(cwd, "vercel.json"), join(cwd, ".vercel/vercel.json")]) {
    config = await readConfig(file);
    if (config) {
      filePath = file;
      break;
    }
  }
  if (path && !config) throw new Error(`Config file not found: ${path}`);
  if (!path && config?.crons === undefined) {
    const buildOutput = join(cwd, ".vercel/output/config.json");
    const output = await readConfig(buildOutput);
    if (output?.crons !== undefined) [filePath, config] = [buildOutput, output];
  }
  if (!filePath) {
    console.warn("No vercel.json found. Using vercel.ts or vercel.toml? Run `vercel dev` or `vercel build` once to compile it.");
  }
  if (config?.schedules) {
    console.warn(`${filePath} declares "schedules" (Vercel beta), which previewcron does not support yet.`);
  }

  const declared = config?.crons;
  const entries: unknown[] = Array.isArray(declared) ? declared : [];
  const crons = entries.filter((entry): entry is VercelCron => {
    const { path, schedule } = (entry ?? {}) as Partial<Record<keyof VercelCron, unknown>>;
    const valid = typeof path === "string" && path.startsWith("/") && typeof schedule === "string";
    if (!valid) console.warn(`Skipping invalid cron in ${filePath}: ${JSON.stringify(entry)}`);
    return valid;
  });
  return { crons, filePath };
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
  baseUrl: string,
  crons: VercelCron[]
): Promise<void> {
  const startTime = Date.now();
  const timeout = AbortSignal.timeout(60_000);
  try {
    const { index, path, schedule, authHeader, bypassToken } = JSON.parse(await text(req)) as {
      index?: number;
      path?: string;
      schedule?: string;
      authHeader?: string;
      bypassToken?: string;
    };
    // The URL always comes from the loaded config, never from the request;
    // path and schedule only catch a stale tab from before a CLI restart.
    const cron = crons[Number(index)];
    if (!cron || cron.path !== path || cron.schedule !== schedule) {
      return sendJson(res, 400, { ok: false, error: "Unknown cron job, reload the dashboard", durationMs: 0 });
    }

    // Same request Vercel's scheduler sends in production.
    const headers: Record<string, string> = {
      "user-agent": "vercel-cron/1.0",
      "x-vercel-cron-schedule": cron.schedule,
    };
    if (authHeader?.trim()) headers["Authorization"] = authHeader.trim();
    if (bypassToken?.trim()) headers["x-vercel-protection-bypass"] = bypassToken.trim();

    // Vercel cron never follows redirects: a 3xx is the final answer.
    const response = await fetch(`${baseUrl}${cron.path}`, {
      headers,
      redirect: "manual",
      signal: timeout,
    });
    const location = response.status >= 300 && response.status < 400 && response.headers.get("location");
    sendJson(res, 200, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: location
        ? `Redirect to ${location} (Vercel cron does not follow redirects)`
        : await response.text(),
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    // Check the signal, not err.name: Node < 18.18 reports a plain AbortError.
    const message = timeout.aborted
      ? "Request timed out after 60s"
      : err instanceof Error
        ? err.message
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

async function listen(server: Server, port: number): Promise<number> {
  // Bind to loopback only: the dashboard embeds secrets and exposes a
  // trigger proxy — it must never be reachable from the local network.
  server.listen(port, "127.0.0.1");
  try {
    await once(server, "listening");
    return port;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EADDRINUSE" || port >= 65535) throw err;
    return listen(server, port + 1);
  }
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

  const { crons, filePath } = await readCrons(vercelJsonPath);
  const cronSecret = await resolveSecret("CRON_SECRET");
  const bypassToken = await resolveSecret("VERCEL_AUTOMATION_BYPASS_SECRET");

  const html = htmlShell({
    crons,
    baseUrl,
    authHeader: cronSecret ? `Bearer ${cronSecret}` : "",
    bypassToken: bypassToken ?? "",
  });

  const here = dirname(fileURLToPath(import.meta.url));
  const dashboardJsPath = join(here, "browser.js");
  const cssPath = join(here, "..", "previewcron.css");

  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    // DNS-rebinding / CSRF guard, since the page embeds secrets and
    // /api/trigger hits the target app: only loopback hosts (any port, so SSH
    // tunnels and port forwards keep working) and same-origin requests.
    const host = req.headers.host ?? "";
    const { origin } = req.headers;
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || (origin && origin !== `http://${host}`)) {
      res.writeHead(403, { "content-type": "text/plain" });
      res.end("Forbidden: open the dashboard at http://localhost:<port>");
    } else if (req.method === "POST" && url === "/api/trigger") {
      void handleTrigger(req, res, baseUrl, crons);
    } else if (url === "/assets/dashboard.js") {
      void serveAsset(res, dashboardJsPath, "text/javascript; charset=utf-8");
    } else if (url === "/assets/previewcron.css") {
      void serveAsset(res, cssPath, "text/css; charset=utf-8");
    } else if (url === "/" || url.startsWith("/?")) {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        // No framing: a hidden iframe could otherwise trick a click on Run.
        "x-frame-options": "DENY",
        "content-security-policy": "frame-ancestors 'none'",
        "cache-control": "no-store",
      });
      res.end(html);
    } else {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
  });

  const actualPort = await listen(server, port);
  const dashboardUrl = `http://localhost:${actualPort}`;

  console.log(`\n  ▲ Preview Cron\n`);
  console.log(`  config        ${filePath ?? "none found"}`);
  console.log(`  cron jobs     ${crons.length} found`);
  console.log(`  target        ${baseUrl}`);
  if (cronSecret) console.log(`  auth          CRON_SECRET detected, pre-filled`);
  if (bypassToken) console.log(`  bypass        VERCEL_AUTOMATION_BYPASS_SECRET detected, pre-filled`);
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
