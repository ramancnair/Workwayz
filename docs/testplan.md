# Workwayz Comprehensive Quality Assurance & Test Plan

This document outlines the enterprise testing architecture, automated test suites (Vitest & Playwright), living HTML matrices, and execution runbooks for Workwayz.

---

## 1. Quality Architecture Overview

Workwayz implements an enterprise multi-tier testing pyramid:
1. **Unit & Component Testing (Vitest + JSDOM)**: Fast, deterministic testing of business logic, role-based permissions, string formatters, and UI component behavior.
2. **End-to-End Automation (Playwright)**: Full browser automation executing user journeys across the Global Portfolio Hub and Project Detail Hub with state-injecting session fixtures.
3. **Living Traceability Matrices**: Standalone publication-ready HTML documents providing dynamic filtering and verification audit trails.

---

## 2. Test Execution Runbook

### Unit & Component Tests (Vitest)
```bash
# Run all unit and component tests once
npm test

# Run tests in interactive watch mode
npm run test:watch

# Launch Vitest visual browser UI
npm run test:ui
```

### End-to-End Tests (Playwright)
```bash
# Run all E2E specs headlessly
npm run test:e2e

# Run E2E tests in interactive UI mode
npm run test:e2e:ui

# View latest HTML test run report
npm run test:e2e:report

# Install Chromium browser binary (if needed)
npm run test:e2e:install
```

---

## 3. Test Suites & Traceability Matrix

### Pillar 1: Authentication & Access Control (`e2e/01-auth-and-access.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-AUTH-001** | Public landing page renders branding and CTAs | Hero header, "Get Started" and "Log In" CTAs visible | ✅ Automated |
| **TC-AUTH-002** | Login page renders credentials form | Email, password input, and Sign In trigger present | ✅ Automated |
| **TC-AUTH-003** | AuthGuard intercepts unauthenticated visits | Direct navigation to `/my-projects` redirects to `/login` | ✅ Automated |
| **TC-AUTH-004** | Injected administrator session bypass | `localStorage` session loads `/my-projects` immediately | ✅ Automated |
| **TC-AUTH-005** | Role-based access control gating | Non-admin accounts restricted from `/portfolio-settings` | ✅ Automated |
| **TC-AUTH-006** | Non-remembered session after browser restart | Stale session without browser session cookie is purged; `/login` form stays, no auto-login | ✅ Automated |
| **TC-AUTH-007** | Remember-me session after browser restart | Session with `rememberMe: true` skips login and loads `/my-projects` | ✅ Automated |

### Pillar 2: Global Portfolio Workspace (`e2e/02-global-portfolio-workspace.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-PORT-001** | My Projects catalog & Leave Tracker navigation | Project list and Leave Tracker sidebar link under My Projects | ✅ Automated |
| **TC-PORT-002** | Project Home overview loads KPIs | Portfolio initiative summary cards visible | ✅ Automated |
| **TC-PORT-003** | Portfolio Executive Dashboard | Executive KPIs and unified Open Defects by Project stacked severity bars load | ✅ Automated |
| **TC-PORT-004** | WayFinder AI assistant dashboard | AI agent widgets and recommendation cards render | ✅ Automated |
| **TC-PORT-005** | Billing and Rate cards | Executive timeframe filters in header, KPI summary cards, and rate tables | ✅ Automated |
| **TC-PORT-006** | Users roster, mandatory Joining Date & Cost gating | Member roster with role badges and mandatory Joining Date & Cost validation | ✅ Automated |
| **TC-PORT-007** | Resource utilization & Gantt chart | Team capacity percentages and timeline bars visible | ✅ Automated |
| **TC-PORT-008** | Company Holidays & Leave Policy & Quotas | Holiday dates, monthly pro-rata quota, and carry-forward balances | ✅ Automated |
| **TC-PORT-009** | Portfolio administration & trash recovery | Archive and soft-delete recovery workflows | ✅ Automated |
| **TC-PORT-010** | Browser back button state preservation | Restores active Billing tab and sidebar sub-navigation after navigating to project PMO | ✅ Automated |
| **TC-PORT-011** | Billing Rate docked horizontal scrollbar | Wide tables show a horizontal scrollbar docked inside the viewport that scrolls the table sideways | ✅ Automated |
| **TC-PORT-012** | Billing Rate Card reference tab | Displays standard tech & horizontal roles, empty initially, supports adding, editing, and deleting benchmark rates by experience tier | ✅ Automated |
| **TC-PORT-013** | Portfolio Deletion Specificity & Inactive Project Handling | Specifically reports active vs inactive projects and provides direct link to Inactive Projects tab when blocking deletion | ✅ Automated |
| **TC-PORT-014** | Project Home Initial Estimates Partitioning | Partitions Initial Estimates state projects into dedicated tab between Active and Inactive, reserving Active for active only and Inactive for On Hold/Completed/Cancelled | ✅ Automated |

### Pillar 3: Project Detail Hub (`e2e/03-project-details-and-estimations.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-PRJ-001** | Project layout and tab bar navigation | Top navigation and sidebar submenus switch views | ✅ Automated |
| **TC-PRJ-002** | Initial estimation & Project Status | Scope specifications and estimation tables display; Initial Estimation Project Status focuses on Key Info & Health (PMO permits & milestones scoped to Project Details) | ✅ Automated |
| **TC-PRJ-003** | PM Dashboard & project status | Progress bars, schedule health, effort metrics load | ✅ Automated |

### Pillar 4: Agile Development Lifecycle (`e2e/04-development-lifecycle.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-DEV-001** | Development sprint dashboard | Burndown charts and velocity metrics display | ✅ Automated |
| **TC-DEV-002** | Product backlog & epic management | Backlog list, epic filters, story creation triggers | ✅ Automated |
| **TC-DEV-003** | Backlog grooming & story point sizing | Sizing cards and story priority editing | ✅ Automated |
| **TC-DEV-004** | Interactive Kanban board | Swimlanes (To Do, In Progress, In QA, Done) render | ✅ Automated |
| **TC-DEV-005** | Engineering development tasks | Granular subtasks linked to parent stories | ✅ Automated |
| **TC-DEV-006** | Defect tracker | Defect triage table with severity badges | ✅ Automated |

### Pillar 5: Testing & QA Management (`e2e/05-testing-and-quality.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-QA-001** | Quality estimations in portfolio hub | Cross-project QA effort estimations | ✅ Automated |
| **TC-QA-002** | Project Testing Dashboard | Pass/fail rates and test coverage metrics | ✅ Automated |
| **TC-QA-003** | Test Plan & Test Backlog | Test suite management and requirement links | ✅ Automated |
| **TC-QA-004** | Test Case repository | Steps, preconditions, and expected results | ✅ Automated |
| **TC-QA-005** | Test Cycle & Execution | Test execution runs with Pass/Fail recording | ✅ Automated |
| **TC-QA-006** | Linked defect management | Bugs logged directly from failed test steps | ✅ Automated |

### Pillar 6: RAID Governance (`e2e/06-governance-raid.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-RAID-001** | RAID Dashboard | Risk probability/impact heatmap and issue cards | ✅ Automated |
| **TC-RAID-002** | Risks Log | Risk register with severity and mitigation owners | ✅ Automated |
| **TC-RAID-003** | Assumptions Log | Validated vs unvalidated project assumptions | ✅ Automated |
| **TC-RAID-004** | Issues Log | Active blockers with target resolution dates | ✅ Automated |
| **TC-RAID-005** | Dependencies Log | Upstream/downstream external dependencies | ✅ Automated |

### Pillar 7: Resources, Releases & Settings (`e2e/07-resources-releases-settings.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-RES-001** | Project resources & capacity planning | Member assignments and allocation percentages | ✅ Automated |
| **TC-RES-002** | Global Worklog & Project Effort Allocation | Worklog under My Projects with active project selection and cross-project logging | ✅ Automated |
| **TC-RES-003** | Worklog Allocation Gating & Other Option | Only shows assigned active projects for the selected resource; provides Other project option for unallocated time & overhead tasks | ✅ Automated |
| **TC-RES-004** | Leave Calendar under Resources & Leave Summary under Time Off | Places Leave Calendar under Resources below Resource Workload, and Leave Summary under Time Off below Company Holidays | ✅ Automated |
| **TC-REL-001** | Release planning & deployments | Version milestones, release timelines, and Show Sprints grouping (aligned vs non-release) | ✅ Automated |
| **TC-ADM-001** | User Profile & Messages hub | Personal profile credentials and single-column Gmail-style Messages view | ✅ Automated |

### Pillar 8: Setup Wizard & Initial Configuration (`e2e/08-setup-wizard.spec.ts`)
| Test Case ID | Test Objective | Assertion Criteria | Status |
|---|---|---|---|
| **TC-WIZ-001** | Setup Wizard modal & step headers | Wizard dialog renders welcome and step indicators | ✅ Automated |
| **TC-WIZ-002** | Database engine selection | Multi-engine support (Local Embedded Database, PostgreSQL, Firebase, Supabase) selectable | ✅ Automated |
| **TC-WIZ-003** | Multi-step navigation traversal | Forward/backward progression through wizard steps | ✅ Automated |
| **TC-WIZ-004** | Clean wizard exit & completion | Close or skip action returns user to workspace | ✅ Automated |
| **TC-WIZ-005** | Super Admin account setup & local DB provisioning | Admin user step requests First/Last Name, designates Super Admin role, and supports zero-config Local Embedded Database & Auth | ✅ Automated |
| **TC-WIZ-006** | AI Configuration deferred option | Step 4 provides "I will configure AI later" checkbox that hides API inputs and reports deferred state on Step 5 summary | ✅ Automated |
| **TC-WIZ-007** | Pinned Card Navigation Footer | Wizard navigation buttons (Back, Next, Complete Setup) remain docked in CardFooter and do not scroll with card content | ✅ Automated |

---

## 4. Living Documentation Artifacts

- [Workwayz_Test_Plan.html](../Workwayz_Test_Plan.html): Interactive publication-grade test matrix with live filtering, statistics, and test spec links.
- [Workwayz_Sitemap.html](../Workwayz_Sitemap.html): Complete route topology and view hierarchy across Global Portfolio and Project Detail hubs.

