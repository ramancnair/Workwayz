# ProjectFlow: Build Size, Packaging & Distribution Guide

This document compiles the architecture, folder size analysis, and distribution strategies for ProjectFlow across Docker, desktop bundles, and the npm registry.

---

## 1. Build Size vs. Raw Folder Size

When compiling ProjectFlow, folder sizes behave differently depending on the context:

| Context | Raw / Dev Size | Production Built Size | Size Change | What It Contains |
| :--- | :--- | :--- | :--- | :--- |
| **Local Development Folder** | ~3.2 GB | **~3.9 GB** | **+15% to +20%** (increases) | Source code, 1.16 GB dev `node_modules`, full `.git` history, and `.next` dev/build cache |
| **Server / Desktop Deployment Artifact** | ~3.9 GB | **~54 MB** (uncompressed)<br>**~14 MB** (zipped) | **Reduced by ~98%** | Compiled standalone server, client assets, and pruned production-only dependencies |
| **Loaded Docker Container** | ~3.9 GB | **~200 MB – 250 MB** | **Reduced by ~94%** | Minimal Alpine Linux runtime, Node.js runtime, and standalone production files |
| **End-User Browser Payload** | ~15 MB – 25 MB | **~150 KB – 400 KB** per page | **Reduced by ~95% – 98%** | Minified, tree-shaken, code-split JavaScript and CSS served with Gzip/Brotli |

### Why the Local Dev Folder Grows
Running `npm run build` on your local development machine does not delete your source files (`src/`), your Git history (`.git/`), or your development packages (`node_modules/`). Instead, Next.js writes build outputs, server chunks, and compilation caches into `.next/`, which increases the size of your local project directory.

---

## 2. Why the GitHub Release Is Under 100 MB

In GitHub Releases, the published Docker container archive (`projectflow-web-image-v*.tar.gz`) is typically **~70 MB to 95 MB**, while the running container is **~200 MB to 250 MB**.

### Key Factors Behind the Small Release Size:
1. **`gzip -9` Compression**:
   In [`.github/workflows/release.yml`](../.github/workflows/release.yml), the build workflow compresses the exported Docker image tarball with maximum gzip compression:
   ```bash
   gzip -9 /tmp/projectflow-web-image.tar
   mv /tmp/projectflow-web-image.tar.gz ./projectflow-web-image-v${{ github.ref_name }}.tar.gz
   ```
   Because code, JSON, and Linux binaries have high repetition, gzip compresses the ~220 MB `.tar` image by 60%–70%, yielding an archive under 100 MB.
2. **Next.js Dependency Tracing (`output: 'standalone'`)**:
   Configured in [`next.config.ts`](../next.config.ts). Next.js traces the imports of `server.js` and discards all unused development packages.
3. **Minimal Alpine Base Image**:
   The [`Dockerfile`](../Dockerfile) uses `node:20-alpine` (~40 MB base) and multi-stage builds. The final `runner` stage copies only:
   * `.next/standalone`
   * `.next/static`
   * `public`
   * `docker-entrypoint.sh`

---

## 3. Non-Docker Desktop Distribution (Without 3 GB+ Bloat)

You can distribute a non-dockerized build for desktops (Windows, macOS, Linux) without requiring users to download development tools or raw dependencies.

### Real ProjectFlow Measurements:
* **`.next/standalone`** (compiled server + minimal production dependencies): **48.65 MB**
* **`.next/static`** (compiled client JS & CSS): **5.14 MB**
* **Total uncompressed desktop folder**: **~54 MB**
* **Downloadable `.zip` archive**: **~13.3 MB**

### How Desktop Distribution Works:
1. **Developer builds**:
   ```bash
   npm run build
   # Copy static assets and public assets into standalone directory:
   cp -r .next/static .next/standalone/.next/static
   cp -r public .next/standalone/public
   ```
2. **Package for release**:
   Zip the `.next/standalone` folder as `projectflow-desktop-vX.X.zip` (~14 MB).
3. **End-user experience**:
   * User downloads `projectflow-desktop-vX.X.zip` (~14 MB).
   * User extracts the zip (unpacks to ~54 MB).
   * User runs `start.bat` (Windows) or `start.sh` (Mac/Linux), which invokes `node server.js`.
   * The app opens immediately at `http://localhost:3000`.
   * **The user never runs `npm install` and never downloads the 3 GB dev environment.**

### Node.js Desktop Runtime Options:
* **Option A (Requires Node.js)**: User has Node.js installed on their computer. (Download size: **~14 MB**).
* **Option B (Zero Pre-requisites / Portable Node)**: Include a portable `node.exe` (~40 MB) inside the zip archive alongside a simple launch script. (Download size: **~55 MB**, extracts to **~110 MB**). Runs on any clean machine without installing anything.

---

## 4. The Truth About `node_modules` (Dev vs. Runtime)

### Do we need the root 1.16 GB `node_modules` folder to run the app?
**No. The production app does not use the root `node_modules` folder.**

### Breakdown of What's Inside:
* **Root `node_modules/` (~1,164 MB)**:
  * **98% (~1,144 MB)** is developer tooling: TypeScript compiler, Vitest test runner, Playwright test framework & browser binaries, ESLint, Tailwind CSS compiler, and type definition packages (`@types/*`).
  * These files are only needed by developers to write, build, and test code.
* **`.next/standalone/node_modules/` (~20.02 MB)**:
  * **2% (~20 MB)** is the actual runtime subset required by `server.js` (e.g., core Next.js runtime, Radix UI primitives, date utilities).
  * Next.js automatically isolates this 20 MB subset during `npm run build` and places it inside the standalone directory.

---

## 5. Distributing via the npm Registry

You can publish ProjectFlow directly to the npm registry (similar to tools like `npx prisma studio` or `npx vercel`).

### User Experience:
#### Instant Zero-Install Run:
```bash
npx projectflow
```
* Downloads the compressed ~14 MB package into temporary npm cache.
* Launches the server on `http://localhost:3000` and opens the browser.

#### Global CLI Installation:
```bash
npm install -g projectflow
projectflow
```

### How Version Updates Work:
1. **Publishing Updates**:
   Bump the version in `package.json` and publish:
   ```bash
   npm version patch   # e.g., 1.0.0 -> 1.0.1
   npm publish
   ```
2. **Client Updates**:
   * Users running `npx projectflow@latest` always get the newest version automatically on each run.
   * Users with global installs update with a single command:
     ```bash
     npm update -g projectflow
     ```
3. **In-App Update Alerts**:
   The app can query `https://registry.npmjs.org/projectflow/latest` on startup. If a newer semver tag exists, an in-app banner can alert the user:
   > *"A new version (v1.1.0) is available! Run `npm update -g projectflow` to update."*

### Configuring `package.json` for npm Distribution:
To ensure only the standalone build is uploaded (and never the raw source or 1.16 GB `node_modules`), specify the `"files"` and `"bin"` fields in `package.json`:

```json
{
  "name": "projectflow",
  "version": "1.0.0",
  "bin": {
    "projectflow": "./bin/cli.js"
  },
  "files": [
    "bin/",
    ".next/standalone/",
    ".next/static/",
    "public/"
  ]
}
```

### CLI Launcher (`bin/cli.js`):
```javascript
#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');

process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = '0.0.0.0';

const serverPath = path.join(__dirname, '../.next/standalone/server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env,
});

console.log(`\n🚀 ProjectFlow running at http://localhost:${process.env.PORT}\n`);
```

### Public vs. Private Distribution:
* **Public**: Free and globally cached on npmjs.com for anyone to run via `npx`.
* **Private**: For internal or enterprise use, you can publish to **GitHub Packages** (`npm publish --registry=https://npm.pkg.github.com`) or a private npm organization.
