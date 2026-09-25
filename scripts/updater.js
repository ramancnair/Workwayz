const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

console.log('ProjectFlow Standalone Updater started...');

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
const updateFile = path.join(dataDir, 'update_package'); // generic name for .tgz or .zip
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
    // Locate the update package (could be .tgz or .zip or update_package)
    let packagePath = updateFile;
    if (!fs.existsSync(packagePath)) {
      if (fs.existsSync(path.join(dataDir, 'update.tgz'))) packagePath = path.join(dataDir, 'update.tgz');
      else if (fs.existsSync(path.join(dataDir, 'update.zip'))) packagePath = path.join(dataDir, 'update.zip');
      else throw new Error('Update package file not found in data directory.');
    }

    // 1. Snapshot Backup
    console.log(`Taking pre-update snapshot to ${backupDir}...`);
    if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
    fs.mkdirSync(backupDir, { recursive: true });

    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      if (item === 'data' || item === '.git' || item.startsWith('projectflow_')) continue;
      fs.cpSync(path.join(currentDir, item), path.join(backupDir, item), { recursive: true, force: true });
    }

    // 2. Extract Package
    console.log(`Extracting ${packagePath} to ${tempExtractDir}...`);
    if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.mkdirSync(tempExtractDir, { recursive: true });

    if (packagePath.endsWith('.tgz') || packagePath.endsWith('.tar.gz')) {
      // Tar extraction
      execSync(`tar -xzf "${packagePath}" -C "${tempExtractDir}"`, { stdio: 'inherit' });
    } else {
      // Zip extraction
      if (process.platform === 'win32') {
        execSync(`powershell -command "Expand-Archive -Path '${packagePath}' -DestinationPath '${tempExtractDir}' -Force"`, { stdio: 'inherit' });
      } else {
        execSync(`unzip -o "${packagePath}" -d "${tempExtractDir}"`, { stdio: 'inherit' });
      }
    }

    // Handle extraction directory layout
    // npm pack creates a 'package/' directory. GitHub actions zip might create 'projectflow/'.
    let sourceDir = tempExtractDir;
    if (fs.existsSync(path.join(tempExtractDir, 'package'))) {
      sourceDir = path.join(tempExtractDir, 'package');
    } else if (fs.existsSync(path.join(tempExtractDir, 'projectflow'))) {
      sourceDir = path.join(tempExtractDir, 'projectflow');
    }

    // Restore bundled_node_modules if npm stripped node_modules
    const bundledModules = path.join(sourceDir, 'bundled_node_modules');
    const targetModules = path.join(sourceDir, 'node_modules');
    if (fs.existsSync(bundledModules) && !fs.existsSync(targetModules)) {
      console.log('Restoring bundled_node_modules to node_modules...');
      fs.renameSync(bundledModules, targetModules);
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
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.log(`Could not kill server PID ${serverPid}. It might already be stopped.`);
      }
    }

    // 4. Clean Directory Swap
    console.log('Swapping files cleanly...');
    ['.next', 'public', 'server.js', 'scripts', 'package.json', 'node_modules'].forEach(target => {
      const p = path.join(currentDir, target);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    });

    // Copy new files over
    fs.cpSync(sourceDir, currentDir, { recursive: true, force: true });

    // 5. Cleanup temp extract and package file
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    if (fs.existsSync(packagePath)) fs.unlinkSync(packagePath);

    // 6. Relaunch Server
    console.log('Relaunching server...');
    const outLog = fs.openSync(path.join(dataDir, 'server.log'), 'a');
    const errLog = fs.openSync(path.join(dataDir, 'server-err.log'), 'a');

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
    
    // Remove backup on confirmed success
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
        ['.next', 'public', 'server.js', 'scripts', 'package.json', 'node_modules'].forEach(target => {
          const p = path.join(currentDir, target);
          if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
        });
        
        fs.cpSync(backupDir, currentDir, { recursive: true, force: true });
      }
    } catch(rollbackErr) {
      logError('Rollback failed:', rollbackErr);
    }

    if (fs.existsSync(maintenanceFile)) fs.unlinkSync(maintenanceFile);

    // Restart old server if killed
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
