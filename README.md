<div align="center">

# <img src="public/logo.png" width="40" height="40" alt="ProjectFlow Logo" valign="middle" /> ProjectFlow

### The Enterprise-Grade AI-Powered Project & Portfolio Management Platform

**The only PPM tool that unifies SAFe Agile & Hybrid — in one intelligent platform.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js](https://img.shields.io/badge/Next.js-Latest-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![AI-Powered](https://img.shields.io/badge/AI-Genkit%20%7C%20Gemini-orange?logo=google)](https://firebase.google.com/docs/genkit)

---

> Built by a delivery management expert. Designed for teams that demand more than just task tracking.

</div>

---

## Why ProjectFlow?

Most project management tools make you choose — strategy **or** execution, cloud **or** offline. ProjectFlow makes no such compromise.

It is the **only PPM platform** that natively supports **SAFe Agile and Hybrid delivery methodologies** in a single unified workspace. Layered on top is a deep AI integration that eliminates the most time-consuming parts of project management — estimations, story writing, test case generation, and more.

Whether you are running a startup or a large enterprise PMO, ProjectFlow scales with you — and can run entirely **offline** if needed.

---

## Feature Highlights

### Portfolio & Project Management
- **Full Portfolio Management** — Multi-project portfolio dashboards with real-time health tracking, cost visibility, and delivery status across your entire program
- **SAFe Agile & Hybrid** — Supports both methodologies natively; no plugins, no workarounds
- **PM Dashboard** — Dedicated project manager view tracking team velocity, individual workload, overall cost burn, and delivery health at a glance
- **Development Dashboard** — Engineering-focused view with sprint progress, backlog health, and delivery metrics

### AI-Powered Automation *(The Game Changer)*
ProjectFlow is **tightly integrated with AI** to eliminate repetitive, time-consuming work:

| AI Capability | What It Does |
|---|---|
| **Smart Estimation** | AI-assisted effort and complexity estimation for stories and tasks |
| **Story Generation** | Generate user stories and sub-tasks from feature descriptions |
| **Test Case Creation** | Automatically draft test cases from acceptance criteria |
| **Stack Suggestion** | AI-driven technology stack recommendations based on project requirements |
| **Horizontals Estimation** | AI calculates cross-cutting concern effort (security, infra, DevOps) automatically |
| **Sizing & Complexity** | AI scoring for backlog grooming and sprint planning |

### Test Management *(Full Suite)*
- Create and manage **Test Plans** end-to-end
- Link test cases directly to requirements and user stories
- Track test execution, results, and defect traceability — all in one place

### RAID Tracker *(Unique to ProjectFlow)*
> No other project management software has this built in.

- Centralized **Risks, Assumptions, Issues & Dependencies** register
- Automated escalation tracking and mitigation planning
- Full audit history and ownership assignment

### PMO & Governance
- **PMO Support** — Programme-level governance controls, reporting, and oversight dashboards
- **User Management** — Role-based access control, team assignment, and permission management
- **Billing & Invoice Management** — Full financial module built in; track budgets, raise invoices, and reconcile costs without a separate tool

### Flexible by Design
- **Databases** — Supports Firebase, Supabase, and local/offline storage
- **Authentication** — Keycloak, Firebase Auth, and more
- **AI / GenAI Services** — Google Gemini via Genkit; swap providers as needed
- **Deployment** — Run on **any cloud** or **fully offline** on your own infrastructure

---

## Download & Installation

### Prerequisites

Ensure the following are installed on your machine before proceeding:

| Requirement | Version | Install |
|---|---|---|
| **Node.js** | v18 or higher | [nodejs.org](https://nodejs.org/) |
| **npm** | v9 or higher (bundled with Node.js) | Included with Node.js |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **Keycloak** *(optional)* | v26+ | See section below |

---

### Step 1 — Install Node.js & npm

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS (via Homebrew):**
```bash
brew install node
```

**Windows:**
Download the installer from [nodejs.org](https://nodejs.org/) and run it.

Verify the installation:
```bash
node --version   # Should output v18.x.x or higher
npm --version    # Should output v9.x.x or higher
```

---

### Step 2 — Clone the Repository

```bash
git clone https://github.com/ramancnair/ProjectFlow.git
cd ProjectFlow
```

---

### Step 3 — Install Dependencies

```bash
npm install
```

---

## Quick Start & Deployment Options

ProjectFlow can be run in two ways depending on your use case:
* **Option 1: Docker Compose + In-App Setup Wizard** — *Zero-config setup for self-hosters & on-premise.*
* **Option 2: Local Development / Cloud Hosting via `.env`** — *Ideal for contributors, DevOps, and cloud deployment.*

---

### Option 1 — Docker Compose (Recommended for Self-Hosting)

The fastest way to deploy ProjectFlow locally or on a server:

```bash
# 1. Clone the repository
git clone https://github.com/ramancnair/ProjectFlow.git
cd ProjectFlow

# 2. Start the container stack
docker compose up -d
```

1. Open your browser to **[http://localhost:3000](http://localhost:3000)**.
2. If this is your first run, ProjectFlow will launch the **In-App Setup Wizard** (`/setup-wizard`).
3. Follow the on-screen steps to select your backend (**Firebase**, **Supabase Cloud**, or **Supabase Docker**) and enter your API keys.
4. Settings are automatically persisted inside the Docker named volume (`projectflow-data`), surviving restarts and updates.

---

### Option 2 — Local Development / Cloud Hosting

#### Step 1 — Install Dependencies
Ensure you have **Node.js 18+** installed.
```bash
git clone https://github.com/ramancnair/ProjectFlow.git
cd ProjectFlow
npm install
```

#### Step 2 — Configure Environment Variables
Copy the template `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your chosen database and AI provider:

##### A. Using Supabase Cloud (Managed Postgres)
```env
NEXT_PUBLIC_DB_PROVIDER=supabase
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

##### B. Using Supabase Docker (Self-Hosted / Local)
```env
NEXT_PUBLIC_DB_PROVIDER=supabase
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
GEMINI_API_KEY=your_google_gemini_api_key
```

##### C. Using Firebase (Cloud Firestore & Auth)
```env
NEXT_PUBLIC_DB_PROVIDER=firebase
NEXT_PUBLIC_AUTH_PROVIDER=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
GEMINI_API_KEY=your_google_gemini_api_key
```

#### Step 3 — Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

#### Step 4 — Production Build
```bash
npm run build
npm start
```

---

## Quality Assurance & Automated Testing

ProjectFlow features an enterprise-grade automated testing system:

### 1. Unit & Component Testing (Vitest)
```bash
# Run unit tests
npm test

# Interactive watch mode
npm run test:watch

# Launch Vitest visual browser UI
npm run test:ui
```

### 2. End-to-End Automation (Playwright)
```bash
# Run E2E test suite headlessly
npm run test:e2e

# Interactive UI test runner
npm run test:e2e:ui

# View latest HTML test run report
npm run test:e2e:report

# Install browser binaries if needed
npm run test:e2e:install
```

### 3. Living Traceability & Sitemaps
- **[ProjectFlow_Test_Plan.html](./ProjectFlow_Test_Plan.html)**: Interactive living test matrix covering 30+ enterprise verification checkpoints.
- **[ProjectFlow_Sitemap.html](./ProjectFlow_Sitemap.html)**: Interactive application topology and view hierarchy across Global Portfolio and Project Detail hubs.
- **[docs/testplan.md](./docs/testplan.md)**: Markdown test plan with full traceability IDs and assertion criteria.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend & Backend** | Next.js (React 19, TypeScript) |
| **Styling** | Tailwind CSS, Radix UI |
| **AI / GenAI** | Google Genkit + Gemini |
| **Database** | Firebase Firestore · Supabase · Local |
| **Authentication** | Keycloak · Firebase Auth |
| **Charts & Gantt** | Recharts, custom Gantt engine |
| **Drag & Drop** | dnd-kit |
| **Forms & Validation** | React Hook Form + Zod |

---

## Roadmap

- [ ] Multi-tenant enterprise support
- [ ] Additional AI provider integrations (OpenAI, Anthropic Claude)
- [ ] Advanced predictive risk models
- [ ] Mobile app (iOS & Android)
- [ ] Slack & MS Teams integration
- [ ] API-first mode for third-party integrations

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

---

## License

Distributed under the **Apache 2.0 License**. See `LICENSE` for more information.

---

<div align="center">

**Built with precision. Powered by AI. Designed for delivery.**

[Report a Bug](https://github.com/ramancnair/ProjectFlow/issues) · [Request a Feature](https://github.com/ramancnair/ProjectFlow/issues) · [Discussions](https://github.com/ramancnair/ProjectFlow/discussions)

</div>
