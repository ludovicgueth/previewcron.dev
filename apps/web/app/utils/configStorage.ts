import type { SavedProject } from '../types';
import { STORAGE_KEY, LEGACY_STORAGE_KEY } from '../constants';

/**
 * Derive a stable project name from a preview URL, so every deployment of the
 * same project (each with a unique hash in its hostname) maps to one saved
 * config. Falls back to the full hostname for custom domains.
 */
export function deriveProjectName(previewUrl: string): string {
  let hostname: string;
  try {
    hostname = new URL(previewUrl).hostname.toLowerCase();
  } catch {
    return '';
  }

  // Require a dot so half-typed URLs ("https://my-app") and localhost never
  // become saved projects — the web app can't reach localhost anyway.
  if (!hostname.includes('.')) return '';

  if (!hostname.endsWith('.vercel.app')) return hostname;

  const subdomain = hostname.slice(0, -'.vercel.app'.length);
  // <project>-git-<branch>-<team>.vercel.app (branch alias)
  const gitMatch = subdomain.match(/^(.+?)-git-.+$/);
  if (gitMatch) return gitMatch[1];
  // <project>-<deployment-hash>-<team>.vercel.app (per-deployment URL);
  // team slugs may themselves contain hyphens.
  const hashMatch = subdomain.match(/^(.+?)-[a-z0-9]{9,10}-.+$/);
  if (hashMatch) return hashMatch[1];
  return subdomain;
}

interface LegacyConfig {
  name: string;
  vercelJson: string;
  previewUrl: string;
  deployProtectionToken?: string;
  customHeaders?: string;
}

/** One-time migration from the old named-configs format. */
function migrateLegacyConfigs(): SavedProject[] {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) return [];

    const legacy: LegacyConfig[] = JSON.parse(stored);
    const seen = new Set<string>();
    const projects: SavedProject[] = [];
    for (const [index, config] of legacy.entries()) {
      // Rename to the derived name so the first auto-save updates the migrated
      // entry instead of creating a duplicate next to it.
      const name = deriveProjectName(config.previewUrl) || config.name;
      if (seen.has(name)) continue;
      seen.add(name);

      const authLine = (config.customHeaders ?? '')
        .split('\n')
        .find((line) => line.trim().toLowerCase().startsWith('authorization:'));
      projects.push({
        name,
        vercelJson: config.vercelJson,
        previewUrl: config.previewUrl,
        authHeader: authLine?.slice(authLine.indexOf(':') + 1).trim(),
        bypassToken: config.deployProtectionToken,
        updatedAt: Date.now() - index,
      });
    }

    persistProjects(projects);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return projects;
  } catch {
    return [];
  }
}

// Storage is kept in MRU order (saves unshift, deletes preserve order), so
// reads never need to sort. Capped so localStorage can't grow without bound.
const MAX_PROJECTS = 20;

function persistProjects(projects: SavedProject[]): SavedProject[] {
  const capped = projects.slice(0, MAX_PROJECTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch (error) {
    console.error('Failed to persist projects:', error);
  }
  return capped;
}

/** All saved projects, most recently used first. */
export function getProjects(): SavedProject[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : migrateLegacyConfigs();
  } catch {
    return [];
  }
}

export function saveProject(project: Omit<SavedProject, 'updatedAt'>): SavedProject[] {
  if (typeof window === 'undefined') return [];

  const projects = getProjects().filter((p) => p.name !== project.name);
  projects.unshift({ ...project, updatedAt: Date.now() });
  return persistProjects(projects);
}

export function deleteProject(name: string): SavedProject[] {
  if (typeof window === 'undefined') return [];

  return persistProjects(getProjects().filter((p) => p.name !== name));
}
