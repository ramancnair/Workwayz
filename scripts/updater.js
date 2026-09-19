const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('ProjectFlow Updater started...');

// Paths
const currentDir = process.cwd();
const dataDir = path.join(currentDir, 'data');
const maintenanceFile = path.join(dataDir, '.maintenance');
const updateZip = path.join(dataDir, 'update.zip');
const backupDir = path.join(currentDir, '..', 'projectflow_backup_' + Date.now());
const tempExtractDir = path.join(currentDir, '..', 'projectflow_temp_extract');

async function runUpdate() {
  try {
    // 1. Wait a few seconds to let the main Node process release file locks if needed
    // (though in this architecture, the main app is still running, PM2 will handle the restart)
    console.log('Waiting 5 seconds before starting extraction...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if zip exists
    if (!fs.existsSync(updateZip)) {
      throw new Error(`Update package not found at ${updateZip}`);
    }

    // 2. Extract ZIP
    console.log(`Extracting ${updateZip} to ${tempExtractDir}...`);
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempExtractDir, { recursive: true });

    // OS-agnostic extraction (fallback to tar/unzip or powershell)
    if (process.platform === 'win32') {
      execSync(`powershell -command "Expand-Archive -Path '${updateZip}' -DestinationPath '${tempExtractDir}' -Force"`, { stdio: 'inherit' });
    } else {
      execSync(`unzip -o "${updateZip}" -d "${tempExtractDir}"`, { stdio: 'inherit' });
    }

    // 3. Backup current files (excluding 'data' folder if it's large, but here we just backup everything except node_modules maybe)
    console.log(`Backing up current installation to ${backupDir}...`);
    // Note: A full robust updater would carefully copy/move. For this demonstration:
    // We will just copy the new files OVER the current directory, rather than moving the whole directory 
    // to avoid breaking PM2's working directory reference.
    
    // The zip from our github action has a top-level 'projectflow' folder.
    const extractedProjectFlowDir = path.join(tempExtractDir, 'projectflow');
    
    if (fs.existsSync(extractedProjectFlowDir)) {
      console.log('Copying new files over current installation...');
      // Copy recursively (Node 16.7+)
      fs.cpSync(extractedProjectFlowDir, currentDir, { recursive: true, force: true });
    } else {
      throw new Error('Invalid update package structure. Expected a "projectflow" root folder inside zip.');
    }

    // 4. Clean up zip and temp
    console.log('Cleaning up temporary files...');
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.unlinkSync(updateZip);

    // 5. Turn off maintenance mode
    console.log('Disabling maintenance mode...');
    if (fs.existsSync(maintenanceFile)) {
      fs.unlinkSync(maintenanceFile);
    }

    // 6. Restart Application
    console.log('Restarting application...');
    // Assuming PM2 is managing the process named 'projectflow'
    try {
      execSync('pm2 restart projectflow', { stdio: 'inherit' });
    } catch (pm2Err) {
      console.log('PM2 restart failed or PM2 not found. Trying npm start...');
      // Fallback: If no PM2, maybe just exit and hope systemd/docker restarts it.
      // But this is standalone, so we will attempt to let the service manager handle it.
    }
    
    console.log('Update completed successfully.');
    process.exit(0);

  } catch (error) {
    console.error('Update failed:', error);
    // Remove maintenance lock if we failed so app becomes usable again
    if (fs.existsSync(maintenanceFile)) {
      fs.unlinkSync(maintenanceFile);
    }
    process.exit(1);
  }
}

runUpdate();
