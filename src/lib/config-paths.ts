import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Resolves the persistent data directory for storing Workwayz
 * configuration files (`connections.json`, `.env.local`).
 *
 * Persistence Hierarchy:
 * 1. WORKWAYZ_DATA_DIR or PROJECTFLOW_DATA_DIR (explicit environment variable override)
 * 2. /app/data (Docker container volume mount)
 * 3. Local repository development (if cwd contains package.json and src/)
 * 4. Caller current working directory (if connections.json or .env.local already exists there)
 * 5. User home directory (~/.workwayz or legacy ~/.projectflow) - guarantees persistence across npm/npx updates!
 */
export function getDataDirectory(): string {
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (!isNode) {
    return '';
  }

  // 1. Explicit environment variable override
  const envDir = process.env.WORKWAYZ_DATA_DIR || process.env.PROJECTFLOW_DATA_DIR;
  if (envDir) {
    try {
      if (!fs.existsSync(envDir)) {
        fs.mkdirSync(envDir, { recursive: true });
      }
      return envDir;
    } catch (_) {}
  }

  // 2. Docker container persistent volume
  try {
    if (fs.existsSync('/app/data') && fs.statSync('/app/data').isDirectory()) {
      return '/app/data';
    }
  } catch (_) {}

  // 3. Local repo development check
  const cwd = process.env.CALLER_CWD || process.cwd();
  try {
    const pkgPath = path.join(cwd, 'package.json');
    const srcPath = path.join(cwd, 'src');
    if (fs.existsSync(pkgPath) && fs.existsSync(srcPath)) {
      return cwd;
    }
  } catch (_) {}

  // 4. Caller directory has connections.json or .env.local
  try {
    if (fs.existsSync(path.join(cwd, 'connections.json')) || fs.existsSync(path.join(cwd, '.env.local'))) {
      return cwd;
    }
  } catch (_) {}

  // 5. Persistent user home directory (~/.workwayz)
  try {
    const homeDir = path.join(os.homedir(), '.workwayz');
    const legacyHomeDir = path.join(os.homedir(), '.projectflow');

    // If legacy exists with connections.json and new doesn't, migrate it
    if (fs.existsSync(path.join(legacyHomeDir, 'connections.json')) && !fs.existsSync(path.join(homeDir, 'connections.json'))) {
      if (!fs.existsSync(homeDir)) {
        fs.mkdirSync(homeDir, { recursive: true });
      }
      try {
        fs.copyFileSync(path.join(legacyHomeDir, 'connections.json'), path.join(homeDir, 'connections.json'));
        if (fs.existsSync(path.join(legacyHomeDir, '.env.local'))) {
          fs.copyFileSync(path.join(legacyHomeDir, '.env.local'), path.join(homeDir, '.env.local'));
        }
      } catch (_) {}
      return homeDir;
    }

    if (!fs.existsSync(homeDir)) {
      fs.mkdirSync(homeDir, { recursive: true });
    }
    return homeDir;
  } catch (_) {}

  return cwd;
}

/**
 * Returns the authoritative absolute path to `connections.json`.
 */
export function getProfilesPath(): string {
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (!isNode) return 'connections.json';
  return path.join(getDataDirectory(), 'connections.json');
}

/**
 * Returns the authoritative absolute path to `.env.local` (or `.env` fallback if reading).
 */
export function getEnvPath(): string {
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (!isNode) return '.env.local';
  const dataDir = getDataDirectory();
  const local = path.join(dataDir, '.env.local');
  if (fs.existsSync(local)) return local;
  const base = path.join(dataDir, '.env');
  if (fs.existsSync(base)) return base;
  return local;
}

/**
 * Returns the authoritative path to `.env.local` specifically for writing.
 */
export function getEnvLocalPath(): string {
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (!isNode) return '.env.local';
  return path.join(getDataDirectory(), '.env.local');
}
