#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

const appDir = path.resolve(__dirname, '..');
const port = process.env.PORT || '3000';
const host = process.env.HOSTNAME || '0.0.0.0';

console.log(`▲ ProjectFlow starting on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);

try {
  const nextBin = require.resolve('next/dist/bin/next');

  const child = spawn(process.execPath, [nextBin, 'start', '-p', port, '-H', host], {
    cwd: appDir,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (code !== null) process.exit(code);
    if (signal) process.kill(process.pid, signal);
  });
} catch (err) {
  console.error('Failed to locate Next.js runtime:', err);
  process.exit(1);
}
