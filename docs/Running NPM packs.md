# Running Workwayz Release Packages: NPM, Standalone & Docker

This guide explains the three distribution formats available in Workwayz releases—**NPM Package (`.tgz`)**, **Next.js Standalone Bundle (`.tar.gz`)**, and **Docker Web Image (`workwayz-web-image-...tar.gz`)**—and provides step-by-step instructions on how to test and run each one.

---

## 1. Comparing the 3 Release Formats

All formats run the exact same **pre-compiled production Next.js code** with zero build or compilation steps required on the destination machine.

### Comparison Matrix

| Feature | **1. NPM Package (`.tgz` / `npx`)** | **2. Standalone Bundle (`.tar.gz`)** | **3. Docker Web Image (`.tar.gz`)** |
| :--- | :--- | :--- | :--- |
| **How it is executed** | `npx workwayz` or `workwayz` (if installed globally) | `node server.js` or `npm start` inside the folder | `docker compose up -d` or `docker run` |
| **Installation effort** | ⚡ **Zero install** via `npx`, or quick global install | 📂 Unpack `.tar.gz` and run `node server.js` | 🐳 Load tarball into Docker (`docker load -i ...`) |
| **Target audience** | Developers, evaluators, quick local trials | Sysadmins, bare-metal servers, Linux VMs without Docker | Production servers, container clusters, self-hosters |
| **Containerized?** | ❌ No (runs directly on host) | ❌ No (runs directly on host) | ✅ **Yes** (isolated Docker container) |
| **Dependencies needed** | Node.js (18+) + npm | Node.js (18+) runtime only | Docker Engine / Docker Desktop (Node.js not needed) |
| **Offline / Air-Gapped** | Requires npm unless local `.tgz` is supplied | 🔌 **Full offline support** (portable archive) | 🔌 **Full offline support** (portable container) |
| **Release Asset Name** | `workwayz-npm-v<tag>.tgz` | `workwayz-standalone-v<tag>.tar.gz` | `workwayz-web-image-v<tag>.tar.gz` |

---

## 2. How to Run Each Package Format

---

### Option 1: Running the NPM Package (`.tgz`)

When you download `workwayz-npm-v<tag>.tgz` from the GitHub Release page:

#### Method A: Run with `npx` directly (Zero Install)
Open your terminal in the folder containing the downloaded `.tgz`:
```bash
npx ./workwayz-npm-v7.0.1.tgz
```
`npx` will unpack the temporary bundle and launch the Next.js production server immediately at `http://localhost:3000`.

#### Method B: Install Globally as a System Command
```bash
# 1. Install globally
npm install -g ./workwayz-npm-v7.0.1.tgz

# 2. Run anywhere anytime
workwayz

# 3. (Optional) Uninstall later
npm uninstall -g workwayz
```

#### Method C: Run Directly from GitHub's Download URL (No Manual Download)
```bash
npm install -g https://github.com/ramancnair/Workwayz/releases/download/v7.0.1/workwayz-npm-v7.0.1.tgz
workwayz
```

---

### Option 2: Running the Standalone Bundle (`.tar.gz`)

The Standalone bundle is a lightweight (~19 MB), self-contained Node.js server with all runtime dependencies pre-packaged.

1. **Extract the archive:**
   ```bash
   tar -xzf workwayz-standalone-v7.0.1.tar.gz
   ```
   *(On Windows, you can also right-click and choose "Extract All")*

2. **Navigate into the extracted folder:**
   ```bash
   cd workwayz-standalone-v7.0.1
   ```

3. **Start the server:**
   ```bash
   node server.js
   ```
   *(Or run `npm start`—both work identically)*

4. Open your browser to **[http://localhost:3000](http://localhost:3000)**.

---

### Option 3: Running the Docker Web Image (`workwayz-web-image-...`)

The `workwayz-web-image-v<tag>.tar.gz` asset contains the complete, pre-built Docker image. It allows you to run Workwayz inside Docker without building from source or pulling from a remote registry.

#### Prerequisites
* **Docker Desktop** (Windows / macOS) or **Docker Engine** (Linux) must be installed and running.

#### Step 1: Download Files
From the GitHub Release page, download these two files into the same directory:
1. `workwayz-web-image-v7.0.1.tar.gz`
2. `docker-compose.yml`

#### Step 2: Load the Image into Docker
Open your terminal / command prompt in that directory and load the image using the `-i` (input) flag:

**Windows (PowerShell / Command Prompt):**
```powershell
docker load -i workwayz-web-image-v7.0.1.tar.gz
```

**Linux / macOS:**
```bash
docker load -i workwayz-web-image-v7.0.1.tar.gz
```

Docker will import the layers and confirm:
```text
Loaded image: workwayz-web:latest
```

#### Step 3: Run with Docker Compose (Recommended)
In the same folder where `docker-compose.yml` is located:
```bash
docker compose up -d
```
Workwayz is now running in the background at **[http://localhost:3000](http://localhost:3000)**!

#### Step 4: Or Run Directly with `docker run` (Without Compose)
```bash
docker run -d -p 3000:3000 --name workwayz workwayz-web:latest
```

#### Useful Docker Management Commands:
* **View application logs:**
  ```bash
  docker compose logs -f
  ```
* **Stop the container:**
  ```bash
  docker compose down
  ```
  *(Or `docker stop workwayz && docker rm workwayz` if using `docker run`)*

#### Alternative: Online Registry Pull (Zero File Download)
If your machine has internet access, you do not even need to download the `.tar.gz` file. You can pull the image straight from GitHub Container Registry:
```bash
docker run -d -p 3000:3000 --name workwayz ghcr.io/ramancnair/workwayz:latest
```

---

## 3. Configuration & Custom Ports

### Running on a Custom Port

#### NPM / NPX:
```bash
PORT=8080 npx ./workwayz-npm-v7.0.1.tgz
# Or on Windows PowerShell:
$env:PORT="8080"; npx ./workwayz-npm-v7.0.1.tgz
```

#### Standalone Node Server:
```bash
PORT=8080 node server.js
# Or on Windows PowerShell:
$env:PORT="8080"; node server.js
```

#### Docker:
Change the port mapping in `docker run` or `docker-compose.yml`:
```bash
docker run -d -p 8080:3000 --name workwayz workwayz-web:latest
```
*(Now accessible at `http://localhost:8080`)*

---

### Supplying Environment Variables
Workwayz automatically reads `.env.local` from your current directory when started with Node or npm. For Docker, specify an `.env` file or environment variables in `docker-compose.yml`:

```env
NEXT_PUBLIC_DB_PROVIDER=supabase
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
GEMINI_API_KEY=your-gemini-key
```
