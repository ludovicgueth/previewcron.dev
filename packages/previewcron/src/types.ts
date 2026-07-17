export interface VercelCron {
  path: string;
  schedule: string;
}

export interface VercelConfig {
  crons?: VercelCron[];
  [key: string]: unknown;
}
