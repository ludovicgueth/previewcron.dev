export interface VercelCron {
  path: string;
  schedule: string;
}

export interface VercelConfig {
  crons?: VercelCron[];
  [key: string]: unknown;
}

export interface CronJobWithStatus extends VercelCron {
  id: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  lastRun?: Date;
  response?: string;
  statusCode?: number;
  duration?: number;
  startTime?: number;
}

export interface CronPanelConfig {
  previewUrl: string;
  deployProtectionToken?: string;
  customHeaders?: string;
}

export interface SavedConfig {
  name: string;
  vercelJson: string;
  previewUrl: string;
  deployProtectionToken?: string;
  customHeaders?: string;
}
