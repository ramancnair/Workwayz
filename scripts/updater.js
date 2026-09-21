const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

console.log('ProjectFlow Updater started...');

// Parse arguments
const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    params[args[i].substring(2)] = args[i + 1];
    i++;
  }
}

const currentDir = params.cwd || process.cwd();
const serverPid = params['server-pid'] ? parseInt(params['server-pid'], 10) : null;
const port = params.port || process.env.PORT || '3000';

const dataDir = path.join(currentDir, 'data');
const maintenanceFile = path.join(dataDir, '.maintenance');
const updateZip = path.join(dataDir, 'update.zip');
const updateErrorLog = path.join(dataDir, 'update_error.log');

const timestamp = Date.now();
const backupDir = path.join(currentDir, '..', `projectflow_backup_${timestamp}`);
const tempExtractDir = path.join(currentDir, '..', `projectflow_temp_extract_${timestamp}`);

function logError(msg, err) {
  const errorMsg = `[${new Date().toISOString()}] ERROR: ${msg} ${err ? (err.message || err) : ''}\n`;
  console.error(errorMsg);
  fs.appendFileSync(updateErrorLog, errorMsg);
}

function checkHealth(url, timeoutMs = 30000, intervalMs = 1500) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const attempt = () => {
      if (Date.now() - startTime > timeoutMs) {
        return reject(new Error('Health check timed out'));
      }

      const req = http.get(url, (res) => {
        // We are checking /api/health/maintenance.
        // It returns 503 if maintenance mode is on (which we haven't deleted yet)
        // or 200 if OK. Either way, if it responds, the server is UP!
        if (res.statusCode === 200 || res.statusCode === 503) {
          resolve(true);
        } else {
          setTimeout(attempt, intervalMs);
        }
      });

      req.on('error', () => {
        setTimeout(attempt, intervalMs);
      });
      req.end();
    };

    attempt();
  });
}

async function runUpdate() {
  let oldServerKilled = false;
  let newServerProcess = null;

  try {
    // 1. Snapshot Backup
    console.log(`Taking pre-update snapshot to ${backupDir}...`);
    if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
    fs.mkdirSync(backupDir, { recursive: true });

    // Copy critical code folders (skip data/ and node_modules/ if huge, but we need node_modules for rollback)
    // Standalone has minimal node_modules, so copy all except 'data' and '.git'
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      if (item === 'data' || item === '.git' || item.startsWith('projectflow_')) continue;
      fs.cpSync(path.join(currentDir, item), path.join(backupDir, item), { recursive: true, force: true });
    }

    // 2. Extract ZIP
    console.log(`Extracting ${updateZip} to ${tempExtractDir}...`);
    if (!fs.existsSync(updateZip)) throw new Error(`Update package not found at ${updateZip}`);
    
    if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.mkdirSync(tempExtractDir, { recursive: true });

    if (process.platform === 'win32') {
      execSync(`powershell -command "Expand-Archive -Path '${updateZip}' -DestinationPath '${tempExtractDir}' -Force"`, { stdio: 'inherit' });
    } else {
      execSync(`unzip -o "${updateZip}" -d "${tempExtractDir}"`, { stdio: 'inherit' });
    }

    let extractedProjectFlowDir = path.join(tempExtractDir, 'projectflow');
    if (!fs.existsSync(extractedProjectFlowDir)) {
      if (fs.existsSync(path.join(tempExtractDir, 'server.js'))) {
        extractedProjectFlowDir = tempExtractDir;
      } else {
        throw new Error('Invalid update package structure. Could not find server.js.');
      }
    }

    // 3. Terminate Old Process
    console.log(`Terminating old server process (PID: ${serverPid})...`);
    if (serverPid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /PID ${serverPid}`, { stdio: 'ignore' });
        } else {
          process.kill(serverPid, 'SIGTERM');
        }
        oldServerKilled = true;
        await new Promise(r => setTimeout(r, 2000)); // wait for locks to release
      } catch (err) {
        console.log(`Could not kill server PID ${serverPid}. It might already be stopped.`);
      }
    }

    // 4. Clean Directory Swap
    console.log('Swapping files cleanly...');
    // Delete old .next, public, server.js
    ['.next', 'public', 'server.js', 'scripts', 'package.json'].forEach(target => {
      const p = path.join(currentDir, target);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    });

    // Copy new files
    fs.cpSync(extractedProjectFlowDir, currentDir, { recursive: true, force: true });

    // 5. Cleanup temp extract
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.unlinkSync(updateZip);

    // 6. Relaunch Server
    console.log('Relaunching server...');
    const outLog = fs.openSync(path.join(dataDir, 'server.log'), 'a');
    const errLog = fs.openSync(path.join(dataDir, 'server-err.log'), 'a');

    // We start node server.js detached
    newServerProcess = spawn(process.execPath, [path.join(currentDir, 'server.js')], {
      cwd: currentDir,
      detached: true,
      stdio: ['ignore', outLog, errLog],
      env: {
        ...process.env,
        PORT: port,
        HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
        NODE_ENV: 'production'
      }
    });
    newServerProcess.unref();

    console.log(`New server spawned with PID: ${newServerProcess.pid}`);

    // 7. Health Check
    console.log('Running health check...');
    await checkHealth(`http://localhost:${port}/api/health/maintenance`);

    // Success!
    console.log('Update verified and successful!');
    if (fs.existsSync(maintenanceFile)) fs.unlinkSync(maintenanceFile);
    
    // Optionally remove backup
    fs.rmSync(backupDir, { recursive: true, force: true });

    process.exit(0);

  } catch (error) {
    logError('Update failed:', error);

    // AUTOMATIC ROLLBACK
    console.log('Initiating automatic rollback...');
    if (newServerProcess && newServerProcess.pid) {
      try {
        if (process.platform === 'win32') execSync(`taskkill /F /PID ${newServerProcess.pid}`, { stdio: 'ignore' });
        else process.kill(newServerProcess.pid, 'SIGKILL');
      } catch(e) {}
    }

    try {
      if (fs.existsSync(backupDir)) {
        console.log('Restoring from backup snapshot...');
        ['.next', 'public', 'server.js', 'scripts', 'package.json'].forEach(target => {
          const p = path.join(currentDir, target);
          if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
        });
        
        fs.cpSync(backupDir, currentDir, { recursive: true, force: true });
      }
    } catch(rollbackErr) {
      logError('Rollback failed:', rollbackErr);
    }

    if (fs.existsSync(maintenanceFile)) fs.unlinkSync(maintenanceFile);

    // Restart old server
    if (oldServerKilled) {
      console.log('Restarting previous server...');
      const outLog = fs.openSync(path.join(dataDir, 'server.log'), 'a');
      const errLog = fs.openSync(path.join(dataDir, 'server-err.log'), 'a');
      const oldProcess = spawn(process.execPath, [path.join(currentDir, 'server.js')], {
        cwd: currentDir,
        detached: true,
        stdio: ['ignore', outLog, errLog],
        env: { ...process.env, PORT: port, HOSTNAME: process.env.HOSTNAME || '0.0.0.0', NODE_ENV: 'production' }
      });
      oldProcess.unref();
    }

    process.exit(1);
  }
}

runUpdate();
