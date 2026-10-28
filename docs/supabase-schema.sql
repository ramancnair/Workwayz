-- ==============================================================================
-- Workwayz Complete Database Schema for Supabase (QA Branch / Cloud & Docker)
-- ==============================================================================
-- This script provisions the complete schema for Workwayz, covering:
--  1. Portfolios & Global Settings
--  2. Employees & Access Control
--  3. Projects & Project Members
--  4. Work Items: Epics, Sprints, Kanban, Stories (with QA defect tracking)
--  5. Quality Assurance: Test Cases, Test Plans, Test Cycles & Execution
--  6. Initial Estimation: Initial Impacted Systems & Initial Horizontals
--  7. Production RAID Logs: Risks, Assumptions, Issues, Dependencies
--  8. Worklogs & Timesheets
--  9. Releases, Payment Milestones, Documents, Repositories
-- 10. Environments & Fixed Costs
-- 11. Internal Messaging & Notifications
-- 12. Row-Level Security (RLS) & Realtime Subscriptions
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ROOT ENTITIES: Portfolios, Employees, Global Settings & Holidays
-- ==============================================================================

-- Portfolios table (Top-level container for projects)
CREATE TABLE IF NOT EXISTS public.portfolios (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    description TEXT,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table (App users, roles, capabilities and access control profiles)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    "empId" TEXT NOT NULL UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT 'N/A',
    avatar TEXT DEFAULT 'https://placehold.co/40x40.png',
    "clientEmpId" TEXT,
    "clientEmail" TEXT,
    role TEXT,
    experience NUMERIC DEFAULT 0,
    "employmentStartDate" TIMESTAMPTZ,
    "employmentEndDate" TIMESTAMPTZ,
    "onboardingDate" TIMESTAMPTZ,
    "offloadingDate" TIMESTAMPTZ,
    "accessLevel" TEXT DEFAULT 'Team Member',
    "billedRate" NUMERIC DEFAULT 0,
    "costRate" NUMERIC DEFAULT 0,
    "costAmount" NUMERIC DEFAULT 0,
    "costCurrency" TEXT DEFAULT 'USD',
    availability NUMERIC DEFAULT 100,
    "leavePeriods" JSONB DEFAULT '[]'::JSONB,
    capabilities TEXT[] DEFAULT '{}',
    "isBcpSupport" BOOLEAN DEFAULT FALSE,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ,
    "isEnabled" BOOLEAN DEFAULT TRUE,
    uid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Access control permission matrix per access level
CREATE TABLE IF NOT EXISTS public.access_control_settings (
    id TEXT PRIMARY KEY,
    "pageAccess" JSONB DEFAULT '{}'::JSONB,
    "crudAccess" JSONB DEFAULT '{}'::JSONB
);

-- Portfolio archive settings
CREATE TABLE IF NOT EXISTS public.archive_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    "autoArchiveCompletedProjects" BOOLEAN DEFAULT FALSE,
    "autoArchiveAfterMonths" TEXT DEFAULT '6',
    "autoDeleteArchivedProjects" BOOLEAN DEFAULT FALSE,
    "autoDeleteAfterMonths" TEXT DEFAULT '12',
    "customDeleteMonths" INTEGER DEFAULT 12
);

-- Global & Project Holidays
CREATE TABLE IF NOT EXISTS public.holidays (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT, -- NULL for global organization holidays
    date TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'National'
);

-- Global & Project Settings
CREATE TABLE IF NOT EXISTS public.project_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    "projectId" TEXT, -- NULL for global default settings
    "weeklyOffDays" INTEGER[] DEFAULT '{0, 6}',
    "sprintDurationInWeeks" INTEGER DEFAULT 2,
    "sprintStartDay" INTEGER DEFAULT 1,
    "overrideGlobalHolidays" BOOLEAN DEFAULT FALSE,
    "manMonthToDays" NUMERIC DEFAULT 22,
    "manDayToHours" NUMERIC DEFAULT 8,
    "storyPointToHours" NUMERIC DEFAULT 8,
    "allocatedPaidLeavesPerYear" NUMERIC DEFAULT 18,
    "allowCarryOver" BOOLEAN DEFAULT FALSE,
    "carryOverLimit" NUMERIC DEFAULT 0,
    "testDataStudioEnabled" BOOLEAN DEFAULT FALSE,
    "studioLog" JSONB DEFAULT '[]'::JSONB,
    "data" JSONB DEFAULT '{}'::JSONB
);

-- ==============================================================================
-- 3. PROJECTS & PROJECT MEMBERS
-- ==============================================================================

-- Projects table (Belongs to a Portfolio)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    "portfolioId" TEXT REFERENCES public.portfolios(id) ON DELETE SET NULL,
    summary TEXT,
    description TEXT,
    "projectManagerId" TEXT REFERENCES public.employees(id) ON DELETE SET NULL,
    "pricingModel" TEXT DEFAULT 'Fixed Bid',
    status TEXT DEFAULT 'Not Started',
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "overallStatus" TEXT DEFAULT 'Green',
    "scopeStatus" TEXT DEFAULT 'Green',
    "costStatus" TEXT DEFAULT 'Green',
    "timeStatus" TEXT DEFAULT 'Green',
    "statusComments" TEXT,
    "statusHistory" JSONB DEFAULT '[]'::JSONB,
    "isArchived" BOOLEAN DEFAULT FALSE,
    "archivedAt" TIMESTAMPTZ,
    "projectValue" NUMERIC DEFAULT 0,
    "isProjectValueOverridden" BOOLEAN DEFAULT FALSE,
    "monthlyBilledValue" NUMERIC DEFAULT 0,
    "pmoApproval" JSONB DEFAULT '{"permitToBuild": {"approved": false}, "permitToDeploy": {"approved": false}}'::JSONB,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members (links employees assigned to a project)
CREATE TABLE IF NOT EXISTS public.project_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role TEXT,
    "onboardingDate" TIMESTAMPTZ,
    "offloadingDate" TIMESTAMPTZ,
    "billedRate" NUMERIC DEFAULT 0,
    "costRate" NUMERIC DEFAULT 0,
    availability NUMERIC DEFAULT 100,
    UNIQUE ("projectId", "employeeId")
);

-- ==============================================================================
-- 4. PROJECT WORK ITEMS: Epics, Sprints, Kanban, Stories, Bugs & Tasks
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.epics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sprints (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "sprintId" TEXT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'Yet to Start',
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "isCurrent" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanban_columns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN DEFAULT TRUE,
    "isDoneColumn" BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.stories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "storyId" TEXT NOT NULL,
    "sortOrder" NUMERIC DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    "itemType" TEXT DEFAULT 'Requirement/Story',
    "acceptanceCriteria" TEXT,
    "reporterId" TEXT,
    "assigneeId" TEXT,
    "epicId" TEXT REFERENCES public.epics(id) ON DELETE SET NULL,
    "sprintId" TEXT REFERENCES public.sprints(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'To Do',
    resolution TEXT,
    "statusHistory" JSONB DEFAULT '[]'::JSONB,
    "estimatedHours" NUMERIC DEFAULT 0,
    priority TEXT DEFAULT 'Medium',
    severity TEXT DEFAULT 'Medium',
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "closedAt" TIMESTAMPTZ,
    "effortDays" NUMERIC DEFAULT 0,
    "impactedSystemId" TEXT,
    "impactedSystemIds" JSONB DEFAULT '[]'::JSONB,
    "releaseId" TEXT,
    "predecessorId" TEXT,
    "parentStoryId" TEXT,
    "relatedTestCaseId" TEXT,
    attachments TEXT,
    "foundInTestPlanId" TEXT,
    "foundInTestCycleId" TEXT,
    "relatedBugId" TEXT,
    "developmentStartDate" TIMESTAMPTZ,
    "completionDate" TIMESTAMPTZ,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ
);

-- ==============================================================================
-- 5. QUALITY ASSURANCE & TESTING (Test Cases, Test Plans & QA Test Cycles)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.test_cases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "testCaseId" TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'Functional',
    description TEXT DEFAULT '',
    "expectedResult" TEXT DEFAULT '',
    "storyId" TEXT,
    "releaseId" TEXT,
    "sprintId" TEXT,
    "assigneeId" TEXT,
    attachment TEXT,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ
);

-- Test Plans
CREATE TABLE IF NOT EXISTS public.test_plans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "testPlanId" TEXT NOT NULL,
    name TEXT NOT NULL,
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "planType" TEXT DEFAULT 'Sprint',
    "sprintId" TEXT,
    "releaseId" TEXT,
    "environmentId" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Plan Test Cases
CREATE TABLE IF NOT EXISTS public.test_plan_test_cases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "testPlanId" TEXT NOT NULL REFERENCES public.test_plans(id) ON DELETE CASCADE,
    "originalTestCaseId" TEXT,
    "testCaseId" TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'Functional',
    description TEXT DEFAULT '',
    "expectedResult" TEXT DEFAULT '',
    "storyId" TEXT,
    "releaseId" TEXT,
    "sprintId" TEXT,
    status TEXT DEFAULT 'Not Run',
    "assigneeId" TEXT,
    "executionDate" TIMESTAMPTZ,
    "closeDate" TIMESTAMPTZ,
    "statusHistory" JSONB DEFAULT '[]'::JSONB,
    attachment TEXT
);

-- Test Cycles (QA execution cycles)
CREATE TABLE IF NOT EXISTS public.test_cycles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "testCycleId" TEXT,
    "testPlanId" TEXT,
    name TEXT NOT NULL,
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "planType" TEXT DEFAULT 'Sprint',
    "sprintId" TEXT,
    "releaseId" TEXT,
    "environmentId" TEXT,
    "testCaseIds" TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Cycle Test Cases (individual test runs in QA cycle)
CREATE TABLE IF NOT EXISTS public.test_cycle_test_cases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "testCycleId" TEXT NOT NULL REFERENCES public.test_cycles(id) ON DELETE CASCADE,
    "testPlanId" TEXT,
    "testCycleName" TEXT,
    "testPlanName" TEXT,
    "originalTestCaseId" TEXT,
    "testCaseId" TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'Functional',
    description TEXT DEFAULT '',
    "expectedResult" TEXT DEFAULT '',
    "storyId" TEXT,
    "releaseId" TEXT,
    "sprintId" TEXT,
    status TEXT DEFAULT 'Not Run',
    "assigneeId" TEXT,
    "executionDate" TIMESTAMPTZ,
    "closeDate" TIMESTAMPTZ,
    "statusHistory" JSONB DEFAULT '[]'::JSONB,
    "actualResult" TEXT,
    "defectId" TEXT,
    "effortHours" NUMERIC DEFAULT 0,
    "actualEffortHours" NUMERIC DEFAULT 0,
    attachment TEXT,
    attachments JSONB DEFAULT '[]'::JSONB
);

-- ==============================================================================
-- 6. INITIAL ESTIMATION (Impacted Systems & Horizontals)
-- ==============================================================================

-- Initial Impacted Systems (Ballpark/Initial Estimation stage)
CREATE TABLE IF NOT EXISTS public.initial_impacted_systems (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Technology',
    explanation TEXT,
    estimate NUMERIC DEFAULT 0,
    "dailyBillingRate" NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Impacted Systems (Post-confirmation active project systems)
CREATE TABLE IF NOT EXISTS public.impacted_systems (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Technology',
    explanation TEXT,
    estimate NUMERIC DEFAULT 0,
    "dailyBillingRate" NUMERIC DEFAULT 0,
    "isInitial" BOOLEAN DEFAULT FALSE
);

-- Initial Horizontals (Initial Estimation stage)
CREATE TABLE IF NOT EXISTS public.initial_horizontals (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weightage NUMERIC DEFAULT 0,
    "isEnabled" BOOLEAN DEFAULT TRUE,
    "dailyBillingRate" NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Horizontals (Post-confirmation active project horizontals)
CREATE TABLE IF NOT EXISTS public.horizontals (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weightage NUMERIC DEFAULT 0,
    "isEnabled" BOOLEAN DEFAULT TRUE,
    "dailyBillingRate" NUMERIC DEFAULT 0,
    "isInitial" BOOLEAN DEFAULT FALSE
);

-- ==============================================================================
-- 7. RAID LOGS (Risks, Assumptions, Issues, Dependencies)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.risks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "riskId" TEXT NOT NULL,
    description TEXT NOT NULL,
    severity INTEGER DEFAULT 2,
    probability INTEGER DEFAULT 2,
    "mitigationPlan" TEXT DEFAULT '',
    "residualRisk" TEXT DEFAULT '',
    "contingencyPlan" TEXT DEFAULT '',
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.assumptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "assumptionId" TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'Technical',
    status TEXT DEFAULT 'Active',
    "validationDate" TIMESTAMPTZ,
    "ownerId" TEXT,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.issues (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "issueId" TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    "reportedDate" TIMESTAMPTZ,
    "resolvedDate" TIMESTAMPTZ,
    "assigneeId" TEXT,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.dependencies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "dependencyId" TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'Internal',
    "dependencyOn" TEXT DEFAULT '',
    "expectedByDate" TIMESTAMPTZ,
    status TEXT DEFAULT 'On Track',
    "ownerId" TEXT,
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ
);

-- ==============================================================================
-- 8. WORKLOGS & TIMESHEETS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.worklogs (
    id TEXT PRIMARY KEY,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    items JSONB DEFAULT '[]'::JSONB,
    "totalHours" NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.worklog_submissions (
    id TEXT PRIMARY KEY,
    "projectId" TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    "employeeId" TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    "weekStartDate" TIMESTAMPTZ NOT NULL,
    "submittedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. RELEASES & PMO MANAGEMENT
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.releases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "releaseId" TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    "sortOrder" NUMERIC DEFAULT 0,
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "milestoneDate" TIMESTAMPTZ,
    "itemType" TEXT DEFAULT 'Release',
    "parentReleaseId" TEXT,
    "isCompleted" BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.payment_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    "milestoneId" TEXT NOT NULL,
    name TEXT NOT NULL,
    "billingPercentage" NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'TBD',
    attachments TEXT,
    "statusHistory" JSONB DEFAULT '[]'::JSONB
);

CREATE TABLE IF NOT EXISTS public.project_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "isDeleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.code_repositories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    "expiryDate" TIMESTAMPTZ
);

-- ==============================================================================
-- 10. ENVIRONMENTS & FIXED COSTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.environments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    url TEXT,
    "renewalDate" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.fixed_costs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "projectId" TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost NUMERIC DEFAULT 0,
    type TEXT DEFAULT 'Monthly'
);

-- ==============================================================================
-- 11. INTERNAL MESSAGING & NOTIFICATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT,
    "senderAvatar" TEXT,
    recipients JSONB DEFAULT '[]'::JSONB,
    "recipientUserIds" TEXT[] DEFAULT '{}',
    "distroIds" TEXT[] DEFAULT '{}',
    subject TEXT DEFAULT '(No Subject)',
    body TEXT DEFAULT '',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "readBy" TEXT[] DEFAULT '{}',
    "starredBy" TEXT[] DEFAULT '{}',
    "deletedBy" TEXT[] DEFAULT '{}',
    "purgedBy" TEXT[] DEFAULT '{}',
    "replyToId" TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_recipient_user_ids ON public.messages USING GIN("recipientUserIds");

-- ==============================================================================
-- 12. PERMISSIONS, ROW LEVEL SECURITY (RLS) & REALTIME
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Enable RLS and full access policies across all public tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access for all roles" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Allow full access for all roles" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
    END LOOP;
END $$;

-- Enable Supabase Realtime on core real-time collections
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE 
            public.projects,
            public.stories,
            public.sprints,
            public.kanban_columns,
            public.employees,
            public.test_cases,
            public.test_cycles,
            public.test_cycle_test_cases,
            public.messages;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;

