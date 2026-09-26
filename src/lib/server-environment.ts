import os from 'os';
import fs from 'fs';
import path from 'path';

export interface SystemConfig {
  githubRepo: string;
  githubToken?: string;
  npmPackage?: string;
  restartCommand?: string;
}

export function getSystemConfig(): SystemConfig {
  const dataDir = path.join(process.cwd(), 'data');
  const configFile = path.join(dataDir, 'system_config.json');

  let defaultNpmPackage = '@pf_test1999/projectflow';
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) defaultNpmPackage = pkg.name;
    }
  } catch (e) {
    // fallback
  }
  
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      return {
        githubRepo: config.githubRepo || 'ashdkr99/ash_test_repo1',
        githubToken: config.githubToken || '',
        npmPackage: config.npmPackage || defaultNpmPackage,
        restartCommand: config.restartCommand || ''
      };
    } catch (e) {
      console.warn('Could not parse system_config.json', e);
    }
  }
  
  return {
    githubRepo: 'ashdkr99/ash_test_repo1',
    githubToken: '',
    npmPackage: defaultNpmPackage,
    restartCommand: ''
  };
}

export function saveSystemConfig(config: Partial<SystemConfig>) {
  const dataDir = path.join(process.cwd(), 'data');
  const configFile = path.join(dataDir, 'system_config.json');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const currentConfig = getSystemConfig();
  const newConfig = { ...currentConfig, ...config };
  
  fs.writeFileSync(configFile, JSON.stringify(newConfig, null, 2), 'utf-8');
  return newConfig;
}

export function detectRestartStrategy(): string {
  // Check for PM2
  if (process.env.PM2_HOME || process.env.pm_id) {
    return 'PM2 Process Manager';
  }
  
  // Check for Docker
  if (fs.existsSync('/.dockerenv') || process.env.FORCE_DOCKER_MODE === 'true') {
    return 'Docker Container Managed';
  }
  
  // Check for Systemd
  if (process.platform === 'linux' && process.env.INVOCATION_ID) {
    return 'Systemd Service Manager';
  }
  
  // Fallback
  return 'Standalone Process Relauncher';
}

export function getServerDiagnostics() {
  const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024 * 1024));
  const cpuCount = os.cpus().length;
  
  return {
    platform: process.platform,
    arch: process.arch,
    totalMemoryGB: totalMem,
    freeMemoryGB: freeMem,
    cpuCores: cpuCount,
    nodeVersion: process.version,
    restartStrategy: detectRestartStrategy()
  };
}
