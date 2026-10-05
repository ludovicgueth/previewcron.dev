// End-to-end tests for the built CLI — run `bun run build` first (prepublishOnly does).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

const cli = fileURLToPath(new URL("../dist/cli/index.mjs", import.meta.url));
const TIMEOUT = { timeout: 15_000 };

/** Starts a local HTTP server; returns its base URL and the last request it saw. */
async function startTarget(t, handler = (req, res) => res.end("done")) {
  const seen = {};
  const server = createServer((req, res) => {
    seen.req = req;
    handler(req, res);
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  return { base: `http://127.0.0.1:${server.address().port}`, seen };
}

/** Writes `files` into a temp project, runs the CLI there, and waits for the dashboard URL. */
async function startCli(t, files, args = []) {
  const cwd = await mkdtemp(join(tmpdir(), "previewcron-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(cwd, name, ".."), { recursive: true });
    await writeFile(join(cwd, name), content);
  }
  const env = { ...process.env };
  delete env.CRON_SECRET;
  delete env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const child = spawn(process.execPath, [cli, "--no-open", ...args], { cwd, env });
  t.after(() => child.kill());
  let out = "";
  for await (const chunk of child.stdout) if ((out += chunk).includes("Dashboard:")) break;
  return { port: Number(/Dashboard:\s+http:\/\/localhost:(\d+)/.exec(out)[1]), out };
}

function call(port, { host = `localhost:${port}`, origin, body } = {}) {
  return new Promise((resolve, reject) => {
    const headers = { host, ...(origin && { origin }) };
    const req = request({ port, host: "127.0.0.1", path: body ? "/api/trigger" : "/", method: body ? "POST" : "GET", headers });
    req.on("response", async (res) =>
      resolve({ status: res.statusCode, headers: res.headers, text: (await res.toArray()).join("") })
    );
    req.on("error", reject);
    req.end(body);
  });
}

const trigger = async (port, payload) => JSON.parse((await call(port, { body: JSON.stringify(payload) })).text);
const cron = { path: "/api/a", schedule: "0 5 * * *" };

test("replays crons like Vercel and only serves its own origin", TIMEOUT, async (t) => {
  const { base, seen } = await startTarget(t);
  const { port } = await startCli(
    t,
    {
      "vercel.json": JSON.stringify({ crons: [{ ...cron, statusCode: "<img src=x onerror=alert(1)>" }, { path: "no-slash", schedule: "* * * * *" }] }),
      ".env.local": 'export CRON_SECRET="s3cret#1" # the "real" one\nVERCEL_AUTOMATION_BYPASS_SECRET=byp4ss#comment\n',
    },
    ["--base-url", base]
  );

  assert.equal((await call(port, { host: "evil.example" })).status, 403);
  assert.equal((await call(port, { origin: "http://evil.example", body: "{}" })).status, 403);
  // A forwarded port (SSH tunnel) still works.
  assert.equal((await call(port, { host: "localhost:1" })).status, 200);

  const page = await call(port);
  assert.equal(page.headers["x-frame-options"], "DENY");
  assert.match(page.text, /"crons":\[\{"path":"\/api\/a","schedule":"0 5 \* \* \*"\}\]/);
  assert.match(page.text, /"authHeader":"Bearer s3cret#1","bypassToken":"byp4ss"/);

  const run = await trigger(port, { index: 0, ...cron, authHeader: "Bearer s3cret#1", bypassToken: "byp4ss" });
  assert.equal(run.body, "done");
  assert.equal(seen.req.url, "/api/a");
  assert.equal(seen.req.headers["user-agent"], "vercel-cron/1.0");
  assert.equal(seen.req.headers["x-vercel-cron-schedule"], "0 5 * * *");
  assert.equal(seen.req.headers.authorization, "Bearer s3cret#1");
  assert.equal(seen.req.headers["x-vercel-protection-bypass"], "byp4ss");

  // Only crons from the config, and never one a stale tab mistook for another.
  assert.match((await trigger(port, { index: 1, path: "no-slash" })).error, /Unknown cron job/);
  assert.match((await trigger(port, { index: 0, path: "/api/other", schedule: cron.schedule })).error, /Unknown cron job/);
});

test("reports redirects instead of following them", TIMEOUT, async (t) => {
  const { base } = await startTarget(t, (req, res) => {
    res.writeHead(307, { location: "/elsewhere" });
    res.end();
  });
  const { port } = await startCli(t, { "vercel.json": JSON.stringify({ crons: [cron] }) }, ["--base-url", base]);

  const run = await trigger(port, { index: 0, ...cron });
  assert.equal(run.status, 307);
  assert.equal(run.ok, false);
  assert.match(run.body, /Redirect to \/elsewhere/);
});

test("falls back to Build Output crons and prints the port it actually bound", TIMEOUT, async (t) => {
  const busy = createServer().listen(0, "127.0.0.1");
  await once(busy, "listening");
  t.after(() => busy.close());
  const busyPort = busy.address().port;

  const { port, out } = await startCli(
    t,
    { ".vercel/output/config.json": JSON.stringify({ version: 3, crons: [{ path: "/_vercel/cron", schedule: "*/5 * * * *" }] }) },
    ["--port", String(busyPort)]
  );

  assert.notEqual(port, busyPort);
  assert.match(out, /config\s+.*\.vercel\/output\/config\.json/);
  assert.match((await call(port)).text, /"path":"\/_vercel\/cron"/);
});

test("vercel.json is authoritative over stale .vercel files", TIMEOUT, async (t) => {
  const stale = JSON.stringify({ crons: [{ path: "/api/stale", schedule: "0 0 * * *" }] });
  const { port, out } = await startCli(t, {
    "vercel.json": JSON.stringify({ crons: [] }),
    ".vercel/vercel.json": stale,
    ".vercel/output/config.json": stale,
  });

  assert.match(out, /config\s+\S*\/previewcron-[^/]+\/vercel\.json\n/);
  assert.match((await call(port)).text, /"crons":\[\]/);
});
