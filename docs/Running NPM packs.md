# Running ProjectFlow NPM Packages & Standalone Builds

This guide explains the difference between the **NPM Package (`.tgz` / `npx`)** and the **Next.js Standalone Bundle (`.tar.gz`)**, and provides step-by-step instructions on how to test and run them directly from GitHub releases before publishing to the public npm registry.

---

## 1. Comparing NPM Packages vs. Standalone Builds

Both distribution formats run the exact same **pre-compiled production Next.js code** with zero build or compilation steps required on the user's system. However, they serve different delivery workflows and deployment scenarios.

### Comparison Matrix

| Feature | **NPM Package (`npx` / `.tgz`)** | **Standalone Bundle (`.tar.gz`)** |
| :--- | :--- | :--- |
| **How it is executed** | Single command: `npx projectflow` (or `projectflow` if installed globally) | Unpacked directory: `node server.js` (or `npm start`) |
| **Installation effort** | ⚡ **Zero install** via `npx`, or standard global install via `npm install -g` | 📂 Download, extract archive, and execute |
| **Primary distribution channel** | npm Registry (`npmjs.com`) or GitHub Release `.tgz` asset | GitHub Release `.tar.gz` asset |
| **Target audience** | Developers, evaluators, quick local trials | System administrators, Linux VMs, bare-metal servers, Dockerless production hosts |
| **Offline / Air-Gapped support** | Requires npm/internet unless local `.tgz` is supplied | 🔌 **Full offline support** — can be transferred via USB or local network |
| **Update mechanism** | Automatic with `npx projectflow@latest` or `npm update -g` | Download the new release `.tar.gz` archive |
| **Runtime requirements** | Node.js (18+) + npm | Node.js (18+) runtime only (npm is not required) |

### Why Having Both is Advantageous
1. **The NPM Package** provides the fastest possible trial experience: anyone with Node.js installed can launch ProjectFlow in seconds with a single terminal command.
2. **The Standalone Bundle** provides a clean, self-contained server package ideal for long-running server hosting with system managers (such as `systemd` or `pm2`).

---

## 2. Running the NPM Package Before Publishing to `npmjs.com`

Before the package name or domain is finalized on `npmjs.com`, GitHub Actions creates pre-built release assets attached to each GitHub Release. You can test and run these packages on any computer using any of the methods below.

### Method A: Run with `npx` from the Downloaded `.tgz` (Zero Install)

When you download the package archive (e.g., `projectflow-npm-v0.1.0.tgz`) from the GitHub Release page:

1. Open your terminal in the directory where the file was downloaded.
2. Run the package directly using `npx`:
   ```bash
   npx ./projectflow-npm-v0.1.0.tgz
   ```
3. `npx` will unpack the temporary bundle and launch the Next.js production server immediately at:
   ```text
   http://localhost:3000
   ```

---

### Method B: Install Globally from the Local `.tgz`

To install the application as a permanent system command on your machine:

1. In your terminal, run:
   ```bash
   npm install -g ./projectflow-npm-v0.1.0.tgz
   ```
2. Once installed, start ProjectFlow from any terminal window simply by typing:
   ```bash
   projectflow
   ```
3. *(Optional)* To remove or uninstall it later:
   ```bash
   npm uninstall -g projectflow
   ```

---

### Method C: Run Directly from GitHub's Download URL (No Manual Download)

Because both `npm` and `npx` can fetch tarballs directly from HTTPS URLs, you can install or run a release directly using its GitHub Release asset URL:

```bash
# Global install straight from GitHub Release URL:
npm install -g https://github.com/ramancnair/ProjectFlow/releases/download/v0.1.0/projectflow-npm-v0.1.0.tgz

# Launch the server:
projectflow
```

---

### Method D: Running the Standalone Bundle (`.tar.gz`)

If you downloaded the Standalone archive (`projectflow-standalone-v0.1.0.tar.gz`):

1. Extract the tarball:
   ```bash
   tar -xzf projectflow-standalone-v0.1.0.tar.gz
   ```
2. Navigate into the extracted folder (or run in place):
   ```bash
   node server.js
   ```

---

## 3. Configuration & Custom Ports

You can pass standard environment variables when launching the server with any method:

### Running on a Custom Port
```bash
# Using npx
PORT=8080 npx ./projectflow-npm-v0.1.0.tgz

# Using global command
PORT=8080 projectflow

# Using standalone server
PORT=8080 node server.js
```

### Passing Environment Files
ProjectFlow automatically looks for `.env.local` or environment variables in your current working directory. You can provide your Firebase, Supabase, or Gemini keys in a local `.env.local` file in the folder where you launch the command:

```env
NEXT_PUBLIC_DB_PROVIDER=supabase
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
GEMINI_API_KEY=your-gemini-key
```
