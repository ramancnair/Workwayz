const fs = require('fs');
const path = require('path');

const targetServer = path.join(process.cwd(), 'release-standalone', 'projectflow', 'server.js');
if (fs.existsSync(targetServer)) {
  const orig = fs.readFileSync(targetServer, 'utf-8');
  const patch = `// Auto-heal: restore bundled_node_modules to node_modules if needed
const _fs = require("fs");
const _path = require("path");
const _bundled = _path.join(__dirname, "bundled_node_modules");
const _target = _path.join(__dirname, "node_modules");
if (_fs.existsSync(_bundled) && !_fs.existsSync(_target)) {
  try {
    _fs.renameSync(_bundled, _target);
    console.log("Restored bundled_node_modules to node_modules");
  } catch (err) {
    console.warn("Could not auto-restore bundled_node_modules:", err);
  }
}
`;
  fs.writeFileSync(targetServer, patch + orig, 'utf-8');
  console.log('Successfully injected auto-heal bootstrap into standalone server.js');
} else {
  console.warn('Target server.js not found at:', targetServer);
}
