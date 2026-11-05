import fs from 'fs';
import path from 'path';

/**
 * Compares two semantic version strings (e.g. "v1.0.2" vs "1.0.3").
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string): number[] => {
    if (!v) return [0, 0, 0];
    const clean = v.trim().replace(/^v/i, '').split('-')[0].split('+')[0];
    const parts = clean.split('.').map(n => parseInt(n, 10));
    return parts.map(n => (Number.isNaN(n) ? 0 : n));
  };

  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length, 3);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Retrieves the application version from package.json or environment.
 */
export function getAppVersion(): string {
  // 1. Check npm_package_version env var
  if (process.env.npm_package_version) {
    return process.env.npm_package_version;
  }

  // 2. Read package.json from process.cwd() or fallback directories
  const candidates = [
    path.join(process.cwd(), 'package.json'),
    path.join(__dirname, '..', '..', 'package.json'),
    path.join(__dirname, '..', 'package.json'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.version) {
          return String(parsed.version);
        }
      }
    } catch (_) {
      // Continue searching
    }
  }

  return '1.0.2';
}

export type DeploymentType = 'docker' | 'npm' | 'source';

/**
 * Detects the runtime environment in which Workwayz is operating.
 */
export function detectDeploymentType(): DeploymentType {
  // Docker container checks
  try {
    if (
      fs.existsSync('/.dockerenv') ||
      process.env.IS_DOCKER === 'true' ||
      Boolean(process.env.DOCKER_CONTAINER)
    ) {
      return 'docker';
    }
  } catch (_) {}

  // Source development (has .git in cwd)
  try {
    if (fs.existsSync(path.join(process.cwd(), '.git'))) {
      return 'source';
    }
  } catch (_) {}

  // Default installed CLI runtime via npm/npx
  return 'npm';
}

