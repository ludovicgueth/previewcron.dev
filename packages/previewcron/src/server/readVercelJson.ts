import { readFile } from 'fs/promises';
import { join } from 'path';
import type { VercelConfig, VercelCron } from '../shared/types';

export interface ReadVercelJsonOptions {
  /**
   * Custom path to vercel.json file
   * If not provided, will auto-detect in project root
   */
  path?: string;

  /**
   * Inline config instead of reading from file
   */
  config?: VercelConfig;

  /**
   * Base URL for cron jobs (defaults to http://localhost:3000)
   */
  baseUrl?: string;
}

export interface ReadVercelJsonResult {
  crons: VercelCron[];
  baseUrl: string;
  source: 'file' | 'inline';
  filePath?: string;
}

/**
 * Reads vercel.json file and extracts cron jobs
 * Supports auto-detection, custom paths, and inline config
 */
export async function readVercelJson(
  options: ReadVercelJsonOptions = {}
): Promise<ReadVercelJsonResult> {
  const baseUrl = options.baseUrl || 'http://localhost:3000';

  // If inline config is provided, use it directly
  if (options.config) {
    return {
      crons: options.config.crons || [],
      baseUrl,
      source: 'inline',
    };
  }

  // Determine the path to vercel.json
  const filePath = options.path
    ? options.path
    : join(process.cwd(), 'vercel.json');

  try {
    const fileContent = await readFile(filePath, 'utf-8');
    const config: VercelConfig = JSON.parse(fileContent);

    return {
      crons: config.crons || [],
      baseUrl,
      source: 'file',
      filePath,
    };
  } catch (error) {
    // If file not found or parse error, return empty crons
    if (error instanceof Error) {
      console.warn(`Failed to read vercel.json from ${filePath}:`, error.message);
    }

    return {
      crons: [],
      baseUrl,
      source: 'file',
      filePath,
    };
  }
}
