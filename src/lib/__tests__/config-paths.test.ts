import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { getDataDirectory, getProfilesPath, getEnvPath, getEnvLocalPath } from '../config-paths';

describe('Config Paths Resolver (config-paths.ts)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.WORKWAYZ_DATA_DIR;
    delete process.env.PROJECTFLOW_DATA_DIR;
    delete process.env.CALLER_CWD;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prioritizes WORKWAYZ_DATA_DIR if specified', () => {
    const customDir = path.join(os.tmpdir(), 'workwayz-custom-dir-' + Date.now());
    process.env.WORKWAYZ_DATA_DIR = customDir;

    expect(getDataDirectory()).toBe(customDir);
    expect(getProfilesPath()).toBe(path.join(customDir, 'connections.json'));
    expect(getEnvLocalPath()).toBe(path.join(customDir, '.env.local'));
  });

  it('prioritizes PROJECTFLOW_DATA_DIR as legacy fallback override', () => {
    const customDir = path.join(os.tmpdir(), 'projectflow-custom-dir-' + Date.now());
    process.env.PROJECTFLOW_DATA_DIR = customDir;

    expect(getDataDirectory()).toBe(customDir);
    expect(getProfilesPath()).toBe(path.join(customDir, 'connections.json'));
  });

  it('returns current project directory when in development repository', () => {
    // In our actual workspace running vitest, package.json and src/ exist in process.cwd()
    const devDir = process.cwd();
    expect(getDataDirectory()).toBe(devDir);
    expect(getProfilesPath()).toBe(path.join(devDir, 'connections.json'));
  });

  it('resolves user home directory when outside development and no overrides set', () => {
    // Simulate running in an external directory (no package.json or src)
    const fakeExternalDir = path.join(os.tmpdir(), 'random-empty-cli-folder-' + Date.now());
    fs.mkdirSync(fakeExternalDir, { recursive: true });

    process.env.CALLER_CWD = fakeExternalDir;
    // Spy on process.cwd to return the external dir as well
    vi.spyOn(process, 'cwd').mockReturnValue(fakeExternalDir);

    const resolved = getDataDirectory();
    const expectedHome = path.join(os.homedir(), '.workwayz');

    expect(resolved).toBe(expectedHome);
    expect(getProfilesPath()).toBe(path.join(expectedHome, 'connections.json'));
    expect(getEnvLocalPath()).toBe(path.join(expectedHome, '.env.local'));

    // Clean up temporary dir
    try {
      fs.rmdirSync(fakeExternalDir);
    } catch (_) {}
  });

  it('returns caller directory if connections.json already exists there', () => {
    const callerDir = path.join(os.tmpdir(), 'caller-with-connections-' + Date.now());
    fs.mkdirSync(callerDir, { recursive: true });
    const dummyConns = path.join(callerDir, 'connections.json');
    fs.writeFileSync(dummyConns, '{}', 'utf8');

    process.env.CALLER_CWD = callerDir;
    vi.spyOn(process, 'cwd').mockReturnValue(callerDir);

    expect(getDataDirectory()).toBe(callerDir);
    expect(getProfilesPath()).toBe(dummyConns);

    // Clean up
    try {
      fs.unlinkSync(dummyConns);
      fs.rmdirSync(callerDir);
    } catch (_) {}
  });
});
