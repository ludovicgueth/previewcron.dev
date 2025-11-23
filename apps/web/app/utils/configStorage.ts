import type { SavedConfig } from '../types';

const STORAGE_KEY = 'previewcron_saved_configs';

export function getSavedConfigs(): SavedConfig[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveConfig(config: SavedConfig): void {
  if (typeof window === 'undefined') return;

  try {
    const configs = getSavedConfigs();
    const existingIndex = configs.findIndex(c => c.name === config.name);

    if (existingIndex >= 0) {
      configs[existingIndex] = config;
    } else {
      configs.push(config);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export function deleteConfig(name: string): void {
  if (typeof window === 'undefined') return;

  try {
    const configs = getSavedConfigs();
    const filtered = configs.filter(c => c.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete config:', error);
  }
}

export function getConfig(name: string): SavedConfig | undefined {
  const configs = getSavedConfigs();
  return configs.find(c => c.name === name);
}
