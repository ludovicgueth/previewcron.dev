import { readFile } from "fs/promises";
import { join } from "path";
import type { VercelConfig, VercelCron } from "./types";

export interface ReadVercelJsonResult {
  crons: VercelCron[];
  filePath: string;
}

/** Reads vercel.json (default: ./vercel.json) and extracts its cron jobs. */
export async function readVercelJson(path?: string): Promise<ReadVercelJsonResult> {
  const filePath = path ?? join(process.cwd(), "vercel.json");

  try {
    const config: VercelConfig = JSON.parse(await readFile(filePath, "utf-8"));
    return { crons: config.crons ?? [], filePath };
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Failed to read vercel.json from ${filePath}: ${error.message}`);
    }
    return { crons: [], filePath };
  }
}
