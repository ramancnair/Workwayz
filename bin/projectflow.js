#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

const appDir = path.resolve(__dirname, '..');
const port = process.env.PORT || '3000';
const host = process.env.HOSTNAME || '0.0.0.0';

console.log(`▲ Workwayz starting on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);

const fs = require('fs');

const hookPath = path.resolve(__dirname, 'resolve-hook.js');
const normalizedHookPath = hookPath.replace(/\\/g, '/');

// Preload the resolver hook via NODE_OPTIONS so worker threads and child processes inherit it
// Note: Windows requires forward slashes in NODE_OPTIONS to prevent backslash escape character stripping
const currentOptions = process.env.NODE_OPTIONS || '';
const nodeOptions = currentOptions.includes('resolve-hook.js')
  ? currentOptions
  : `${currentOptions} "--require" "${normalizedHookPath}"`.trim();

const callerCwd = process.cwd();

const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
  CALLER_CWD: callerCwd,
};

// Check if a standalone server bundle is present in .next/standalone
const standaloneServer = path.join(appDir, '.next', 'standalone', 'server.js');
const hasStandalone = fs.existsSync(standaloneServer);

try {
  let child;
  if (hasStandalone) {
    child = spawn(process.execPath, ['-r', hookPath, standaloneServer], {
      cwd: path.dirname(standaloneServer),
      stdio: 'inherit',
      env: { ...env, PORT: port, HOSTNAME: host },
    });
  } else {
    const nextBin = require.resolve('next/dist/bin/next');
    child = spawn(process.execPath, ['-r', hookPath, nextBin, 'start', '-p', port, '-H', host], {
      cwd: appDir,
      stdio: 'inherit',
      env,
    });
  }

  child.on('exit', (code, signal) => {
    if (code !== null) process.exit(code);
    if (signal) process.kill(process.pid, signal);
  });
} catch (err) {
  console.error('Failed to locate ProjectFlow runtime:', err);
  process.exit(1);
}
