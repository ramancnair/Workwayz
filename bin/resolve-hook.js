// Dynamic module resolution hook to transparently map Turbopack hashed external module names
// (e.g. express-f618ca94d4f3823e -> express, import-in-the-middle-ac114f323ad7e863 -> import-in-the-middle)
// back to their canonical package names in node_modules when running via 'next start'.

const Module = require('module');
const origResolve = Module._resolveFilename;

// Match pattern: <package-name>-<16-hex-chars> or @<scope>/<pkg>-<16-hex-chars>
const HASHED_EXTERNAL_REGEX = /^(@?[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)?)-[a-f0-9]{16}$/i;

Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    if (err && (err.code === 'MODULE_NOT_FOUND' || err.message?.includes('Cannot find module'))) {
      const match = typeof request === 'string' ? request.match(HASHED_EXTERNAL_REGEX) : null;
      if (match && match[1]) {
        try {
          return origResolve.call(this, match[1], parent, isMain, options);
        } catch (_) {
          // If fallback fails, throw original error below
        }
      }
    }
    throw err;
  }
};
