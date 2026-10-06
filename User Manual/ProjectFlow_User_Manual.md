# WORKWAYZ: User Manual
**Author:** Raman C Nair

---

## 1. Setup Wizard
When opening the Workwayz application for the first time, you are presented with a step-by-step Setup Wizard to enter essential environment configuration details and create the master system administrator account.

### Database Setup
Configure your primary cloud or containerized database connection.
*   **Project Name:** An internal identifier name for the specific database configuration.
*   **Database Provider:** Currently supports **Firebase (Firestore)** and **Supabase** (supporting cloud or Docker deployment layouts).
*   **Configuration Credentials:** Fields like *Firebase Project ID* and *Firebase API Key* must be copied directly from your respective database console.
*   *Interface Actions:* Includes options to `Save Changes` or click `Next →` to proceed.

### Authentication Setup
Set up the identity and authentication providers mapping to your selected database choice.
*   **Provider Binding:** If your primary database is Firebase, the application automatically uses *Firebase Auth*. If using Supabase, it defaults to *Supabase Auth*.
*   **Single Sign-On (SSO):** Toggle configurations are available to natively `Enable Google SSO` or `Enable GitHub SSO`.

### Super Admin User Creation
Establish the master super administrator account for system deployment.
*   **Fields Required:** *First Name* (e.g., John), *Last Name* (e.g., Doe), *Email ID* (e.g., admin@example.com), *Password*, and *Re-enter Password*.
*   **Role Allocation:** Automatically designated the highest role of **Super Admin**. This account has absolute access across all modules and settings and is permanently protected: it cannot be deleted even by other administrators in the UI and can only be removed directly via the database.
*   **Project Assignment Restriction:** Super Admin and Administrator accounts serve strictly as portfolio/system administrators and **cannot be assigned to any projects**, neither as general project team resources nor as Project Manager (PM).

### AI Configuration Setup
Enable intelligent project management utilities by connecting a generative AI foundation model provider. Note that the core application functions entirely without AI; however, automated estimation and strategic suggestion tools will be disabled.
*   **Project Name:** Identifier for the operational AI configuration dashboard profile.
*   **AI Provider:** Out-of-the-box support for **Google Gemini**, **Claude**, **ChatGPT**, **Ollama**, and **LM Studio**.
*   **API Key:** Paste your authentication token obtained directly from the respective provider settings sites.
*   **Default Model Override (Optional):** Define custom models to use instead of application-wide defaults.

### Finish Setup
Review and finalize your infrastructure configuration matrix before booting the instance.
*   **Summary Checks:** Displays the binding state of your *Database*, *Authentication*, *Admin Account Status*, and *AI Integration*.
*   *Action:* Clicking `Complete Setup` writes the structural parameters to the underlying system and boots up Workwayz.

---

## 2. Signup and Login Flow

### Home Landing Page
The entry point of the application outlines the modular value proposition of Workwayz: **Manage Portfolios and Projects with Clarity**.
*   **Primary Functions Outlined:** Portfolio Management, Project Tracking, and Team Collaboration.
*   **Navigation Actions:** Clear calls-to-action for `Get Started` or `Log In`.

### Signup
For creating a new user inside the ecosystem.
*   **Registration Criteria:** Requires *First Name*, *Last Name*, *Emp ID* (Employee Identification), *Phone*, *Experience (years)*, *Email*, and *Password*.
*   **Permissions Boundary:** Upon initial signup, users are locked to an isolated **My Projects** dashboard. They will not be granted peripheral system visibility until explicitly approved and assigned an access tier by an Administrator.

### Login
Standard authentication terminal for established system members.
*   **Initial Verification:** If a profile is created directly by an Admin, the default standard password is `P@ssword`. Upon execution of the initial login, the system enforces an immediate redirect to a secure password update panel.
*   **Interface Options:** Includes an "Ask Gemini" overlay helper panel embedded in the primary container.

---

## 3. Portfolio Flow

### My Projects
A user-specific workspace displaying active assignments.
*   **Content Display:** Shows all projects the specific authenticated user is actively staffed on. For Project Managers (PMs), this view aggregates active lifecycle projects alongside *Initial Estimations* requiring engineering validation.

### Projects & Project Home
The root operational portal listing all ongoing portfolios and unclosed projects.
*   **Portfolio Architecture:** Every individual project must be structurally mapped underneath an overarching parent *Portfolio*. To bypass structured segmentation temporarily, an explicit *Unassigned Portfolio* can be configured.
*   **Creation Fields (`Create New Project` Modal):** Portfolio Selector, Project Name, Project Start Date, Project End Date, Project Manager Assignment, Pricing Model Selector (TnM or Fixed Bid), and initial status toggle.

### Portfolio Dashboard
A specialized high-level health oversight monitor tailored strictly for upper executive management.
*   **Visibility Threshold:** Aggregates and highlights only the active initiatives whose health states are designated as **Red** or **Yellow**.
*   **Layout Quadrants:** 
    *   *High Potential Risks:* (e.g., Infrastructure scaling issues under peak loads).
    *   *Critical & High Priority Issues:* (e.g., Dev environment credentials missing from client).
    *   *Red Health Projects:* A filtered linear block explicitly signaling project degradation.

### Quality & Estimations
An auditing panel tracking estimation accuracy profiles across three structural gates: *Initial Estimation* (high-level requirement phase), *Planned Estimation* (post-user story elaboration and sub-task breakout), and *Actual Effort* (tallied from worklogs).
*   **Core Strategic Metrics:** Upper management utilizes these fields to assess variance boundaries, protecting downstream contract margins since client invoicing explicitly ties back to original estimations.
*   **KPI Summary Highlights:** Active Portfolio Projects Count, Ballpark Estimations (Man-Days), Total Planned Effort, Actual Effort Consumed, Variance Percentage, and visual Plan Consumed progress rails.

### Defects Dashboard
Monitors structural engineering quality metrics across sequential testing environments.
*   **Containment Metrics:** Automatically visualizes active defect counts broken down by **SIT Phase Defects**, **UAT Phase Defects**, and **Production Leaks**. Calculates the macro *Average Leakage Rate %* to evaluate the diagnostic depth of the QA teams before code hits production.

### Billing Dashboard
Comprehensive operational cost ledger providing a distinct view of project financials.
*   **Aggregated Financial Top-Line:** *Total Revenue*, *Resource Cost*, *Fixed Cost*, *Net Profit*, and *Realized / Collected Payments* (tracking cash flows against potential client invoice latency).
*   **Zebra-Striped Project Breakdown:** Linear multi-column metrics detailing custom pricing models (TnM vs Fixed Bid), gross calculations, and specific payment states across every active initiative.

### Users & User List
An administrative control page managing resource accessibility across the ecosystem.
*   **Approval Queue:** Tracks a distinct notification bucket labeled `Users Awaiting Enablement` allowing fast confirmation and provisioning of structural access parameters.
*   **Direct Ingestion (`Add New User` Modal):** Allows administrators to manually provision resource entries (First/Last Name, Employee ID, Phone, Access Level, Experience, Password, and Base Resource Cost USD per hour/day) without requiring manual self-registration.

### Resource Utilization
A centralized dynamic resource management calendar.
*   **Search and Filter Matrix:** Lookup by employee name or identification code to populate an active *Availability Outlook* framework.
*   **Outlook Cards:** Highlights real-time occupational capacity saturation (e.g., Utilization at 248% indicating excessive multi-project staffing stress), allocated project durations, and next-available dates.
*   **Availability Grid:** Displays a color-coded monthly calendar layout tracking day-by-day availability states.

### Holidays & Holiday Calendar
Defines global geographic operational boundaries.
*   **Weekly Off-Days:** Core check-box interface matrix to allocate structural weekend configurations (e.g., Saturday and Sunday toggles).
*   **Yearly Holidays Grid:** Provides an automated `Auto-fill with AI` capability to automatically map domestic holiday frameworks into the core application engine based on operational parameters.

### Leave Settings
Establishes the macro-level organizational time-off policy controls.
*   **Global Quota Settings:** Numeric entry fields defining *Annual Paid Leaves Quota* alongside carrying capacity parameters like `Allow Carry-Over Leaves` and *Carry-Over Days Limit*.
*   **Resource Leave Accounts:** Tabular breakdown listing individual staff, their roles, carried allocations, current operational balances, and remaining approved leave days.

### Leave Tracker
The distributed employee self-service terminal for managing time-off requests.
*   **Policy Engine Integration:** Applying for a leave block automatically flags capacity constraints across all projects where the resource is actively allocated, suppressing illegal scheduling practices (such as reporting absences on one project while logging effort on another).
*   **Visual Balance Rails:** Features large, color-coded diagnostic meters highlighting remaining leave balances.

---

## 4. Initial Estimation Flow

### Elaboration and Project Initialization
To spawn an initial benchmark lifecycle pipeline:
1. Select `New Project` from the core home space and enforce the initial dropdown status configuration to **Initial Estimation**.
2. Navigate to the newly generated project space and explicitly document a comprehensive text summary outlining goals and scope inside the **Project Summary** input block.

### AI Stack and Horizontal Strategy Formulation
Workwayz leverages its connected generative LLM framework to expedite foundational scoping:
*   **Stack Suggestions:** Clicking the `Stack Suggest` button triggers an automated reading of the scoping summary text. The AI responds by building 3 tailored structural options (e.g., *Next.js Full-Stack Suite* using Vercel/MongoDB/NextAuth/Stripe or an *AWS Serverless Architecture* relying on Amplify/Lambda/DynamoDB/Cognito).
*   **System Ingestion:** Selecting an AI stack choice maps those distinct technical zones as structured lines underneath the **Impacted Systems** block. Manual items can be appended at any time via the `Add System` button.
*   **Horizontal Staffing Allocation:** Click `Horizontal Suggest` to let the AI output proportional strategic staffing compositions mapped across core supporting practices (Project Management, Quality Analysis, Business Analysis, Solution Architecture, UI/UX Design, DevOps). Users assign an operational daily billing rate to calculate baseline values.
*   **AI Estimation Compilation:** Select the `AI Estimator` utility button. The model cross-references the project scope matrix against global developer execution averages to output baseline effort allocations. The PM can manually fine-tune these baselines before clicking `Confirm Estimation` to transition the project out of initialization.

---

## 5. Project Flow

### Project Details & Status
The configuration management screen for active projects.
*   **Key Information Mapping:** Controls project status states, explicit assigned PM ownership, pricing structures (Fixed Bid vs Time & Material), and active milestones.
*   **Project Health Grid:** Contains interactive sliders and drop menus to update the overall operational color indicator state along three core axes: *Scope*, *Cost*, and *Time*.

### PM Dashboard
An analytical summary control center designed explicitly for Project Managers, Delivery Directors, and PMO executives.
*   **Release & Sprint Metrics:** Radial chart visualization displays percentage completions against target release frames and sprint boundaries.
*   **Epic Tracking:** High-level linear progress tracking arrays detailing specific component epics.
*   **Time Analytics:** Horizontal column tracking mechanisms evaluating planned time allocations against active employee worklog reporting blocks.
*   **Workload Quality Vectors:** Contrasts actual engineering delivery hours against time spent resolving internal bug tickets. This ratio flags potential issues in the design phase; high bug-fix hours point to insufficient planning.
*   **Time Spent by Swim Lane:** A systemic process bottleneck chart mapping average task residence metrics within individual Kanban execution states (To Do, In Progress, In QA, Done) to highlight delivery friction points.
*   **Time by Resource:** Highlights operational distribution velocities, showing average unit execution timelines mapped across individuals.

### Specifications & Environments
Extends the technical parameters framework established during initial scoping.
*   **Environments Matrix:** An interactive administrative block allowing creation, ordering, and deletion of project pipeline infrastructure layers (e.g., System Integration Testing [SIT], User Acceptance Testing [UAT], and Production [Prod]).

### Project Resources & Capacity Planning
Manages the specific human capital allocations tied to the project container.
*   **Capability Integrity Mapping:** When onboarding a team member from the corporate user pool, the system checks their capability parameters against the *Impacted Systems* documented in the Specifications panel. For multi-disciplinary deployment squads, "Full-Stack Development" must be configured as a generic target.
*   **Capacity Planning Ledger:** Tracks resource utilization down to the specific impacted software systems layer. Provides simple toggle configurations to assess availability metrics across multiple viewing angles (Sprint, Month, Week) measured in standard *Days* or *Hours*.

### Worklog
The atomic primary transaction interface for time tracking.
*   **Entry Matrix:** Team members select their profile card, select a target calendar date, and input explicit numeric hours against active structural items (Stories, Tasks, Features, or Defects). Includes an `Other` classification option paired with a mandatory text log description field to account for unstructured operations.

### Resource Workload
A macro-level visual health monitor mapping calendar grids for all staffed project engineers. It renders green horizontal capacity blocks for healthy operational tracking and flags over-allocation issues instantly.

### Releases, Stages & Milestones
A specialized configuration portal optimized for hybrid execution models. It provides a visual Gantt chart style **Release Timeline** framework tracking macro phases (Design, Development, Testing) against rigid contractual dates like *Design Freeze* or *Code Freeze* milestones.

### Development Dashboard & Backlog Management
*   **Development Dashboard:** Tracks engineering momentum using an active *Sprint Burndown* line matrix alongside a cumulative *Release Burnup* progress chart.
*   **Product Backlog Core:** Hierarchical container structure managing engineering requirements categorized by item types: *Story*, *Feature Change*, *Task*, or *Bug*.
*   **User Story Elaboration Flow:** Business Analysts and Product Owners structure target requirements inside the backlog container. Tech Leads then inspect the dependencies to map impacted components. Developers subsequently populate sub-tasks against those components, outputting explicit hourly or day-based estimations. The cumulative total forms the structural size metric of the parent user story.
*   **Story Point Monitization Bridge:** For contemporary agile squads utilizing abstract Story Points, Workwayz features a built-in algorithmic conversion utility mapping point targets to contract billing hour approximations.

### Sub-Tasks & Grooming Board
*   **Bulk Sub-Tasks Matrix:** A tabular workspace enabling Tech Leads to perform high-velocity bulk scheduling, manipulation, and owner routing actions across hundreds of atomic engineering sub-tasks simultaneously.
*   **Grooming Board UI:** A dual-column drag-and-drop workspace. The left column lists the unassigned product backlog, while the right displays target sprint sprint cycles. An explicit verification system marks ready items with a green validation tick once all sub-task conditions are satisfied. The top header displays real-time sprint capacity boundaries to protect teams from scope overflow.

### Kanban Board
Provides real-time visualization of task velocity. Includes quick filtering controls to alternate between high-level user stories views and individual sub-task views, with sorting options based on specific assigned engineers.

### Testing Dashboard & Backlog Control
*   **Testing Dashboard:** A diagnostic array displaying functional quality parameters. Features categorical pie charts tracking *Test Cases by Status*, *Bugs by Status*, and *Open Bugs by Severity* (Low, Critical, High, Medium).
*   **Daily Testing Velocity Trend:** Tracks cumulative test running operations against successful closures alongside daily bug identification lines.
*   **Test Leakage Bar Charts:** Visualizes defect distribution states across active execution cycles (SIT, UAT, Prod) sorted by severity flags.
*   **Story Test Coverage Metric:** Renders an absolute percentage score indicating the exact ratio of the product backlog verified by operational test plans.
*   **Test Backlog & Test Plan Engine:** Central repositories mapping system-wide test components. When compiling a targeted validation cycle (e.g., an SIT Execution Plan), testers choose matching components from the backlog repository and distribute them across execution dates.

### Defect Tracker
Logs and processes system anomalies.
*   **Ingestion Architecture (`Add New Defect` Modal):** Contains input controls for Title, Description (Steps to Reproduce), Expected Result, Reporter, Related Test Case, Found In Test Plan, Severity, Assignee, Target Sprint, Related/Original Defect (to prevent duplication), and Epic categorization. Entering a valid Story ID automatically embeds the defect card directly into the matching developer story context.
*   **Defect Kanban Board:** A dedicated tracking board structured into pipeline columns: *In Triage*, *Defect Backlog*, *In Progress*, *Retest*, and *Closed*.

### Governance (RAID Log)
*   **RAID Dashboard:** Centralized monitor charting metrics across project execution variables: *Total Risks*, *Total Assumptions*, *Total Issues*, and *Total Dependencies*.
*   **Risks Ledger:** Tracks threat parameters across categorical scales evaluating *Severity* and *Probability* to compute an active risk level flag. Features an `AI Risk Gen` capability that analyzes project characteristics to suggest common risks observed across similar global initiatives.
*   **Project Assumptions Framework:** Documents foundational hypotheses accepted during initial scoping phases. Includes an `AI Gen Assumptions` module to check consistency across original scoping documentation.
*   **Project Issues Portal:** Tracks active operational blocks and materialized risks impacting delivery (not to be confused with application engineering bugs).
*   **Project Dependencies Log:** Documents critical third-party engineering handoffs. Includes automated checking via an `AI Gen Dependencies` engine.

### PMO & Project Documents
An audit verification dashboard built for project management offices, governance teams, and quality auditors. While Workwayz does not provide internal document storage, it acts as a structured repository mapping secure URLs to external cloud storage or corporate network paths.
*   **Mandatory Phase Gates:** Enforces clear validation criteria across critical business milestones (e.g., an execution block requires a verified *Statement of Work [SOW]* link to authorize initialization, while a production deployment request requires an absolute sign-off validation entry from the lead QA team).

### Financial Invoicing Engines (FB & TnM)
Workwayz contains dual financial computation architectures driven by your chosen project pricing model:

#### 1. Fixed Bid (FB) Billing & Invoicing Ledger
*   **Mechanics:** Compares fixed budget parameters against resource metrics drawn from the global user repository.
*   **Ledger Columns:** Tracks *Billed Rate/Day* vs *Cost Rate/Day* for each assigned team member over the project timeline. This automatically calculates gross resource costs and net project profits.
*   **Fixed Costs Module:** Logs infrastructure operational overheads (e.g., GIT repository fees, third-party server hosting, or one-time architectural setup fees).
*   **System Invoicing Table:** Combines active resource tallies with fixed cost line items to output the absolute project contract value.
*   **FB Payment Milestones Dashboard:** Tracks payment releases based on deliverables. It includes state management controls (`In Progress`, `Milestone Completed`, `Invoice Raised`, `Payment Completed`) and a historical log tracking the *Date of Status Change*.

#### 2. Time & Material (TnM) Billing Ledger
*   **Mechanics:** Financial processing is calculated and generated at the end of each monthly cycle based on recorded hours.
*   **Ledger Adjustments:** The engine scans the project calendar to pull active *Loss of Pay (LOP)* absences and *Overtime Hours* reported in employee worklogs. This automatically adjusts billable days to ensure accurate invoice summaries.
*   **TnM Payment Milestones Terminal:** Displays monthly linear frames mapping invoice generation parameters across chronological billing periods instead of project deliverable milestones.

### Business Continuity (BCP) Profile
Provides structural security tools to safeguard project delivery data against resource turnover.
*   **Infrastructure Parameter Stores:** Centralizes system endpoints, target URLs, and SSL certificate expiration dates across SIT, UAT, and Production tiers.
*   **Code Repository Logs:** Registers version control coordinates alongside access token validity frames.
*   **BCP Support Resources Grid:** Lists backup personnel explicitly flagged for business continuity coverage. If primary engineers leave the project, their mapped backup contacts (Name, Role, Email, and Phone) are immediately visible to delivery managers.

---

## 6. Admin Flow

### Portfolio Settings & Access Settings
The core security management console for the system platform.
*   **Page Access Matrix:** A grid alignment interface where administrators can toggle visibility controls across key roles: *Administrator*, *Senior Management*, *Project Manager*, *Lead*, *Team Member*, and *PMO*. Toggles are divided into *Admin Level Pages*, *Portfolio Level Pages*, and *Project Level Pages*.
*   **CRUD Access Grid:** Granular matrix mapping create, read, update, and delete privileges across four operational scopes: *Portfolio Level*, *Project Level*, *Story/Feature Change/Task Level*, and *Sub-tasks/Bugs/Test cases Level*.

### Infrastructure Re-Configuration Terminals
Allows administrators to adjust environment parameters post-wizard deployment:
*   **Database Management Panel:** Facilitates modifications to cloud parameters or migration from Firebase to Supabase via an unbound connection layout template.
*   **Authentication Configuration Panel:** Adjusts identity parameters and manages external OAuth single sign-on connections (Google OAuth, Facebook OAuth, Apple SSO).
*   **Generative AI Configuration Board:** Allows switching core LLM connections, rotating authorization keys, or choosing alternative default inference models.

### Project Archiving & Trash Control
*   **Project Archiving Console:** Manages automated lifecycle policies for completed initiatives. Includes options to configure automated archiving windows (e.g., number of months post-closure) or auto-deletion rules for archived data.
*   **Trash Control Terminal:** A secure safety container holding deleted portfolio items. Administrators can review deleted items, check remaining days in the retention window, or perform a full system recovery within a strict 30-day boundary before permanent erasure.