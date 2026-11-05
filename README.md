<div align="center">

# <img src="https://cdn.jsdelivr.net/npm/workwayz/public/workwayz-icon.png" width="40" height="40" alt="Workwayz Logo" valign="middle" /> Workwayz

### The All-in-One AI-Powered Project & Portfolio Management Platform for Small & Medium Businesses

**Track projects end-to-end in a single unified workspace — from initial estimation and Agile/Waterfall delivery to QA testing, RAID governance, resource utilization, and billing.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/workwayz.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/workwayz)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org/)
[![AI-Powered](https://img.shields.io/badge/AI-Genkit%20%7C%20Multi--LLM-orange?logo=google)](https://firebase.google.com/docs/genkit)

---

> Built by a delivery management expert. Purpose-built for small and medium businesses that want complete end-to-end project visibility without juggling disconnected tools.

</div>

---

### ⚡ Quick Start

Launch Workwayz directly in your terminal — no repo cloning or manual build required:

```bash
# Option 1: Install globally via NPM (Recommended)
npm install -g workwayz
workwayz

# Option 2: Or run via NPX (Zero-Install evaluation)
npx workwayz@latest

# Option 3: Or run via Docker Container
docker run -d -p 3000:3000 -v workwayz-data:/app/data -e PORT=3000 workwayz/workwayz:latest
```

Once started, open **[http://localhost:3000](http://localhost:3000)** in your browser to complete the guided In-App Setup Wizard.

---

## Why Workwayz?

Small and medium businesses often struggle with tool sprawl — using one tool for project estimates, another for task boards, a third for QA test cases, spreadsheets for resource utilization and RAID logs, and separate software for client billing.

**Workwayz brings the entire project lifecycle into one unified platform:**
- **End-to-End Lifecycle Coverage** — Manage everything from Initial Estimation & Specifications, Project Releases, Product Backlog (`Add Requirement` & Escaped Defects), and Sprint/Kanban Execution to QA Test Management, In-Sprint Bug Tracking (`Bugs` & `Bug Tracker`), RAID Governance, Consolidated Resource & Time Off Management, and Client Invoicing.
- **Multi-tier AI Built In** — Combine one-click AI generators inside everyday workflows, natural-language Executive & Project PromptBoards with scheduled cron reports, and **WayFinder**, a full-fledged conversational AI agent.
- **Zero-Config Local or Cloud Deployment** — Run completely offline out-of-the-box with the built-in Local Embedded Database, or connect to Supabase (PostgreSQL) or Firebase via the guided In-App Setup Wizard.

---

## Feature Highlights

### Portfolio & End-to-End Project Management
- **Portfolio & Project Dashboards** — Multi-project portfolio health tracking, RAG status indicators, budget vs. actual burn, and delivery milestones at a glance.
- **Initial Estimation Studio** — Capture project specifications, impacted systems, WBS effort breakdowns, and cross-cutting horizontal effort before delivery begins.
- **Agile & Waterfall / Hybrid Delivery** — Manage user stories, sprints, Kanban swimlanes, development tasks, and release Gantt timelines across Fixed Price and Time & Materials (T&M) projects.
- **Resource Allocation & Capacity Planning** — Track employee skill sets, project allocations, billable utilization, bench availability, company holiday calendars, and team leave requests.
- **Built-in Billing, Rate Cards & Invoicing** — Configure role benchmark rate cards, track T&M and Fixed Price billing ledgers, and generate printable client invoices directly from project delivery data.

---

### Multi-Tier AI Capabilities *(The Game Changer)*

Workwayz integrates AI across three distinct layers — supporting **Google Gemini**, **OpenAI**, **Anthropic Claude**, and **Local LLMs (LM Studio / Ollama)**:

#### 1. One-Click Button-Based AI Generators & Assistants
Embedded directly inside project forms and tables to eliminate repetitive manual work:

| Button-Based AI Feature | Where It Lives | What It Does |
|---|---|---|
| **AI Tech Stack Suggestion** | Initial Estimation → Specifications | Recommends optimal frontend, backend, database, and cloud technologies from project requirements |
| **AI Horizontals Estimator** | Initial Estimation → Horizontals | Calculates recommended effort percentages for cross-cutting concerns (QA, DevOps, Security, PM, Architecture) |
| **AI Story & Backlog Generator** | Product Backlog | Generates structured Epics and User Stories with acceptance criteria from feature descriptions |
| **AI Sub-Task & Test Case Generator** | Backlog Grooming / Stories | One-click generation of development sub-tasks and linked QA test cases directly from a User Story |
| **AI Standalone Test Case Generator** | Testing → Test Cases | Drafts functional, boundary, and edge-case QA test scenarios from requirement prompts |
| **AI Task & Test Improvement Assistant** | Tasks & Test Cases | Reviews existing tasks and test cases to suggest actionable clarity and coverage improvements |
| **AI RAID Generators** | Governance → Risks, Assumptions, Dependencies | Automatically drafts project Risks, Assumptions, and Dependencies complete with impact ratings and mitigation plans |
| **AI Holiday Calendar Generator** | Resources / Holidays → Company Holidays | Auto-populates national and regional public holidays for any country and year |

#### 2. Executive & Project PromptBoards (`Portfolio PromptBoard` & `Project PromptBoard`)
- **Zero-Hallucination Natural Language Analytics** — Ask plain-English questions across your portfolio or individual projects (e.g., *"Show project RAG health status"*, *"Compare Fixed Bid vs T&M valuation"*, *"Show PM workload graph"*, *"What are our top critical risks and blockers?"*).
- **Instant Visuals & Data Tables** — Automatically renders executive KPI summary cards, interactive Recharts visualizations (bar, stacked health, donut share), and filterable, CSV-exportable data tables derived strictly from live database records.
- **Scheduled AI Cron Jobs** — Convert any PromptBoard query into a recurring scheduled job (daily, weekly, or custom cron) that automatically executes and delivers rich interactive reports to stakeholders' in-app message inboxes.

#### 3. WayFinder — Full-Fledged Interactive AI Agent
- **Conversational Workspace Agent** — Accessible anywhere via the floating WayFinder Agent drawer, equipped with **201 specialized tool-calling capabilities** via hybrid RAG retrieval across every module in Workwayz.
- **Read & Write Action Cards** — WayFinder doesn't just answer questions; it can create and update projects, draft backlog stories, log defects, register RAID items, allocate resources, manage leave/holidays, and update billing records via interactive confirmation cards.
- **Interactive Dependency Visualization** — Renders live node-and-edge dependency graphs inside the workspace to trace blockers across stories, tasks, and RAID items.

---

### Test Management & Quality Hub
- Create and manage **Test Cases** linked directly to User Stories and requirements.
- Execute test runs, log **In-Sprint Bugs** (`Bugs` & `Bug Tracker` under Testing) or **Escaped Defects** (`Add Requirement` → `Defect` in Product Backlog), and track resolution lifecycles.
- Monitor **Estimation Variance** and **Defect Containment** metrics with cadence breakdowns in the Quality Hub.

### RAID Governance Tracker
- Centralized **Risks, Assumptions, Issues & Dependencies** registers per project.
- Interactive **RAID Heatmap** and severity scoring with full ownership and mitigation tracking.

### Administration & Security
- **Role-Based Access Control (RBAC)** — Granular page and module permissions across Super Admin, Administrator, Senior Management, PMO, Project Manager, Lead, and Team Member roles.
- **In-App Setup Wizard** — Guided configuration for database engines, authentication providers, Super Admin onboarding, and AI model profiles.
- **Test Data Studio** — Built-in synthetic data generator for instant sandbox evaluation and demo environments.

---

## Installation & Quick Start (For Users & Teams)

You do **not** need to clone any Git repository or touch source code to run Workwayz. Choose either **NPX / NPM** or **Docker**:

| Method | Best For | Command |
|---|---|---|
| **Option 1: Global NPM Install (Recommended)** | Standard production CLI usage & office server deployment | `npm install -g workwayz && workwayz` |
| **Option 2: NPX Instant Run** | Quick temporary evaluation without permanent installation | `npx workwayz@latest` |
| **Option 3: Docker Container** | Self-hosting on a team server or cloud VM | `docker run -d -p 3000:3000 ...` |

---

### Option 1 — Install Globally via NPM (Recommended)

Ensure **[Node.js v20+](https://nodejs.org/)** is installed on your machine, then install Workwayz globally:

```bash
npm install -g workwayz
workwayz
```

### Option 2 — Instant Run via NPX (Zero-Install Evaluation)

Run Workwayz immediately without permanent installation:
```bash
npx workwayz@latest
```

#### Or install into a specific directory of your choosing:
```bash
# 1. Install Workwayz into your chosen folder (e.g., D:\Apps\Workwayz or ~/Apps/Workwayz)
npm install --prefix "D:\Apps\Workwayz" workwayz

# 2. Launch Workwayz from that custom folder
npx --prefix "D:\Apps\Workwayz" workwayz

# (Optional) Also store the local database & config files inside your custom folder instead of ~/.workwayz:
node "D:\Apps\Workwayz\node_modules\workwayz\bin\workwayz.js" --data-dir "D:\Apps\Workwayz\data"
```

1. Open your browser to **[http://localhost:3000](http://localhost:3000)**.
2. On first launch, the **In-App Setup Wizard** (`/setup-wizard`) opens automatically.
3. Choose the **Local Embedded Database (Zero-Config Default)** to start immediately offline, or connect your own **Supabase** or **Firebase** instance.
4. Create your **Super Admin** account and configure your preferred AI provider (or skip AI setup and configure it later under **Portfolio Settings → AI Config**).
5. All settings and local database records are persisted automatically in `~/.workwayz`, surviving restarts and package upgrades.

#### Uninstalling (NPX / NPM)
```bash
# 1. Remove the global CLI package (if installed via npm install -g)
npm uninstall -g workwayz

# 2. (Optional) Clear the npx cache if you ran via npx
npm cache clean --force

# 3. (Optional) If installed into a custom directory via --prefix, delete that folder
# macOS / Linux:
rm -rf ~/Apps/Workwayz
# Windows (PowerShell):
Remove-Item -Recurse -Force "D:\Apps\Workwayz"

# 4. (Optional) Delete default local database records and saved configuration profiles
# macOS / Linux:
rm -rf ~/.workwayz
# Windows (PowerShell):
Remove-Item -Recurse -Force "$HOME\.workwayz"
```

---

### Option 3 — Pre-Built Docker Container (Self-Hosting)

Run the pre-built production container directly without cloning the repository:

```bash
docker run -d \
  -p 3000:3000 \
  -v workwayz-data:/app/data \
  --name workwayz-web \
  --restart always \
  ghcr.io/ramancnair/workwayz:latest
```

1. Open **[http://localhost:3000](http://localhost:3000)** in your browser and complete the **In-App Setup Wizard**.
2. Your database and configuration profiles are stored persistently inside the `workwayz-data` Docker volume.

#### Running Supabase Locally on Docker (Optional)

For those who want to run **Supabase locally on Docker** instead of using the built-in Local Embedded Database or Supabase Cloud, follow these steps to spin up a lightweight local Supabase stack (pulling only the core containers Workwayz needs):

```bash
# 1. Initialize a local Supabase config (if running in a new folder)
npx supabase init

# 2. Start only the required Supabase containers on Docker Desktop
npx supabase start --exclude storage-api,imgproxy,edge-runtime,logflare,vector,supavisor
```

1. Once started, the terminal will print your local **`API URL`** (`http://127.0.0.1:54321`), **`Studio URL`** (`http://127.0.0.1:54323`), and **`anon key`**.
2. Open **Supabase Studio** (`http://127.0.0.1:54323` → **SQL Editor**), paste and run the SQL schema from [`docs/supabase-schema.sql`](./docs/supabase-schema.sql) to create the Workwayz tables.
3. In the Workwayz **In-App Setup Wizard** (or **Portfolio Settings → Database**), select **Supabase** and enter your local **`API URL`** and **`anon key`**.
   > *(Note: If Workwayz itself is running inside a Docker container on Windows/macOS, use `http://host.docker.internal:54321` as the Supabase URL so the container can reach your host's local Supabase port).*

#### Uninstalling (Docker)
```bash
# 1. Stop and remove the Workwayz container
docker stop workwayz-web && docker rm workwayz-web

# 2. Remove the Workwayz Docker image
docker rmi ghcr.io/ramancnair/workwayz:latest

# 3. (Optional) Permanently delete the persistent data volume
docker volume rm workwayz-data

# 4. (Optional) If running local Supabase on Docker, stop and remove its containers & volumes
npx supabase stop --no-backup
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Application Framework** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **UI & Styling** | Tailwind CSS, Radix UI Primitives, Lucide Icons, `next-themes` (Dark & High-Contrast Light Themes) |
| **AI & Agent Orchestration** | Google Genkit (`@genkit-ai/next`) with multi-provider support: **Google Gemini**, **OpenAI**, **Anthropic Claude**, **Ollama**, and **LM Studio** |
| **Database Engines** | Built-in **Local Embedded Database** (zero-config default) · **Supabase (PostgreSQL)** · **Firebase Firestore** |
| **Authentication** | Built-in **Local Auth** · **Supabase Auth** · **Firebase Auth** · **Keycloak (v26)** |
| **Analytics & Visualizations** | Recharts (dashboards & PromptBoards), React Flow (`@xyflow/react` + `dagre` dependency graphs), custom Release & Sprint Gantt engine |
| **Interactive Boards & Forms** | `@dnd-kit` (Kanban & backlog drag-and-drop), React Hook Form + Zod schema validation |
| **Logging & Diagnostics** | Winston (`winston-daily-rotate-file`) + built-in Test Data Studio |
| **Developer QA Suite** | Vitest + React Testing Library (unit/integration), Playwright (end-to-end browser automation) |

---

## For Developers (Source Build & Quality Assurance)

> **Note:** Everything below is strictly for developers modifying or extending Workwayz source code. End-users and SMB teams should use **Option 1 (`npx workwayz@latest`)** or **Option 2 (Docker)** above.

### Building from Source

```bash
# 1. Clone the repository
git clone https://github.com/ramancnair/Workwayz.git
cd Workwayz

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser. To create a production build locally:

```bash
npm run build
npm start
```

### Developer Quality Assurance & Automated Testing

Workwayz includes an automated verification suite for contributors and developers:

#### 1. Linting & Type Checking
```bash
npm run lint
npm run typecheck
```

#### 2. Unit & Component Testing (Vitest)
```bash
# Run all unit and integration tests
npm test

# Interactive watch mode / visual UI
npm run test:watch
npm run test:ui
```

#### 3. End-to-End Browser Automation (Playwright)
```bash
# Run the full 9-pillar E2E test suite
npm run test:e2e

# Launch interactive Playwright UI runner
npm run test:e2e:ui

# View HTML test report
npm run test:e2e:report
```

#### 4. Living Test Traceability
- **[Workwayz_Test_Plan.html](./Workwayz_Test_Plan.html)** — Auto-synced living test matrix updated by Vitest and Playwright reporters.
- **[docs/testplan.md](./docs/testplan.md)** — Test specification and traceability documentation.

---

## License

Distributed under the **Apache 2.0 License**. See `LICENSE` for more information.

---

<div align="center">

**Built with precision. Powered by AI. Designed for end-to-end project delivery.**

[Report a Bug](https://github.com/ramancnair/Workwayz/issues) · [Request a Feature](https://github.com/ramancnair/Workwayz/issues) · [Discussions](https://github.com/ramancnair/Workwayz/discussions)

</div>
