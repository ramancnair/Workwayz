const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('ProjectFlow Docker Updater started...');

const currentDir = process.cwd();
const dataDir = path.join(currentDir, 'data');
const updateZip = path.join(dataDir, 'update.zip');
const tempExtractDir = path.join(dataDir, 'update_extract');
const appOverrideDir = path.join(dataDir, 'app_override');
const maintenanceFile = path.join(dataDir, '.maintenance');

function logError(msg, err) {
  const errorMsg = `[${new Date().toISOString()}] ERROR: ${msg} ${err ? (err.message || err) : ''}\n`;
  console.error(errorMsg);
  const updateErrorLog = path.join(dataDir, 'update_error.log');
  fs.appendFileSync(updateErrorLog, errorMsg);
}

try {
  // 1. Extract ZIP
  console.log(`Extracting ${updateZip} to ${tempExtractDir}...`);
  if (!fs.existsSync(updateZip)) throw new Error(`Update package not found at ${updateZip}`);
  
  if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
  fs.mkdirSync(tempExtractDir, { recursive: true });

  // In alpine docker, unzip is available
  execSync(`unzip -o "${updateZip}" -d "${tempExtractDir}"`, { stdio: 'inherit' });

  let extractedProjectFlowDir = path.join(tempExtractDir, 'projectflow');
  if (!fs.existsSync(extractedProjectFlowDir)) {
    if (fs.existsSync(path.join(tempExtractDir, 'server.js'))) {
      extractedProjectFlowDir = tempExtractDir;
    } else {
      throw new Error('Invalid update package structure. Could not find server.js.');
    }
  }

  // 2. Stage the files persistently to app_override
  console.log(`Staging files persistently to ${appOverrideDir}...`);
  if (fs.existsSync(appOverrideDir)) fs.rmSync(appOverrideDir, { recursive: true, force: true });
  fs.mkdirSync(appOverrideDir, { recursive: true });

  const items = fs.readdirSync(extractedProjectFlowDir);
  for (const item of items) {
    fs.renameSync(path.join(extractedProjectFlowDir, item), path.join(appOverrideDir, item));
  }
  
  // Cleanup temp extract and zip
  if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
  if (fs.existsSync(updateZip)) fs.unlinkSync(updateZip);
  
  console.log('Update staged persistently to app_override. Ready for boot-time copy.');

  // 3. Graceful Suicide to trigger Docker restart
  console.log('Exiting process to trigger Docker container restart...');
  process.exit(0);

} catch (error) {
  logError('Docker staging failed:', error);
  if (fs.existsSync(maintenanceFile)) fs.unlinkSync(maintenanceFile);
  process.exit(1);
}
