// Auto-generated Tool Catalog for FlowPilot RAG Tool Selection
// Total Tools: 201

export interface ToolMetadata {
  name: string;
  varName: string;
  category: string;
  description: string;
  params: string[];
  aliases: string[];
  searchText: string;
}

export const TOOL_CATALOG: ToolMetadata[] = [
  {
    "name": "createWorkItem",
    "varName": "createWorkItemTool",
    "category": "work_items",
    "description": "Creates a new work item (User Story, Bug, Task, Feature Change, or Sub Task) in a project. Automatically assigns the next sequential ID (e.g. BUG-1, ST-5) and stores it in the database.",
    "params": [
      "projectId",
      "title",
      "description",
      "estimatedHours",
      "acceptanceCriteria"
    ],
    "aliases": [
      "user story",
      "task",
      "bug",
      "defect",
      "feature change",
      "sub task",
      "kanban item"
    ],
    "searchText": "createWorkItem | Category: work_items | Aliases: user story task bug defect feature change sub task kanban item | Description: Creates a new work item (User Story, Bug, Task, Feature Change, or Sub Task) in a project. Automatically assigns the next sequential ID (e.g. BUG-1, ST-5) and stores it in the database. | Parameters: projectId title description estimatedHours acceptanceCriteria"
  },
  {
    "name": "updateWorkItem",
    "varName": "updateWorkItemTool",
    "category": "work_items",
    "description": "Updates an existing work item (story, bug, task) status (e.g. move to",
    "params": [
      "projectId",
      "storyIdOrDocId",
      "updates",
      "status",
      "priority",
      "severity",
      "estimatedHours",
      "title",
      "description"
    ],
    "aliases": [
      "user story",
      "task",
      "bug",
      "defect",
      "feature change",
      "sub task",
      "kanban item"
    ],
    "searchText": "updateWorkItem | Category: work_items | Aliases: user story task bug defect feature change sub task kanban item | Description: Updates an existing work item (story, bug, task) status (e.g. move to | Parameters: projectId storyIdOrDocId updates status priority severity estimatedHours title description"
  },
  {
    "name": "createPortfolio",
    "varName": "createPortfolioTool",
    "category": "portfolio_project",
    "description": "Creates a new Portfolio in the workspace to group and organize projects.",
    "params": [
      "name",
      "description"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "createPortfolio | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Creates a new Portfolio in the workspace to group and organize projects. | Parameters: name description"
  },
  {
    "name": "listPortfolios",
    "varName": "listPortfoliosTool",
    "category": "portfolio_project",
    "description": "Lists all portfolios available in the workspace.",
    "params": [],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "listPortfolios | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Lists all portfolios available in the workspace. | Parameters: "
  },
  {
    "name": "createProject",
    "varName": "createProjectTool",
    "category": "portfolio_project",
    "description": "Creates a new project in Workwayz workspace under a portfolio, initializing default Kanban columns, settings, and environments. WARNING: DO NOT call this tool when the user is already working inside an active project and providing project specifications, platform summary, or domain details — use updateProjectSpecifications or updateProjectDetails instead.",
    "params": [
      "name",
      "portfolioId",
      "pricingModel",
      "summary",
      "description"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "createProject | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Creates a new project in Workwayz workspace under a portfolio, initializing default Kanban columns, settings, and environments. WARNING: DO NOT call this tool when the user is already working inside an active project and providing project specifications, platform summary, or domain details — use updateProjectSpecifications or updateProjectDetails instead. | Parameters: name portfolioId pricingModel summary description"
  },
  {
    "name": "createEpic",
    "varName": "createEpicTool",
    "category": "agile_sprints",
    "description": "Creates a new Agile Epic in a project to group related user stories.",
    "params": [
      "projectId",
      "title",
      "description"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "createEpic | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Creates a new Agile Epic in a project to group related user stories. | Parameters: projectId title description"
  },
  {
    "name": "createSprint",
    "varName": "createSprintTool",
    "category": "agile_sprints",
    "description": "Creates a new sprint timebox in a project.",
    "params": [
      "projectId",
      "title",
      "goal",
      "startDate",
      "endDate"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "createSprint | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Creates a new sprint timebox in a project. | Parameters: projectId title goal startDate endDate"
  },
  {
    "name": "updateSprint",
    "varName": "updateSprintTool",
    "category": "agile_sprints",
    "description": "Updates a sprint status (e.g. start sprint by setting to",
    "params": [
      "projectId",
      "sprintId",
      "status",
      "goal",
      "startDate",
      "endDate"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "updateSprint | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Updates a sprint status (e.g. start sprint by setting to | Parameters: projectId sprintId status goal startDate endDate"
  },
  {
    "name": "assignStoryToSprint",
    "varName": "assignStoryToSprintTool",
    "category": "agile_sprints",
    "description": "Assigns a work item (story, bug, task) to a sprint, or removes it to backlog by passing sprintId=null.",
    "params": [
      "projectId",
      "storyId",
      "sprintId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "assignStoryToSprint | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Assigns a work item (story, bug, task) to a sprint, or removes it to backlog by passing sprintId=null. | Parameters: projectId storyId sprintId"
  },
  {
    "name": "createTestCase",
    "varName": "createTestCaseTool",
    "category": "qa_testing",
    "description": "Creates a QA test case in a project with auto-generated TC-X sequential ID.",
    "params": [
      "projectId",
      "title",
      "description",
      "expectedResult",
      "type",
      "storyId",
      "assigneeId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "createTestCase | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Creates a QA test case in a project with auto-generated TC-X sequential ID. | Parameters: projectId title description expectedResult type storyId assigneeId"
  },
  {
    "name": "bulkCreateTestCases",
    "varName": "bulkCreateTestCasesTool",
    "category": "qa_testing",
    "description": "Creates multiple QA test cases in a single batch operation. Highly recommended when generating test cases for user stories, features, or system specifications.",
    "params": [
      "projectId",
      "title",
      "description",
      "expectedResult",
      "type",
      "storyId",
      "assigneeId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "bulkCreateTestCases | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Creates multiple QA test cases in a single batch operation. Highly recommended when generating test cases for user stories, features, or system specifications. | Parameters: projectId title description expectedResult type storyId assigneeId"
  },
  {
    "name": "createTestPlan",
    "varName": "createTestPlanTool",
    "category": "qa_testing",
    "description": "Creates a QA test cycle or test plan in a project with TP-X ID.",
    "params": [
      "projectId",
      "name",
      "planType",
      "startDate",
      "endDate",
      "environmentId",
      "sprintId",
      "releaseId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "createTestPlan | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Creates a QA test cycle or test plan in a project with TP-X ID. | Parameters: projectId name planType startDate endDate environmentId sprintId releaseId"
  },
  {
    "name": "addTestCasesToTestPlan",
    "varName": "addTestCasesToTestPlanTool",
    "category": "qa_testing",
    "description": "Adds existing project test cases into a specific Test Plan or Test Cycle for execution.",
    "params": [
      "projectId",
      "planId",
      "planName",
      "testCaseIds",
      "executionDate"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "addTestCasesToTestPlan | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Adds existing project test cases into a specific Test Plan or Test Cycle for execution. | Parameters: projectId planId planName testCaseIds executionDate"
  },
  {
    "name": "updateTestCaseStatus",
    "varName": "updateTestCaseStatusTool",
    "category": "qa_testing",
    "description": "Updates the execution status of a test case in a test cycle (Passed, Failed, Blocked, Skipped, Not Run).",
    "params": [
      "projectId",
      "testCaseId",
      "planId",
      "status",
      "actualEffortHours",
      "comments"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "updateTestCaseStatus | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Updates the execution status of a test case in a test cycle (Passed, Failed, Blocked, Skipped, Not Run). | Parameters: projectId testCaseId planId status actualEffortHours comments"
  },
  {
    "name": "createRaidItem",
    "varName": "createRaidItemTool",
    "category": "governance_raid",
    "description": "Logs a governance item (Risk, Assumption, Issue, or Dependency) in the RAID log with RSK-X, ASM-X, ISS-X, or DEP-X ID.",
    "params": [
      "projectId",
      "raidType",
      "description",
      "severity",
      "probability",
      "mitigationPlan",
      "category",
      "assumptionStatus",
      "priority",
      "issueStatus",
      "dependencyType",
      "dependencyOn",
      "expectedByDate",
      "dependencyStatus"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "createRaidItem | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Logs a governance item (Risk, Assumption, Issue, or Dependency) in the RAID log with RSK-X, ASM-X, ISS-X, or DEP-X ID. | Parameters: projectId raidType description severity probability mitigationPlan category assumptionStatus priority issueStatus dependencyType dependencyOn expectedByDate dependencyStatus"
  },
  {
    "name": "updateRaidItem",
    "varName": "updateRaidItemTool",
    "category": "governance_raid",
    "description": "Updates an existing RAID item (e.g. close an issue, update risk mitigation).",
    "params": [
      "projectId",
      "raidType",
      "itemId",
      "updates",
      "status",
      "mitigationPlan",
      "contingencyPlan",
      "priority"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "updateRaidItem | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Updates an existing RAID item (e.g. close an issue, update risk mitigation). | Parameters: projectId raidType itemId updates status mitigationPlan contingencyPlan priority"
  },
  {
    "name": "updateProjectDetails",
    "varName": "updateProjectDetailsTool",
    "category": "portfolio_project",
    "description": "Updates project summary, scope description, pricing model, overall health status, name, or portfolio assignment.",
    "params": [
      "projectId",
      "portfolioId",
      "summary",
      "description",
      "name",
      "pricingModel",
      "status",
      "overallStatus"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "updateProjectDetails | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Updates project summary, scope description, pricing model, overall health status, name, or portfolio assignment. | Parameters: projectId portfolioId summary description name pricingModel status overallStatus"
  },
  {
    "name": "moveProjectToPortfolio",
    "varName": "moveProjectToPortfolioTool",
    "category": "portfolio_project",
    "description": "Moves or reassigns an existing project to a different portfolio folder (e.g.",
    "params": [
      "projectId",
      "portfolioId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "moveProjectToPortfolio | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Moves or reassigns an existing project to a different portfolio folder (e.g. | Parameters: projectId portfolioId"
  },
  {
    "name": "addImpactedSystem",
    "varName": "addImpactedSystemTool",
    "category": "specifications_estimation",
    "description": "Adds an architectural component / module impacted by the project to specifications with estimation.",
    "params": [
      "projectId",
      "name",
      "description",
      "category",
      "estimate",
      "dailyBillingRate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "addImpactedSystem | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Adds an architectural component / module impacted by the project to specifications with estimation. | Parameters: projectId name description category estimate dailyBillingRate"
  },
  {
    "name": "addHorizontal",
    "varName": "addHorizontalTool",
    "category": "specifications_estimation",
    "description": "Adds a cross-cutting capability (e.g.",
    "params": [
      "projectId",
      "name",
      "weightage",
      "dailyBillingRate",
      "isEnabled"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "addHorizontal | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Adds a cross-cutting capability (e.g. | Parameters: projectId name weightage dailyBillingRate isEnabled"
  },
  {
    "name": "updateProjectSpecifications",
    "varName": "updateProjectSpecificationsTool",
    "category": "specifications_estimation",
    "description": "Bulk sets the project summary, impacted systems, and horizontals in project specifications.",
    "params": [
      "projectId",
      "summary",
      "name",
      "description",
      "category",
      "estimate",
      "dailyBillingRate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "updateProjectSpecifications | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Bulk sets the project summary, impacted systems, and horizontals in project specifications. | Parameters: projectId summary name description category estimate dailyBillingRate"
  },
  {
    "name": "createRelease",
    "varName": "createReleaseTool",
    "category": "releases_milestones",
    "description": "Creates a project Release, Stage, or Milestone in the project schedule.",
    "params": [
      "projectId",
      "name",
      "itemType",
      "description",
      "startDate",
      "endDate",
      "milestoneDate"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "createRelease | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Creates a project Release, Stage, or Milestone in the project schedule. | Parameters: projectId name itemType description startDate endDate milestoneDate"
  },
  {
    "name": "createPaymentMilestone",
    "varName": "createPaymentMilestoneTool",
    "category": "releases_milestones",
    "description": "Creates a commercial payment milestone with billing percentage and amount.",
    "params": [
      "projectId",
      "name",
      "billingPercentage",
      "amount"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "createPaymentMilestone | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Creates a commercial payment milestone with billing percentage and amount. | Parameters: projectId name billingPercentage amount"
  },
  {
    "name": "assignProjectResource",
    "varName": "assignProjectResourceTool",
    "category": "resources",
    "description": "Assigns an employee/resource to the project team with role and daily billing rate.",
    "params": [
      "projectId",
      "name",
      "role",
      "billingRate",
      "onboardingDate"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "assignProjectResource | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Assigns an employee/resource to the project team with role and daily billing rate. | Parameters: projectId name role billingRate onboardingDate"
  },
  {
    "name": "logWork",
    "varName": "logWorkTool",
    "category": "time_leaves",
    "description": "Logs work hours against a user story or task for a specific date in timesheets.",
    "params": [
      "projectId",
      "storyId",
      "hours",
      "description",
      "date",
      "workType"
    ],
    "aliases": [
      "worklog",
      "timesheet",
      "log hours",
      "effort"
    ],
    "searchText": "logWork | Category: time_leaves | Aliases: worklog timesheet log hours effort | Description: Logs work hours against a user story or task for a specific date in timesheets. | Parameters: projectId storyId hours description date workType"
  },
  {
    "name": "addEnvironment",
    "varName": "addEnvironmentTool",
    "category": "settings_environments",
    "description": "Adds an environment (Dev, SIT, UAT, Staging, Production) to project configurations.",
    "params": [
      "projectId",
      "name"
    ],
    "aliases": [
      "environment",
      "settings",
      "gantt",
      "git repository",
      "columns"
    ],
    "searchText": "addEnvironment | Category: settings_environments | Aliases: environment settings gantt git repository columns | Description: Adds an environment (Dev, SIT, UAT, Staging, Production) to project configurations. | Parameters: projectId name"
  },
  {
    "name": "addCodeRepository",
    "varName": "addCodeRepositoryTool",
    "category": "settings_environments",
    "description": "Links a GitHub, GitLab, or Bitbucket repository URL to the project.",
    "params": [
      "projectId",
      "repoUrl",
      "service",
      "branch"
    ],
    "aliases": [
      "environment",
      "settings",
      "gantt",
      "git repository",
      "columns"
    ],
    "searchText": "addCodeRepository | Category: settings_environments | Aliases: environment settings gantt git repository columns | Description: Links a GitHub, GitLab, or Bitbucket repository URL to the project. | Parameters: projectId repoUrl service branch"
  },
  {
    "name": "addFixedCost",
    "varName": "addFixedCostTool",
    "category": "general",
    "description": "Adds a fixed financial cost item (software license, infrastructure, third-party API) to project finances.",
    "params": [
      "projectId",
      "description",
      "costType",
      "amount",
      "frequency"
    ],
    "aliases": [],
    "searchText": "addFixedCost | Category: general | Aliases:  | Description: Adds a fixed financial cost item (software license, infrastructure, third-party API) to project finances. | Parameters: projectId description costType amount frequency"
  },
  {
    "name": "queryProjectContext",
    "varName": "queryProjectContextTool",
    "category": "portfolio_project",
    "description": "Queries project information: stories count, epics, sprints, risks, issues, environments, specifications.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "queryProjectContext | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Queries project information: stories count, epics, sprints, risks, issues, environments, specifications. | Parameters: projectId"
  },
  {
    "name": "listProjects",
    "varName": "listProjectsTool",
    "category": "portfolio_project",
    "description": "Lists all projects currently in the workspace with ID, name, portfolio, and status.",
    "params": [],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "listProjects | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Lists all projects currently in the workspace with ID, name, portfolio, and status. | Parameters: "
  },
  {
    "name": "archiveProject",
    "varName": "archiveProjectTool",
    "category": "portfolio_project",
    "description": "Archives an active project, moving it to the Archived Projects tab on Project Home.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "archiveProject | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Archives an active project, moving it to the Archived Projects tab on Project Home. | Parameters: projectId"
  },
  {
    "name": "unarchiveProject",
    "varName": "unarchiveProjectTool",
    "category": "portfolio_project",
    "description": "Restores an archived project back to Active status on Project Home.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "unarchiveProject | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Restores an archived project back to Active status on Project Home. | Parameters: projectId"
  },
  {
    "name": "deleteProject",
    "varName": "deleteProjectTool",
    "category": "portfolio_project",
    "description": "Moves a project to trash / deletes a project from Project Home.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "deleteProject | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Moves a project to trash / deletes a project from Project Home. | Parameters: projectId"
  },
  {
    "name": "updatePortfolio",
    "varName": "updatePortfolioTool",
    "category": "portfolio_project",
    "description": "Updates a portfolio folder name or description on Project Home.",
    "params": [
      "portfolioId",
      "name",
      "description"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "updatePortfolio | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Updates a portfolio folder name or description on Project Home. | Parameters: portfolioId name description"
  },
  {
    "name": "deletePortfolio",
    "varName": "deletePortfolioTool",
    "category": "portfolio_project",
    "description": "Deletes an empty portfolio folder from Project Home (fails if active projects belong to it).",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "deletePortfolio | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Deletes an empty portfolio folder from Project Home (fails if active projects belong to it). | Parameters: portfolioId"
  },
  {
    "name": "setProjectManager",
    "varName": "setProjectManagerTool",
    "category": "portfolio_project",
    "description": "Assigns or updates the primary Project Manager for a project on Project Home.",
    "params": [
      "projectId",
      "projectManagerId",
      "projectManagerName"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "setProjectManager | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Assigns or updates the primary Project Manager for a project on Project Home. | Parameters: projectId projectManagerId projectManagerName"
  },
  {
    "name": "autogenProject",
    "varName": "autogenProjectTool",
    "category": "portfolio_project",
    "description": "Scaffolds an entire turnkey project with epics, stories, tasks, test cycles, test cases, and RAID items.",
    "params": [
      "projectName",
      "portfolioId",
      "pricingModel"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "autogenProject | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Scaffolds an entire turnkey project with epics, stories, tasks, test cycles, test cases, and RAID items. | Parameters: projectName portfolioId pricingModel"
  },
  {
    "name": "getPortfolioDashboardSummary",
    "varName": "getPortfolioDashboardSummaryTool",
    "category": "portfolio_project",
    "description": "Retrieves executive RAG health distribution (Red, Amber, Green), high potential risks, and critical issues across the portfolio.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "getPortfolioDashboardSummary | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Retrieves executive RAG health distribution (Red, Amber, Green), high potential risks, and critical issues across the portfolio. | Parameters: portfolioId"
  },
  {
    "name": "queryPortfolioRisks",
    "varName": "queryPortfolioRisksTool",
    "category": "governance_raid",
    "description": "Queries and ranks high-potential risks across all active projects in the portfolio.",
    "params": [
      "portfolioId",
      "minPotential"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "queryPortfolioRisks | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Queries and ranks high-potential risks across all active projects in the portfolio. | Parameters: portfolioId minPotential"
  },
  {
    "name": "queryPortfolioIssues",
    "varName": "queryPortfolioIssuesTool",
    "category": "governance_raid",
    "description": "Queries open critical and high priority issues/blockers across all active projects.",
    "params": [
      "portfolioId",
      "priority",
      "status"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "queryPortfolioIssues | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Queries open critical and high priority issues/blockers across all active projects. | Parameters: portfolioId priority status"
  },
  {
    "name": "queryQualityEstimations",
    "varName": "queryQualityEstimationsTool",
    "category": "specifications_estimation",
    "description": "Queries initial man-days vs planned man-days, variance, actual effort, and conformance rates across projects.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "queryQualityEstimations | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Queries initial man-days vs planned man-days, variance, actual effort, and conformance rates across projects. | Parameters: portfolioId"
  },
  {
    "name": "queryQualityDefects",
    "varName": "queryQualityDefectsTool",
    "category": "qa_testing",
    "description": "Queries cross-project defect counts (SIT, UAT, Production) and production defect leakage rate percentages.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryQualityDefects | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Queries cross-project defect counts (SIT, UAT, Production) and production defect leakage rate percentages. | Parameters: portfolioId"
  },
  {
    "name": "queryBillingOverview",
    "varName": "queryBillingOverviewTool",
    "category": "pmo_financials",
    "description": "Queries revenue, resource costs, fixed costs, gross profit, and profit margin % across all projects.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "queryBillingOverview | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Queries revenue, resource costs, fixed costs, gross profit, and profit margin % across all projects. | Parameters: portfolioId"
  },
  {
    "name": "queryBillingRates",
    "varName": "queryBillingRatesTool",
    "category": "pmo_financials",
    "description": "Queries master resource rate directory, role benchmarks (avg billed rate, avg cost rate, avg margin %), and assigned rates.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "queryBillingRates | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Queries master resource rate directory, role benchmarks (avg billed rate, avg cost rate, avg margin %), and assigned rates. | Parameters: projectId"
  },
  {
    "name": "updateResourceRate",
    "varName": "updateResourceRateTool",
    "category": "resources",
    "description": "Updates daily billed rate and internal cost rate for an assigned resource in a project.",
    "params": [
      "projectId",
      "employeeId",
      "billedRate",
      "costRate"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "updateResourceRate | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Updates daily billed rate and internal cost rate for an assigned resource in a project. | Parameters: projectId employeeId billedRate costRate"
  },
  {
    "name": "updateSpecificationRate",
    "varName": "updateSpecificationRateTool",
    "category": "specifications_estimation",
    "description": "Updates the daily billing rate on an impacted system or horizontal capability.",
    "params": [
      "projectId",
      "specType",
      "itemId",
      "dailyBillingRate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "updateSpecificationRate | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Updates the daily billing rate on an impacted system or horizontal capability. | Parameters: projectId specType itemId dailyBillingRate"
  },
  {
    "name": "queryResourceUtilization",
    "varName": "queryResourceUtilizationTool",
    "category": "resources",
    "description": "Queries resource workload: active project allocations, availability %, planned task hours, actual logged hours, and over/under-allocation status.",
    "params": [
      "employeeId",
      "employeeName"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryResourceUtilization | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Queries resource workload: active project allocations, availability %, planned task hours, actual logged hours, and over/under-allocation status. | Parameters: employeeId employeeName"
  },
  {
    "name": "queryAvailableResources",
    "varName": "queryAvailableResourcesTool",
    "category": "resources",
    "description": "Searches for employees with available/free capacity (< 100% allocated across projects) filtered by role.",
    "params": [
      "role",
      "minAvailability"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryAvailableResources | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Searches for employees with available/free capacity (< 100% allocated across projects) filtered by role. | Parameters: role minAvailability"
  },
  {
    "name": "queryOverallocatedResources",
    "varName": "queryOverallocatedResourcesTool",
    "category": "resources",
    "description": "Identifies team members allocated > 100% across multiple simultaneous active projects.",
    "params": [],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryOverallocatedResources | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Identifies team members allocated > 100% across multiple simultaneous active projects. | Parameters: "
  },
  {
    "name": "queryHolidays",
    "varName": "queryHolidaysTool",
    "category": "time_leaves",
    "description": "Queries organization calendar holidays for the specified year.",
    "params": [
      "year"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "queryHolidays | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Queries organization calendar holidays for the specified year. | Parameters: year"
  },
  {
    "name": "createHoliday",
    "varName": "createHolidayTool",
    "category": "time_leaves",
    "description": "Adds a new holiday to the organization Holiday Calendar.",
    "params": [
      "name",
      "date",
      "type"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "createHoliday | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Adds a new holiday to the organization Holiday Calendar. | Parameters: name date type"
  },
  {
    "name": "deleteHoliday",
    "varName": "deleteHolidayTool",
    "category": "time_leaves",
    "description": "Deletes a holiday from the organization Holiday Calendar.",
    "params": [
      "holidayId"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "deleteHoliday | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Deletes a holiday from the organization Holiday Calendar. | Parameters: holidayId"
  },
  {
    "name": "queryLeaveSettings",
    "varName": "queryLeaveSettingsTool",
    "category": "time_leaves",
    "description": "Queries global leave policy quotas (allocated annual paid leaves, carryover limit, weekly off days).",
    "params": [],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "queryLeaveSettings | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Queries global leave policy quotas (allocated annual paid leaves, carryover limit, weekly off days). | Parameters: "
  },
  {
    "name": "updateLeaveSettings",
    "varName": "updateLeaveSettingsTool",
    "category": "time_leaves",
    "description": "Updates organization leave quotas, carryover permissions, or weekly off days in Leave Settings.",
    "params": [
      "allocatedPaidLeavesPerYear",
      "allowCarryOver",
      "carryOverLimit",
      "weeklyOffDays"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "updateLeaveSettings | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Updates organization leave quotas, carryover permissions, or weekly off days in Leave Settings. | Parameters: allocatedPaidLeavesPerYear allowCarryOver carryOverLimit weeklyOffDays"
  },
  {
    "name": "queryLeaveRequests",
    "varName": "queryLeaveRequestsTool",
    "category": "time_leaves",
    "description": "Queries employee leave requests and planned absences across the portfolio.",
    "params": [
      "employeeId",
      "type"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "queryLeaveRequests | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Queries employee leave requests and planned absences across the portfolio. | Parameters: employeeId type"
  },
  {
    "name": "applyLeave",
    "varName": "applyLeaveTool",
    "category": "time_leaves",
    "description": "Submits a leave request for an employee in Leave Tracker.",
    "params": [
      "employeeId",
      "startDate",
      "endDate",
      "type"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "applyLeave | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Submits a leave request for an employee in Leave Tracker. | Parameters: employeeId startDate endDate type"
  },
  {
    "name": "deleteLeave",
    "varName": "deleteLeaveTool",
    "category": "time_leaves",
    "description": "Cancels and deletes an employee leave record in Leave Tracker.",
    "params": [
      "employeeId",
      "leaveId"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "deleteLeave | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Cancels and deletes an employee leave record in Leave Tracker. | Parameters: employeeId leaveId"
  },
  {
    "name": "getProjectHomeMetrics",
    "varName": "getProjectHomeMetricsTool",
    "category": "portfolio_project",
    "description": "Queries workspace metrics for Project Home: total project count, active vs archived vs completed, health distributions (Red/Amber/Green), and portfolio counts.",
    "params": [],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "getProjectHomeMetrics | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Queries workspace metrics for Project Home: total project count, active vs archived vs completed, health distributions (Red/Amber/Green), and portfolio counts. | Parameters: "
  },
  {
    "name": "duplicateProject",
    "varName": "duplicateProjectTool",
    "category": "portfolio_project",
    "description": "Clones an existing project with its Kanban columns, settings, testing environments, and epics/specifications into a new project.",
    "params": [
      "sourceProjectId",
      "newProjectName",
      "targetPortfolioId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "duplicateProject | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Clones an existing project with its Kanban columns, settings, testing environments, and epics/specifications into a new project. | Parameters: sourceProjectId newProjectName targetPortfolioId"
  },
  {
    "name": "filterPortfolioDashboardByDate",
    "varName": "filterPortfolioDashboardByDateTool",
    "category": "portfolio_project",
    "description": "Filters the portfolio executive dashboard by a specific start date and end date range.",
    "params": [
      "portfolioId",
      "startDate",
      "endDate"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "filterPortfolioDashboardByDate | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Filters the portfolio executive dashboard by a specific start date and end date range. | Parameters: portfolioId startDate endDate"
  },
  {
    "name": "exportPortfolioDashboardReport",
    "varName": "exportPortfolioDashboardReportTool",
    "category": "portfolio_project",
    "description": "Generates structured executive portfolio status and health summary report data.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "exportPortfolioDashboardReport | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Generates structured executive portfolio status and health summary report data. | Parameters: portfolioId"
  },
  {
    "name": "exportQualityEstimationsReport",
    "varName": "exportQualityEstimationsReportTool",
    "category": "specifications_estimation",
    "description": "Exports cross-project initial ballpark man-days vs planned man-days, variance, and actual effort data for CSV export.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "exportQualityEstimationsReport | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Exports cross-project initial ballpark man-days vs planned man-days, variance, and actual effort data for CSV export. | Parameters: portfolioId"
  },
  {
    "name": "setQualityVarianceAlertThreshold",
    "varName": "setQualityVarianceAlertThresholdTool",
    "category": "general",
    "description": "Configures threshold percentage to trigger alerts when project planned effort exceeds initial estimation.",
    "params": [
      "thresholdPercent"
    ],
    "aliases": [],
    "searchText": "setQualityVarianceAlertThreshold | Category: general | Aliases:  | Description: Configures threshold percentage to trigger alerts when project planned effort exceeds initial estimation. | Parameters: thresholdPercent"
  },
  {
    "name": "queryDefectTrendByMonth",
    "varName": "queryDefectTrendByMonthTool",
    "category": "qa_testing",
    "description": "Analyzes monthly defect creation, resolution, and open trends across the portfolio over the past N months.",
    "params": [
      "portfolioId",
      "months"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryDefectTrendByMonth | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Analyzes monthly defect creation, resolution, and open trends across the portfolio over the past N months. | Parameters: portfolioId months"
  },
  {
    "name": "queryDefectRootCauseSummary",
    "varName": "queryDefectRootCauseSummaryTool",
    "category": "qa_testing",
    "description": "Aggregates defect classification by root cause category (Coding Logic, Requirements, UI/Design, Environment) and phase containment.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryDefectRootCauseSummary | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Aggregates defect classification by root cause category (Coding Logic, Requirements, UI/Design, Environment) and phase containment. | Parameters: portfolioId"
  },
  {
    "name": "exportBillingOverviewCsv",
    "varName": "exportBillingOverviewCsvTool",
    "category": "pmo_financials",
    "description": "Exports consolidated portfolio financial breakdown (revenue, cost, fixed cost, profit, margin %) to CSV-ready format.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "exportBillingOverviewCsv | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Exports consolidated portfolio financial breakdown (revenue, cost, fixed cost, profit, margin %) to CSV-ready format. | Parameters: portfolioId"
  },
  {
    "name": "queryProjectProfitabilityForecast",
    "varName": "queryProjectProfitabilityForecastTool",
    "category": "portfolio_project",
    "description": "Generates future profit margin projections and health status based on planned sprint allocations and milestone schedules.",
    "params": [
      "portfolioId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "queryProjectProfitabilityForecast | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Generates future profit margin projections and health status based on planned sprint allocations and milestone schedules. | Parameters: portfolioId"
  },
  {
    "name": "bulkUpdateResourceRates",
    "varName": "bulkUpdateResourceRatesTool",
    "category": "resources",
    "description": "Batch updates daily billed and cost rates for multiple resources across projects in a single operation.",
    "params": [
      "updates",
      "employeeId",
      "projectId",
      "billedRate",
      "costRate"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "bulkUpdateResourceRates | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Batch updates daily billed and cost rates for multiple resources across projects in a single operation. | Parameters: updates employeeId projectId billedRate costRate"
  },
  {
    "name": "setDefaultRoleBenchmarkRates",
    "varName": "setDefaultRoleBenchmarkRatesTool",
    "category": "resources",
    "description": "Sets standard organization baseline billed and cost rates for standard roles (Developer, Tester, Architect, BA, PM).",
    "params": [
      "role",
      "defaultBilledRate",
      "defaultCostRate"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "setDefaultRoleBenchmarkRates | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Sets standard organization baseline billed and cost rates for standard roles (Developer, Tester, Architect, BA, PM). | Parameters: role defaultBilledRate defaultCostRate"
  },
  {
    "name": "createUser",
    "varName": "createUserTool",
    "category": "resources",
    "description": "RESTRICTED GOVERNANCE: Adding or creating users in Portfolio > Users through FlowPilot is strictly disallowed. Direct users to the Portfolio > Users page.",
    "params": [
      "email",
      "firstName",
      "lastName",
      "empId",
      "phone",
      "role",
      "accessLevel",
      "experience",
      "costAmount",
      "costCurrency",
      "employmentStartDate",
      "employmentEndDate"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "createUser | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: RESTRICTED GOVERNANCE: Adding or creating users in Portfolio > Users through FlowPilot is strictly disallowed. Direct users to the Portfolio > Users page. | Parameters: email firstName lastName empId phone role accessLevel experience costAmount costCurrency employmentStartDate employmentEndDate"
  },
  {
    "name": "updateUserRole",
    "varName": "updateUserRoleTool",
    "category": "resources",
    "description": "Modifies an existing user\\",
    "params": [
      "userIdOrEmpId",
      "role",
      "accessLevel",
      "department",
      "employmentStartDate",
      "employmentEndDate"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "updateUserRole | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Modifies an existing user\\ | Parameters: userIdOrEmpId role accessLevel department employmentStartDate employmentEndDate"
  },
  {
    "name": "toggleUserStatus",
    "varName": "toggleUserStatusTool",
    "category": "resources",
    "description": "Enables or disables user account login access in User List.",
    "params": [
      "userIdOrEmpId",
      "isEnabled"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "toggleUserStatus | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Enables or disables user account login access in User List. | Parameters: userIdOrEmpId isEnabled"
  },
  {
    "name": "listAllUsers",
    "varName": "listAllUsersTool",
    "category": "resources",
    "description": "Retrieves the complete organization user directory with roles, access levels, enabled status, and employee IDs.",
    "params": [
      "role",
      "accessLevel",
      "isEnabled"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "listAllUsers | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Retrieves the complete organization user directory with roles, access levels, enabled status, and employee IDs. | Parameters: role accessLevel isEnabled"
  },
  {
    "name": "queryDepartmentUtilizationTrends",
    "varName": "queryDepartmentUtilizationTrendsTool",
    "category": "resources",
    "description": "Aggregates team capacity utilization percentages grouped by department and skill role in Utilization view.",
    "params": [
      "department"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryDepartmentUtilizationTrends | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Aggregates team capacity utilization percentages grouped by department and skill role in Utilization view. | Parameters: department"
  },
  {
    "name": "exportResourceUtilizationReport",
    "varName": "exportResourceUtilizationReportTool",
    "category": "resources",
    "description": "Exports complete organization resource utilization sheet with allocation %, free capacity %, active projects, and workload status.",
    "params": [],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "exportResourceUtilizationReport | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Exports complete organization resource utilization sheet with allocation %, free capacity %, active projects, and workload status. | Parameters: "
  },
  {
    "name": "bulkImportHolidays",
    "varName": "bulkImportHolidaysTool",
    "category": "time_leaves",
    "description": "Batch uploads a list of national/regional holidays to the Holiday Calendar in a single operation.",
    "params": [
      "holidays",
      "name",
      "date",
      "type"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "bulkImportHolidays | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Batch uploads a list of national/regional holidays to the Holiday Calendar in a single operation. | Parameters: holidays name date type"
  },
  {
    "name": "updateHoliday",
    "varName": "updateHolidayTool",
    "category": "time_leaves",
    "description": "Modifies an existing holiday name, date, or category in the Holiday Calendar.",
    "params": [
      "holidayId",
      "name",
      "date",
      "type"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "updateHoliday | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Modifies an existing holiday name, date, or category in the Holiday Calendar. | Parameters: holidayId name date type"
  },
  {
    "name": "resetAnnualLeaveBalances",
    "varName": "resetAnnualLeaveBalancesTool",
    "category": "time_leaves",
    "description": "Executes annual leave quota rollover and applies carryover limit quotas for all employees.",
    "params": [
      "year",
      "carryOverLimit"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "resetAnnualLeaveBalances | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Executes annual leave quota rollover and applies carryover limit quotas for all employees. | Parameters: year carryOverLimit"
  },
  {
    "name": "approveLeaveRequest",
    "varName": "approveLeaveRequestTool",
    "category": "time_leaves",
    "description": "Approves a pending employee leave request in Leave Tracker.",
    "params": [
      "employeeId",
      "leaveId",
      "approverNotes"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "approveLeaveRequest | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Approves a pending employee leave request in Leave Tracker. | Parameters: employeeId leaveId approverNotes"
  },
  {
    "name": "rejectLeaveRequest",
    "varName": "rejectLeaveRequestTool",
    "category": "time_leaves",
    "description": "Rejects a pending employee leave request in Leave Tracker with reason.",
    "params": [
      "employeeId",
      "leaveId",
      "reason"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "rejectLeaveRequest | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Rejects a pending employee leave request in Leave Tracker with reason. | Parameters: employeeId leaveId reason"
  },
  {
    "name": "queryEmployeeLeaveBalance",
    "varName": "queryEmployeeLeaveBalanceTool",
    "category": "time_leaves",
    "description": "Checks allocated annual leave quota, used leave days, and real-time remaining leave balance for a specific employee.",
    "params": [
      "employeeId",
      "year"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "queryEmployeeLeaveBalance | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Checks allocated annual leave quota, used leave days, and real-time remaining leave balance for a specific employee. | Parameters: employeeId year"
  },
  {
    "name": "updateInitialImpactedSystem",
    "varName": "updateInitialImpactedSystemTool",
    "category": "specifications_estimation",
    "description": "Updates an initial impacted system estimate or daily rate in the initial estimation phase.",
    "params": [
      "projectId",
      "itemId",
      "name",
      "description",
      "category",
      "estimate",
      "dailyBillingRate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "updateInitialImpactedSystem | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Updates an initial impacted system estimate or daily rate in the initial estimation phase. | Parameters: projectId itemId name description category estimate dailyBillingRate"
  },
  {
    "name": "deleteInitialImpactedSystem",
    "varName": "deleteInitialImpactedSystemTool",
    "category": "specifications_estimation",
    "description": "Deletes an initial impacted system from estimation.",
    "params": [
      "projectId",
      "itemId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "deleteInitialImpactedSystem | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Deletes an initial impacted system from estimation. | Parameters: projectId itemId"
  },
  {
    "name": "updateInitialHorizontal",
    "varName": "updateInitialHorizontalTool",
    "category": "specifications_estimation",
    "description": "Updates an initial horizontal capability weightage % or billing rate.",
    "params": [
      "projectId",
      "itemId",
      "name",
      "weightage",
      "dailyBillingRate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "updateInitialHorizontal | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Updates an initial horizontal capability weightage % or billing rate. | Parameters: projectId itemId name weightage dailyBillingRate"
  },
  {
    "name": "deleteInitialHorizontal",
    "varName": "deleteInitialHorizontalTool",
    "category": "specifications_estimation",
    "description": "Deletes an initial horizontal capability.",
    "params": [
      "projectId",
      "itemId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "deleteInitialHorizontal | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Deletes an initial horizontal capability. | Parameters: projectId itemId"
  },
  {
    "name": "queryInitialSpecifications",
    "varName": "queryInitialSpecificationsTool",
    "category": "specifications_estimation",
    "description": "Queries full initial estimation specifications, dev effort/cost rollups, and horizontals.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "queryInitialSpecifications | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Queries full initial estimation specifications, dev effort/cost rollups, and horizontals. | Parameters: projectId"
  },
  {
    "name": "confirmProjectEstimation",
    "varName": "confirmProjectEstimationTool",
    "category": "specifications_estimation",
    "description": "Promotes initial estimation specifications to active project baseline and moves project status to Active.",
    "params": [
      "projectId",
      "targetStatus"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "confirmProjectEstimation | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Promotes initial estimation specifications to active project baseline and moves project status to Active. | Parameters: projectId targetStatus"
  },
  {
    "name": "updateInitialProjectDates",
    "varName": "updateInitialProjectDatesTool",
    "category": "specifications_estimation",
    "description": "Sets planned start and end dates during initial estimation phase.",
    "params": [
      "projectId",
      "startDate",
      "endDate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "updateInitialProjectDates | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Sets planned start and end dates during initial estimation phase. | Parameters: projectId startDate endDate"
  },
  {
    "name": "queryInitialProjectStatus",
    "varName": "queryInitialProjectStatusTool",
    "category": "specifications_estimation",
    "description": "Retrieves estimation phase metadata, PM assignment, and timeline.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "queryInitialProjectStatus | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Retrieves estimation phase metadata, PM assignment, and timeline. | Parameters: projectId"
  },
  {
    "name": "updateProjectHealth",
    "varName": "updateProjectHealthTool",
    "category": "portfolio_project",
    "description": "Updates Scope, Cost, Time, and Overall RAG health indicators with commentary.",
    "params": [
      "projectId",
      "overallStatus",
      "scopeHealth",
      "costHealth",
      "timeHealth",
      "commentary",
      "authorName"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "updateProjectHealth | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Updates Scope, Cost, Time, and Overall RAG health indicators with commentary. | Parameters: projectId overallStatus scopeHealth costHealth timeHealth commentary authorName"
  },
  {
    "name": "updateProjectDates",
    "varName": "updateProjectDatesTool",
    "category": "portfolio_project",
    "description": "Updates active project start and end dates with validation.",
    "params": [
      "projectId",
      "startDate",
      "endDate"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "updateProjectDates | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Updates active project start and end dates with validation. | Parameters: projectId startDate endDate"
  },
  {
    "name": "queryProjectStatusDetails",
    "varName": "queryProjectStatusDetailsTool",
    "category": "portfolio_project",
    "description": "Retrieves complete project status info, RAG health indicators, PM assignment, and status audit history.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "queryProjectStatusDetails | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Retrieves complete project status info, RAG health indicators, PM assignment, and status audit history. | Parameters: projectId"
  },
  {
    "name": "queryProjectPmDashboard",
    "varName": "queryProjectPmDashboardTool",
    "category": "portfolio_project",
    "description": "Retrieves PM dashboard metrics: task distribution, epic progress %, planned vs logged hours.",
    "params": [
      "projectId",
      "sprintId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "queryProjectPmDashboard | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Retrieves PM dashboard metrics: task distribution, epic progress %, planned vs logged hours. | Parameters: projectId sprintId"
  },
  {
    "name": "queryProjectWorkload",
    "varName": "queryProjectWorkloadTool",
    "category": "resources",
    "description": "Queries sub-task effort vs bug effort allocated to each team member by sprint.",
    "params": [
      "projectId",
      "sprintId"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryProjectWorkload | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Queries sub-task effort vs bug effort allocated to each team member by sprint. | Parameters: projectId sprintId"
  },
  {
    "name": "queryProjectResourceFinancials",
    "varName": "queryProjectResourceFinancialsTool",
    "category": "resources",
    "description": "Computes project billed revenue vs internal cost and margins by role.",
    "params": [
      "projectId",
      "timeframe"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryProjectResourceFinancials | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Computes project billed revenue vs internal cost and margins by role. | Parameters: projectId timeframe"
  },
  {
    "name": "querySwimLaneCycleTime",
    "varName": "querySwimLaneCycleTimeTool",
    "category": "general",
    "description": "Calculates average duration spent by items in each Kanban status lane.",
    "params": [
      "projectId"
    ],
    "aliases": [],
    "searchText": "querySwimLaneCycleTime | Category: general | Aliases:  | Description: Calculates average duration spent by items in each Kanban status lane. | Parameters: projectId"
  },
  {
    "name": "queryResourceBottlenecks",
    "varName": "queryResourceBottlenecksTool",
    "category": "resources",
    "description": "Analyzes cycle times and active WIP per resource with bottleneck risk rankings.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryResourceBottlenecks | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Analyzes cycle times and active WIP per resource with bottleneck risk rankings. | Parameters: projectId"
  },
  {
    "name": "queryEpicProgress",
    "varName": "queryEpicProgressTool",
    "category": "agile_sprints",
    "description": "Queries epics with completed stories count and progress percentage.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "queryEpicProgress | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Queries epics with completed stories count and progress percentage. | Parameters: projectId"
  },
  {
    "name": "updateImpactedSystem",
    "varName": "updateImpactedSystemTool",
    "category": "specifications_estimation",
    "description": "Updates active impacted system details and man-days.",
    "params": [
      "projectId",
      "itemId",
      "name",
      "description",
      "category",
      "estimate",
      "dailyBillingRate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "updateImpactedSystem | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Updates active impacted system details and man-days. | Parameters: projectId itemId name description category estimate dailyBillingRate"
  },
  {
    "name": "deleteImpactedSystem",
    "varName": "deleteImpactedSystemTool",
    "category": "specifications_estimation",
    "description": "Deletes active impacted system from project.",
    "params": [
      "projectId",
      "itemId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "deleteImpactedSystem | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Deletes active impacted system from project. | Parameters: projectId itemId"
  },
  {
    "name": "updateHorizontal",
    "varName": "updateHorizontalTool",
    "category": "specifications_estimation",
    "description": "Updates active horizontal capability weightage % or billing rate.",
    "params": [
      "projectId",
      "itemId",
      "name",
      "weightage",
      "dailyBillingRate"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "updateHorizontal | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Updates active horizontal capability weightage % or billing rate. | Parameters: projectId itemId name weightage dailyBillingRate"
  },
  {
    "name": "deleteHorizontal",
    "varName": "deleteHorizontalTool",
    "category": "specifications_estimation",
    "description": "Deletes active horizontal capability from project.",
    "params": [
      "projectId",
      "itemId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "deleteHorizontal | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Deletes active horizontal capability from project. | Parameters: projectId itemId"
  },
  {
    "name": "queryProjectSpecifications",
    "varName": "queryProjectSpecificationsTool",
    "category": "specifications_estimation",
    "description": "Retrieves active project specifications, impacted systems, horizontals, and environments.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "specs",
      "specifications",
      "impacted systems",
      "horizontals",
      "estimation",
      "architecture",
      "mandays",
      "billing rate"
    ],
    "searchText": "queryProjectSpecifications | Category: specifications_estimation | Aliases: specs specifications impacted systems horizontals estimation architecture mandays billing rate | Description: Retrieves active project specifications, impacted systems, horizontals, and environments. | Parameters: projectId"
  },
  {
    "name": "deleteEnvironment",
    "varName": "deleteEnvironmentTool",
    "category": "settings_environments",
    "description": "Removes a testing/deployment environment from the project.",
    "params": [
      "projectId",
      "envId"
    ],
    "aliases": [
      "environment",
      "settings",
      "gantt",
      "git repository",
      "columns"
    ],
    "searchText": "deleteEnvironment | Category: settings_environments | Aliases: environment settings gantt git repository columns | Description: Removes a testing/deployment environment from the project. | Parameters: projectId envId"
  },
  {
    "name": "reorderEnvironments",
    "varName": "reorderEnvironmentsTool",
    "category": "settings_environments",
    "description": "Updates the display order sequence of project testing environments.",
    "params": [
      "projectId",
      "orderedEnvIds"
    ],
    "aliases": [
      "environment",
      "settings",
      "gantt",
      "git repository",
      "columns"
    ],
    "searchText": "reorderEnvironments | Category: settings_environments | Aliases: environment settings gantt git repository columns | Description: Updates the display order sequence of project testing environments. | Parameters: projectId orderedEnvIds"
  },
  {
    "name": "removeProjectResource",
    "varName": "removeProjectResourceTool",
    "category": "resources",
    "description": "De-allocates and removes a team member resource from the project.",
    "params": [
      "projectId",
      "resourceId"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "removeProjectResource | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: De-allocates and removes a team member resource from the project. | Parameters: projectId resourceId"
  },
  {
    "name": "updateProjectResourceRole",
    "varName": "updateProjectResourceRoleTool",
    "category": "resources",
    "description": "Updates a project resource role or allocation percentage.",
    "params": [
      "projectId",
      "resourceId",
      "role",
      "allocationPercentage"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "updateProjectResourceRole | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Updates a project resource role or allocation percentage. | Parameters: projectId resourceId role allocationPercentage"
  },
  {
    "name": "queryProjectTeamMembers",
    "varName": "queryProjectTeamMembersTool",
    "category": "resources",
    "description": "Lists all allocated team members on the project with roles and billing rates.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryProjectTeamMembers | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Lists all allocated team members on the project with roles and billing rates. | Parameters: projectId"
  },
  {
    "name": "queryProjectWorklogs",
    "varName": "queryProjectWorklogsTool",
    "category": "time_leaves",
    "description": "Queries timesheet worklogs filtered by employee, date range, or sprint.",
    "params": [
      "projectId",
      "employeeId",
      "startDate",
      "endDate"
    ],
    "aliases": [
      "worklog",
      "timesheet",
      "log hours",
      "effort"
    ],
    "searchText": "queryProjectWorklogs | Category: time_leaves | Aliases: worklog timesheet log hours effort | Description: Queries timesheet worklogs filtered by employee, date range, or sprint. | Parameters: projectId employeeId startDate endDate"
  },
  {
    "name": "deleteWorklogEntry",
    "varName": "deleteWorklogEntryTool",
    "category": "time_leaves",
    "description": "Deletes a timesheet worklog entry.",
    "params": [
      "projectId",
      "worklogId"
    ],
    "aliases": [
      "worklog",
      "timesheet",
      "log hours",
      "effort"
    ],
    "searchText": "deleteWorklogEntry | Category: time_leaves | Aliases: worklog timesheet log hours effort | Description: Deletes a timesheet worklog entry. | Parameters: projectId worklogId"
  },
  {
    "name": "updateWorklogEntry",
    "varName": "updateWorklogEntryTool",
    "category": "time_leaves",
    "description": "Modifies logged hours, description, or work type for a timesheet entry.",
    "params": [
      "projectId",
      "worklogId",
      "hours",
      "description",
      "workType"
    ],
    "aliases": [
      "worklog",
      "timesheet",
      "log hours",
      "effort"
    ],
    "searchText": "updateWorklogEntry | Category: time_leaves | Aliases: worklog timesheet log hours effort | Description: Modifies logged hours, description, or work type for a timesheet entry. | Parameters: projectId worklogId hours description workType"
  },
  {
    "name": "queryProjectResourceWorkloadMatrix",
    "varName": "queryProjectResourceWorkloadMatrixTool",
    "category": "resources",
    "description": "Returns workload matrix comparing team member capacity against planned hours with overallocation flags.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "queryProjectResourceWorkloadMatrix | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Returns workload matrix comparing team member capacity against planned hours with overallocation flags. | Parameters: projectId"
  },
  {
    "name": "reassignWorkload",
    "varName": "reassignWorkloadTool",
    "category": "resources",
    "description": "Reallocates work items or sub-tasks between resources.",
    "params": [
      "projectId",
      "sourceAssigneeId",
      "targetAssigneeId",
      "targetAssigneeName",
      "storyIds"
    ],
    "aliases": [
      "resource",
      "team member",
      "engineer",
      "allocation",
      "utilization",
      "workload",
      "rate",
      "user directory"
    ],
    "searchText": "reassignWorkload | Category: resources | Aliases: resource team member engineer allocation utilization workload rate user directory | Description: Reallocates work items or sub-tasks between resources. | Parameters: projectId sourceAssigneeId targetAssigneeId targetAssigneeName storyIds"
  },
  {
    "name": "queryProjectGanttTimeline",
    "varName": "queryProjectGanttTimelineTool",
    "category": "portfolio_project",
    "description": "Returns chronological Gantt timeline with sprint dates, release milestones, and story schedules.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "queryProjectGanttTimeline | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Returns chronological Gantt timeline with sprint dates, release milestones, and story schedules. | Parameters: projectId"
  },
  {
    "name": "updateGanttTaskDependency",
    "varName": "updateGanttTaskDependencyTool",
    "category": "governance_raid",
    "description": "Creates predecessor dependency link between tasks for Gantt charting.",
    "params": [
      "projectId",
      "storyId",
      "predecessorStoryId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "updateGanttTaskDependency | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Creates predecessor dependency link between tasks for Gantt charting. | Parameters: projectId storyId predecessorStoryId"
  },
  {
    "name": "updateRelease",
    "varName": "updateReleaseTool",
    "category": "releases_milestones",
    "description": "Modifies release schedule dates, milestone date, name, or status.",
    "params": [
      "projectId",
      "releaseId",
      "name",
      "startDate",
      "endDate",
      "milestoneDate",
      "status"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "updateRelease | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Modifies release schedule dates, milestone date, name, or status. | Parameters: projectId releaseId name startDate endDate milestoneDate status"
  },
  {
    "name": "deleteRelease",
    "varName": "deleteReleaseTool",
    "category": "releases_milestones",
    "description": "Deletes a release from project schedule.",
    "params": [
      "projectId",
      "releaseId"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "deleteRelease | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Deletes a release from project schedule. | Parameters: projectId releaseId"
  },
  {
    "name": "queryProjectReleases",
    "varName": "queryProjectReleasesTool",
    "category": "releases_milestones",
    "description": "Lists all project releases, stages, and milestones.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "queryProjectReleases | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Lists all project releases, stages, and milestones. | Parameters: projectId"
  },
  {
    "name": "assignStoriesToRelease",
    "varName": "assignStoriesToReleaseTool",
    "category": "releases_milestones",
    "description": "Associates user stories or defects with a specific project release.",
    "params": [
      "projectId",
      "releaseId",
      "storyIds"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "assignStoriesToRelease | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Associates user stories or defects with a specific project release. | Parameters: projectId releaseId storyIds"
  },
  {
    "name": "queryDevDashboardSummary",
    "varName": "queryDevDashboardSummaryTool",
    "category": "general",
    "description": "Retrieves agile sprint completion rate, velocity points, and open defect counts.",
    "params": [
      "projectId"
    ],
    "aliases": [],
    "searchText": "queryDevDashboardSummary | Category: general | Aliases:  | Description: Retrieves agile sprint completion rate, velocity points, and open defect counts. | Parameters: projectId"
  },
  {
    "name": "querySprintBurndownData",
    "varName": "querySprintBurndownDataTool",
    "category": "agile_sprints",
    "description": "Fetches ideal vs actual remaining effort points across active sprint days.",
    "params": [
      "projectId",
      "sprintId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "querySprintBurndownData | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Fetches ideal vs actual remaining effort points across active sprint days. | Parameters: projectId sprintId"
  },
  {
    "name": "queryVelocityMetrics",
    "varName": "queryVelocityMetricsTool",
    "category": "agile_sprints",
    "description": "Computes historical sprint velocity metrics and average velocity points.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "queryVelocityMetrics | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Computes historical sprint velocity metrics and average velocity points. | Parameters: projectId"
  },
  {
    "name": "reorderBacklogStories",
    "varName": "reorderBacklogStoriesTool",
    "category": "agile_sprints",
    "description": "Updates backlog priority ranking order of user stories.",
    "params": [
      "projectId",
      "orderedStoryIds"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "reorderBacklogStories | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Updates backlog priority ranking order of user stories. | Parameters: projectId orderedStoryIds"
  },
  {
    "name": "deleteEpic",
    "varName": "deleteEpicTool",
    "category": "agile_sprints",
    "description": "Deletes an Agile Epic and unlinks stories.",
    "params": [
      "projectId",
      "epicId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "deleteEpic | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Deletes an Agile Epic and unlinks stories. | Parameters: projectId epicId"
  },
  {
    "name": "queryBacklogStories",
    "varName": "queryBacklogStoriesTool",
    "category": "agile_sprints",
    "description": "Queries backlog stories filtered by epic, priority, or status.",
    "params": [
      "projectId",
      "epicId",
      "priority",
      "status"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "queryBacklogStories | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Queries backlog stories filtered by epic, priority, or status. | Parameters: projectId epicId priority status"
  },
  {
    "name": "deleteWorkItem",
    "varName": "deleteWorkItemTool",
    "category": "work_items",
    "description": "Soft-deletes a work item moving it to project trash.",
    "params": [
      "projectId",
      "storyIdOrDocId"
    ],
    "aliases": [
      "user story",
      "task",
      "bug",
      "defect",
      "feature change",
      "sub task",
      "kanban item"
    ],
    "searchText": "deleteWorkItem | Category: work_items | Aliases: user story task bug defect feature change sub task kanban item | Description: Soft-deletes a work item moving it to project trash. | Parameters: projectId storyIdOrDocId"
  },
  {
    "name": "bulkEstimateStories",
    "varName": "bulkEstimateStoriesTool",
    "category": "general",
    "description": "Applies estimated hours to multiple backlog items in batch.",
    "params": [
      "projectId",
      "estimates",
      "storyId",
      "estimatedHours"
    ],
    "aliases": [],
    "searchText": "bulkEstimateStories | Category: general | Aliases:  | Description: Applies estimated hours to multiple backlog items in batch. | Parameters: projectId estimates storyId estimatedHours"
  },
  {
    "name": "queryUngroomedStories",
    "varName": "queryUngroomedStoriesTool",
    "category": "general",
    "description": "Filters backlog items lacking estimation hours or acceptance criteria.",
    "params": [
      "projectId"
    ],
    "aliases": [],
    "searchText": "queryUngroomedStories | Category: general | Aliases:  | Description: Filters backlog items lacking estimation hours or acceptance criteria. | Parameters: projectId"
  },
  {
    "name": "tagStoryAcceptanceCriteria",
    "varName": "tagStoryAcceptanceCriteriaTool",
    "category": "work_items",
    "description": "Adds structured Gherkin (Given/When/Then) acceptance criteria to a user story.",
    "params": [
      "projectId",
      "storyId",
      "acceptanceCriteria"
    ],
    "aliases": [
      "user story",
      "task",
      "bug",
      "defect",
      "feature change",
      "sub task",
      "kanban item"
    ],
    "searchText": "tagStoryAcceptanceCriteria | Category: work_items | Aliases: user story task bug defect feature change sub task kanban item | Description: Adds structured Gherkin (Given/When/Then) acceptance criteria to a user story. | Parameters: projectId storyId acceptanceCriteria"
  },
  {
    "name": "queryKanbanBoardState",
    "varName": "queryKanbanBoardStateTool",
    "category": "agile_sprints",
    "description": "Retrieves all active work items grouped into Kanban status columns.",
    "params": [
      "projectId",
      "sprintId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "queryKanbanBoardState | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Retrieves all active work items grouped into Kanban status columns. | Parameters: projectId sprintId"
  },
  {
    "name": "updateKanbanWipLimits",
    "varName": "updateKanbanWipLimitsTool",
    "category": "agile_sprints",
    "description": "Sets WIP limits on a Kanban status column.",
    "params": [
      "projectId",
      "columnName",
      "wipLimit"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "updateKanbanWipLimits | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Sets WIP limits on a Kanban status column. | Parameters: projectId columnName wipLimit"
  },
  {
    "name": "querySubTasksByStory",
    "varName": "querySubTasksByStoryTool",
    "category": "work_items",
    "description": "Retrieves all sub-tasks linked under a parent user story.",
    "params": [
      "projectId",
      "parentStoryId"
    ],
    "aliases": [
      "user story",
      "task",
      "bug",
      "defect",
      "feature change",
      "sub task",
      "kanban item"
    ],
    "searchText": "querySubTasksByStory | Category: work_items | Aliases: user story task bug defect feature change sub task kanban item | Description: Retrieves all sub-tasks linked under a parent user story. | Parameters: projectId parentStoryId"
  },
  {
    "name": "deleteSubTask",
    "varName": "deleteSubTaskTool",
    "category": "work_items",
    "description": "Deletes a sub-task from parent story.",
    "params": [
      "projectId",
      "subTaskId"
    ],
    "aliases": [
      "user story",
      "task",
      "bug",
      "defect",
      "feature change",
      "sub task",
      "kanban item"
    ],
    "searchText": "deleteSubTask | Category: work_items | Aliases: user story task bug defect feature change sub task kanban item | Description: Deletes a sub-task from parent story. | Parameters: projectId subTaskId"
  },
  {
    "name": "bulkCreateSubTasks",
    "varName": "bulkCreateSubTasksTool",
    "category": "work_items",
    "description": "Generates standard sub-tasks (Frontend, Backend, Unit Tests, Code Review) for a story in batch.",
    "params": [
      "projectId",
      "parentStoryId",
      "subTasks",
      "title",
      "estimatedHours",
      "assigneeId"
    ],
    "aliases": [
      "user story",
      "task",
      "bug",
      "defect",
      "feature change",
      "sub task",
      "kanban item"
    ],
    "searchText": "bulkCreateSubTasks | Category: work_items | Aliases: user story task bug defect feature change sub task kanban item | Description: Generates standard sub-tasks (Frontend, Backend, Unit Tests, Code Review) for a story in batch. | Parameters: projectId parentStoryId subTasks title estimatedHours assigneeId"
  },
  {
    "name": "queryProjectDefects",
    "varName": "queryProjectDefectsTool",
    "category": "qa_testing",
    "description": "Lists project bugs filtered by severity, status, or sprint.",
    "params": [
      "projectId",
      "severity",
      "status",
      "sprintId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryProjectDefects | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Lists project bugs filtered by severity, status, or sprint. | Parameters: projectId severity status sprintId"
  },
  {
    "name": "linkDefectToStory",
    "varName": "linkDefectToStoryTool",
    "category": "qa_testing",
    "description": "Associates a defect/bug with the parent story.",
    "params": [
      "projectId",
      "defectId",
      "storyId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "linkDefectToStory | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Associates a defect/bug with the parent story. | Parameters: projectId defectId storyId"
  },
  {
    "name": "closeDefect",
    "varName": "closeDefectTool",
    "category": "qa_testing",
    "description": "Marks defect as verified and closed with resolution summary.",
    "params": [
      "projectId",
      "defectId",
      "resolutionSummary"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "closeDefect | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Marks defect as verified and closed with resolution summary. | Parameters: projectId defectId resolutionSummary"
  },
  {
    "name": "queryTestDashboardSummary",
    "varName": "queryTestDashboardSummaryTool",
    "category": "general",
    "description": "Retrieves total test cases, execution pass/fail rates, and cycle completion status.",
    "params": [
      "projectId"
    ],
    "aliases": [],
    "searchText": "queryTestDashboardSummary | Category: general | Aliases:  | Description: Retrieves total test cases, execution pass/fail rates, and cycle completion status. | Parameters: projectId"
  },
  {
    "name": "queryTestExecutionProgress",
    "varName": "queryTestExecutionProgressTool",
    "category": "qa_testing",
    "description": "Returns test execution burn-up metrics across active cycles.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryTestExecutionProgress | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Returns test execution burn-up metrics across active cycles. | Parameters: projectId"
  },
  {
    "name": "queryDefectDensity",
    "varName": "queryDefectDensityTool",
    "category": "qa_testing",
    "description": "Computes defect density per story and QA leakage rate.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryDefectDensity | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Computes defect density per story and QA leakage rate. | Parameters: projectId"
  },
  {
    "name": "updateTestCase",
    "varName": "updateTestCaseTool",
    "category": "qa_testing",
    "description": "Updates test case title, step description, expected outcome, or type.",
    "params": [
      "projectId",
      "testCaseId",
      "title",
      "description",
      "expectedResult",
      "type"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "updateTestCase | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Updates test case title, step description, expected outcome, or type. | Parameters: projectId testCaseId title description expectedResult type"
  },
  {
    "name": "deleteTestCase",
    "varName": "deleteTestCaseTool",
    "category": "qa_testing",
    "description": "Soft-deletes test case from QA backlog.",
    "params": [
      "projectId",
      "testCaseId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "deleteTestCase | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Soft-deletes test case from QA backlog. | Parameters: projectId testCaseId"
  },
  {
    "name": "queryTestCases",
    "varName": "queryTestCasesTool",
    "category": "qa_testing",
    "description": "Queries QA test cases in project filtered by story ID or test type.",
    "params": [
      "projectId",
      "storyId",
      "type"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryTestCases | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Queries QA test cases in project filtered by story ID or test type. | Parameters: projectId storyId type"
  },
  {
    "name": "bulkImportTestCases",
    "varName": "bulkImportTestCasesTool",
    "category": "qa_testing",
    "description": "Imports test cases from structured JSON datasets in batch.",
    "params": [
      "projectId",
      "testCases",
      "title",
      "description",
      "expectedResult",
      "type",
      "storyId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "bulkImportTestCases | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Imports test cases from structured JSON datasets in batch. | Parameters: projectId testCases title description expectedResult type storyId"
  },
  {
    "name": "updateTestPlan",
    "varName": "updateTestPlanTool",
    "category": "qa_testing",
    "description": "Modifies test cycle dates, environment, or target release.",
    "params": [
      "projectId",
      "planId",
      "name",
      "startDate",
      "endDate",
      "environmentId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "updateTestPlan | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Modifies test cycle dates, environment, or target release. | Parameters: projectId planId name startDate endDate environmentId"
  },
  {
    "name": "deleteTestPlan",
    "varName": "deleteTestPlanTool",
    "category": "qa_testing",
    "description": "Deletes test cycle and its execution records.",
    "params": [
      "projectId",
      "planId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "deleteTestPlan | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Deletes test cycle and its execution records. | Parameters: projectId planId"
  },
  {
    "name": "queryTestPlans",
    "varName": "queryTestPlansTool",
    "category": "qa_testing",
    "description": "Lists all test plans and cycles created in project.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryTestPlans | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Lists all test plans and cycles created in project. | Parameters: projectId"
  },
  {
    "name": "removeTestCaseFromPlan",
    "varName": "removeTestCaseFromPlanTool",
    "category": "qa_testing",
    "description": "Removes test case from specific test plan.",
    "params": [
      "projectId",
      "planId",
      "testCaseId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "removeTestCaseFromPlan | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Removes test case from specific test plan. | Parameters: projectId planId testCaseId"
  },
  {
    "name": "queryTestExecutionList",
    "varName": "queryTestExecutionListTool",
    "category": "qa_testing",
    "description": "Retrieves test cases assigned to a cycle with current execution status.",
    "params": [
      "projectId",
      "planId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryTestExecutionList | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Retrieves test cases assigned to a cycle with current execution status. | Parameters: projectId planId"
  },
  {
    "name": "bulkUpdateTestExecutionStatus",
    "varName": "bulkUpdateTestExecutionStatusTool",
    "category": "qa_testing",
    "description": "Batch marks multiple test cases as Passed, Failed, Blocked, or Skipped.",
    "params": [
      "projectId",
      "testCaseIds",
      "status"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "bulkUpdateTestExecutionStatus | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Batch marks multiple test cases as Passed, Failed, Blocked, or Skipped. | Parameters: projectId testCaseIds status"
  },
  {
    "name": "logDefectFromTestExecution",
    "varName": "logDefectFromTestExecutionTool",
    "category": "qa_testing",
    "description": "Automatically creates a Bug linked directly to a failed test case execution.",
    "params": [
      "projectId",
      "testCaseId",
      "bugTitle",
      "severity",
      "description"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "logDefectFromTestExecution | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Automatically creates a Bug linked directly to a failed test case execution. | Parameters: projectId testCaseId bugTitle severity description"
  },
  {
    "name": "queryQaDefects",
    "varName": "queryQaDefectsTool",
    "category": "qa_testing",
    "description": "Queries defects logged during active test cycles filtered by environment.",
    "params": [
      "projectId",
      "environment"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "queryQaDefects | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Queries defects logged during active test cycles filtered by environment. | Parameters: projectId environment"
  },
  {
    "name": "exportDefectsReport",
    "varName": "exportDefectsReportTool",
    "category": "qa_testing",
    "description": "Exports testing defects summary to structured report format.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "qa",
      "testing",
      "test case",
      "test cycle",
      "test plan",
      "defect",
      "bug",
      "sit",
      "uat",
      "regression"
    ],
    "searchText": "exportDefectsReport | Category: qa_testing | Aliases: qa testing test case test cycle test plan defect bug sit uat regression | Description: Exports testing defects summary to structured report format. | Parameters: projectId"
  },
  {
    "name": "queryRaidDashboardSummary",
    "varName": "queryRaidDashboardSummaryTool",
    "category": "governance_raid",
    "description": "Executive breakdown of high-impact risks, open issues, unvalidated assumptions, and blocked dependencies.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "queryRaidDashboardSummary | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Executive breakdown of high-impact risks, open issues, unvalidated assumptions, and blocked dependencies. | Parameters: projectId"
  },
  {
    "name": "exportRaidLogCsv",
    "varName": "exportRaidLogCsvTool",
    "category": "governance_raid",
    "description": "Exports complete RAID register to CSV format.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "exportRaidLogCsv | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Exports complete RAID register to CSV format. | Parameters: projectId"
  },
  {
    "name": "queryProjectRisks",
    "varName": "queryProjectRisksTool",
    "category": "governance_raid",
    "description": "Returns project risks ranked by risk score (Severity x Probability).",
    "params": [
      "projectId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "queryProjectRisks | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Returns project risks ranked by risk score (Severity x Probability). | Parameters: projectId"
  },
  {
    "name": "deleteRisk",
    "varName": "deleteRiskTool",
    "category": "governance_raid",
    "description": "Deletes risk entry from RAID log.",
    "params": [
      "projectId",
      "riskId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "deleteRisk | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Deletes risk entry from RAID log. | Parameters: projectId riskId"
  },
  {
    "name": "closeRisk",
    "varName": "closeRiskTool",
    "category": "governance_raid",
    "description": "Marks risk as mitigated and closed.",
    "params": [
      "projectId",
      "riskId",
      "closureNotes"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "closeRisk | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Marks risk as mitigated and closed. | Parameters: projectId riskId closureNotes"
  },
  {
    "name": "queryProjectAssumptions",
    "varName": "queryProjectAssumptionsTool",
    "category": "governance_raid",
    "description": "Lists active and validated project assumptions.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "queryProjectAssumptions | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Lists active and validated project assumptions. | Parameters: projectId"
  },
  {
    "name": "deleteAssumption",
    "varName": "deleteAssumptionTool",
    "category": "governance_raid",
    "description": "Deletes assumption entry from RAID log.",
    "params": [
      "projectId",
      "assumptionId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "deleteAssumption | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Deletes assumption entry from RAID log. | Parameters: projectId assumptionId"
  },
  {
    "name": "validateAssumption",
    "varName": "validateAssumptionTool",
    "category": "governance_raid",
    "description": "Changes assumption status to Validated or Invalidated with validation notes.",
    "params": [
      "projectId",
      "assumptionId",
      "status",
      "validationNotes"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "validateAssumption | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Changes assumption status to Validated or Invalidated with validation notes. | Parameters: projectId assumptionId status validationNotes"
  },
  {
    "name": "queryProjectIssues",
    "varName": "queryProjectIssuesTool",
    "category": "governance_raid",
    "description": "Returns open project blockers filtered by priority.",
    "params": [
      "projectId",
      "priority"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "queryProjectIssues | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Returns open project blockers filtered by priority. | Parameters: projectId priority"
  },
  {
    "name": "deleteIssue",
    "varName": "deleteIssueTool",
    "category": "governance_raid",
    "description": "Deletes issue entry from RAID log.",
    "params": [
      "projectId",
      "issueId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "deleteIssue | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Deletes issue entry from RAID log. | Parameters: projectId issueId"
  },
  {
    "name": "resolveIssue",
    "varName": "resolveIssueTool",
    "category": "governance_raid",
    "description": "Marks blocker issue as resolved with resolution details.",
    "params": [
      "projectId",
      "issueId",
      "resolutionDetails"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "resolveIssue | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Marks blocker issue as resolved with resolution details. | Parameters: projectId issueId resolutionDetails"
  },
  {
    "name": "queryProjectDependencies",
    "varName": "queryProjectDependenciesTool",
    "category": "portfolio_project",
    "description": "Lists project dependencies categorized by incoming/outgoing and status.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "queryProjectDependencies | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Lists project dependencies categorized by incoming/outgoing and status. | Parameters: projectId"
  },
  {
    "name": "deleteDependency",
    "varName": "deleteDependencyTool",
    "category": "governance_raid",
    "description": "Deletes dependency entry from RAID log.",
    "params": [
      "projectId",
      "dependencyId"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "deleteDependency | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Deletes dependency entry from RAID log. | Parameters: projectId dependencyId"
  },
  {
    "name": "updateDependencyStatus",
    "varName": "updateDependencyStatusTool",
    "category": "governance_raid",
    "description": "Sets dependency status to On Track, At Risk, or Blocked.",
    "params": [
      "projectId",
      "dependencyId",
      "status"
    ],
    "aliases": [
      "raid",
      "governance",
      "risk",
      "assumption",
      "issue",
      "dependency",
      "blocker",
      "mitigation"
    ],
    "searchText": "updateDependencyStatus | Category: governance_raid | Aliases: raid governance risk assumption issue dependency blocker mitigation | Description: Sets dependency status to On Track, At Risk, or Blocked. | Parameters: projectId dependencyId status"
  },
  {
    "name": "overrideProjectHolidayCalendar",
    "varName": "overrideProjectHolidayCalendarTool",
    "category": "time_leaves",
    "description": "Toggles whether project inherits global holidays or custom project calendar.",
    "params": [
      "projectId",
      "isHolidayOverrideEnabled"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "overrideProjectHolidayCalendar | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Toggles whether project inherits global holidays or custom project calendar. | Parameters: projectId isHolidayOverrideEnabled"
  },
  {
    "name": "queryProjectSpecificHolidays",
    "varName": "queryProjectSpecificHolidaysTool",
    "category": "time_leaves",
    "description": "Retrieves custom project holidays when override is enabled.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "leave",
      "holiday",
      "pto",
      "vacation",
      "absence",
      "balance",
      "sick leave"
    ],
    "searchText": "queryProjectSpecificHolidays | Category: time_leaves | Aliases: leave holiday pto vacation absence balance sick leave | Description: Retrieves custom project holidays when override is enabled. | Parameters: projectId"
  },
  {
    "name": "queryTeamAbsenceCalendarBySprint",
    "varName": "queryTeamAbsenceCalendarBySprintTool",
    "category": "agile_sprints",
    "description": "Returns planned team absences overlapping with active sprint date ranges.",
    "params": [
      "projectId",
      "sprintId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "queryTeamAbsenceCalendarBySprint | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Returns planned team absences overlapping with active sprint date ranges. | Parameters: projectId sprintId"
  },
  {
    "name": "uploadPmoDocument",
    "varName": "uploadPmoDocumentTool",
    "category": "pmo_financials",
    "description": "Records project charter, architecture diagram, SOW, or signoff deliverables in project PMO documents.",
    "params": [
      "projectId",
      "name",
      "category",
      "fileUrl",
      "description"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "uploadPmoDocument | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Records project charter, architecture diagram, SOW, or signoff deliverables in project PMO documents. | Parameters: projectId name category fileUrl description"
  },
  {
    "name": "deletePmoDocument",
    "varName": "deletePmoDocumentTool",
    "category": "pmo_financials",
    "description": "Deletes document attachment from project PMO documents.",
    "params": [
      "projectId",
      "documentId"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "deletePmoDocument | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Deletes document attachment from project PMO documents. | Parameters: projectId documentId"
  },
  {
    "name": "queryPmoDocuments",
    "varName": "queryPmoDocumentsTool",
    "category": "pmo_financials",
    "description": "Lists uploaded project documents with categories and dates.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "queryPmoDocuments | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Lists uploaded project documents with categories and dates. | Parameters: projectId"
  },
  {
    "name": "addExternalDocLink",
    "varName": "addExternalDocLinkTool",
    "category": "general",
    "description": "Links external SharePoint, Google Drive, or Confluence URLs in PMO repository.",
    "params": [
      "projectId",
      "title",
      "url",
      "provider"
    ],
    "aliases": [],
    "searchText": "addExternalDocLink | Category: general | Aliases:  | Description: Links external SharePoint, Google Drive, or Confluence URLs in PMO repository. | Parameters: projectId title url provider"
  },
  {
    "name": "queryFbBillingSummary",
    "varName": "queryFbBillingSummaryTool",
    "category": "pmo_financials",
    "description": "Retrieves fixed bid contract value, billed amount, and billing schedule.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "queryFbBillingSummary | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Retrieves fixed bid contract value, billed amount, and billing schedule. | Parameters: projectId"
  },
  {
    "name": "updateFbContractValue",
    "varName": "updateFbContractValueTool",
    "category": "pmo_financials",
    "description": "Updates total contracted fixed bid revenue amount.",
    "params": [
      "projectId",
      "contractValue"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "updateFbContractValue | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Updates total contracted fixed bid revenue amount. | Parameters: projectId contractValue"
  },
  {
    "name": "logFbInvoice",
    "varName": "logFbInvoiceTool",
    "category": "pmo_financials",
    "description": "Records an invoice raised against fixed bid milestones.",
    "params": [
      "projectId",
      "milestoneId",
      "invoiceNumber",
      "invoiceAmount"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "logFbInvoice | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Records an invoice raised against fixed bid milestones. | Parameters: projectId milestoneId invoiceNumber invoiceAmount"
  },
  {
    "name": "updatePaymentMilestone",
    "varName": "updatePaymentMilestoneTool",
    "category": "releases_milestones",
    "description": "Modifies milestone name, billing percentage, dollar amount, or status.",
    "params": [
      "projectId",
      "milestoneId",
      "name",
      "billingPercentage",
      "amount",
      "status"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "updatePaymentMilestone | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Modifies milestone name, billing percentage, dollar amount, or status. | Parameters: projectId milestoneId name billingPercentage amount status"
  },
  {
    "name": "deletePaymentMilestone",
    "varName": "deletePaymentMilestoneTool",
    "category": "releases_milestones",
    "description": "Deletes payment milestone from commercial schedule.",
    "params": [
      "projectId",
      "milestoneId"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "deletePaymentMilestone | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Deletes payment milestone from commercial schedule. | Parameters: projectId milestoneId"
  },
  {
    "name": "queryPaymentMilestones",
    "varName": "queryPaymentMilestonesTool",
    "category": "releases_milestones",
    "description": "Returns payment milestones with billing status.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "queryPaymentMilestones | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Returns payment milestones with billing status. | Parameters: projectId"
  },
  {
    "name": "markMilestoneInvoiceRaised",
    "varName": "markMilestoneInvoiceRaisedTool",
    "category": "releases_milestones",
    "description": "Transitions milestone to Invoice Raised with invoice reference.",
    "params": [
      "projectId",
      "milestoneId",
      "invoiceNumber"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "markMilestoneInvoiceRaised | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Transitions milestone to Invoice Raised with invoice reference. | Parameters: projectId milestoneId invoiceNumber"
  },
  {
    "name": "queryTnmBillingSummary",
    "varName": "queryTnmBillingSummaryTool",
    "category": "pmo_financials",
    "description": "Monthly hours logged across all roles multiplied by daily billed rates.",
    "params": [
      "projectId",
      "month"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "queryTnmBillingSummary | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Monthly hours logged across all roles multiplied by daily billed rates. | Parameters: projectId month"
  },
  {
    "name": "generateMonthlyTnmInvoice",
    "varName": "generateMonthlyTnmInvoiceTool",
    "category": "pmo_financials",
    "description": "Calculates monthly billing invoice amount from approved timesheets.",
    "params": [
      "projectId",
      "month"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "generateMonthlyTnmInvoice | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Calculates monthly billing invoice amount from approved timesheets. | Parameters: projectId month"
  },
  {
    "name": "updateTnmMilestone",
    "varName": "updateTnmMilestoneTool",
    "category": "releases_milestones",
    "description": "Modifies T&M milestone target amount or status.",
    "params": [
      "projectId",
      "milestoneId",
      "name",
      "targetAmount",
      "status"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "updateTnmMilestone | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Modifies T&M milestone target amount or status. | Parameters: projectId milestoneId name targetAmount status"
  },
  {
    "name": "deleteTnmMilestone",
    "varName": "deleteTnmMilestoneTool",
    "category": "releases_milestones",
    "description": "Deletes T&M milestone.",
    "params": [
      "projectId",
      "milestoneId"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "deleteTnmMilestone | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Deletes T&M milestone. | Parameters: projectId milestoneId"
  },
  {
    "name": "queryTnmMilestones",
    "varName": "queryTnmMilestonesTool",
    "category": "releases_milestones",
    "description": "Retrieves all periodic T&M milestone checkpoints.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "release",
      "version",
      "milestone",
      "payment milestone",
      "delivery"
    ],
    "searchText": "queryTnmMilestones | Category: releases_milestones | Aliases: release version milestone payment milestone delivery | Description: Retrieves all periodic T&M milestone checkpoints. | Parameters: projectId"
  },
  {
    "name": "queryBcpPlan",
    "varName": "queryBcpPlanTool",
    "category": "pmo_financials",
    "description": "Retrieves project Business Continuity Plan (BCP), key role backups, and emergency procedures.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "queryBcpPlan | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Retrieves project Business Continuity Plan (BCP), key role backups, and emergency procedures. | Parameters: projectId"
  },
  {
    "name": "updateBcpPrimaryContacts",
    "varName": "updateBcpPrimaryContactsTool",
    "category": "pmo_financials",
    "description": "Configures primary and secondary successor backups for key project roles.",
    "params": [
      "projectId",
      "contacts",
      "role",
      "primaryPerson",
      "backupPerson",
      "contactPhone"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "updateBcpPrimaryContacts | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Configures primary and secondary successor backups for key project roles. | Parameters: projectId contacts role primaryPerson backupPerson contactPhone"
  },
  {
    "name": "logBcpDisasterRecoveryPlan",
    "varName": "logBcpDisasterRecoveryPlanTool",
    "category": "pmo_financials",
    "description": "Updates disaster recovery procedures, backup verification dates, and offsite contacts.",
    "params": [
      "projectId",
      "procedures",
      "backupVerificationDate",
      "offsiteLocation"
    ],
    "aliases": [
      "pmo",
      "financials",
      "billing",
      "invoice",
      "fixed billing",
      "time and materials",
      "tnm",
      "bcp",
      "disaster recovery"
    ],
    "searchText": "logBcpDisasterRecoveryPlan | Category: pmo_financials | Aliases: pmo financials billing invoice fixed billing time and materials tnm bcp disaster recovery | Description: Updates disaster recovery procedures, backup verification dates, and offsite contacts. | Parameters: projectId procedures backupVerificationDate offsiteLocation"
  },
  {
    "name": "addKanbanColumn",
    "varName": "addKanbanColumnTool",
    "category": "agile_sprints",
    "description": "Adds custom workflow column (e.g. Code Review, Blocked) to Kanban board.",
    "params": [
      "projectId",
      "columnName",
      "wipLimit",
      "order"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "addKanbanColumn | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Adds custom workflow column (e.g. Code Review, Blocked) to Kanban board. | Parameters: projectId columnName wipLimit order"
  },
  {
    "name": "deleteKanbanColumn",
    "varName": "deleteKanbanColumnTool",
    "category": "agile_sprints",
    "description": "Deletes custom Kanban column from board.",
    "params": [
      "projectId",
      "columnId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "deleteKanbanColumn | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Deletes custom Kanban column from board. | Parameters: projectId columnId"
  },
  {
    "name": "updateKanbanColumnsOrder",
    "varName": "updateKanbanColumnsOrderTool",
    "category": "agile_sprints",
    "description": "Reorders sequence of Kanban workflow columns.",
    "params": [
      "projectId",
      "columnOrder"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "updateKanbanColumnsOrder | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Reorders sequence of Kanban workflow columns. | Parameters: projectId columnOrder"
  },
  {
    "name": "queryBoardSettings",
    "varName": "queryBoardSettingsTool",
    "category": "settings_environments",
    "description": "Retrieves all configured Kanban columns and workflow properties.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "environment",
      "settings",
      "gantt",
      "git repository",
      "columns"
    ],
    "searchText": "queryBoardSettings | Category: settings_environments | Aliases: environment settings gantt git repository columns | Description: Retrieves all configured Kanban columns and workflow properties. | Parameters: projectId"
  },
  {
    "name": "updateSprintDurationSettings",
    "varName": "updateSprintDurationSettingsTool",
    "category": "agile_sprints",
    "description": "Configures default sprint duration in weeks (1, 2, 3, or 4 weeks).",
    "params": [
      "projectId",
      "durationWeeks"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "updateSprintDurationSettings | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Configures default sprint duration in weeks (1, 2, 3, or 4 weeks). | Parameters: projectId durationWeeks"
  },
  {
    "name": "setSprintStartDay",
    "varName": "setSprintStartDayTool",
    "category": "agile_sprints",
    "description": "Configures default sprint start day of week (Monday, Tuesday, etc.).",
    "params": [
      "projectId",
      "startDay"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "setSprintStartDay | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Configures default sprint start day of week (Monday, Tuesday, etc.). | Parameters: projectId startDay"
  },
  {
    "name": "querySprintSettings",
    "varName": "querySprintSettingsTool",
    "category": "agile_sprints",
    "description": "Retrieves configured default sprint duration and start day.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "agile",
      "scrum",
      "sprint",
      "epic",
      "backlog",
      "burndown",
      "velocity",
      "kanban",
      "wip limit"
    ],
    "searchText": "querySprintSettings | Category: agile_sprints | Aliases: agile scrum sprint epic backlog burndown velocity kanban wip limit | Description: Retrieves configured default sprint duration and start day. | Parameters: projectId"
  },
  {
    "name": "updateEffortConversionSettings",
    "varName": "updateEffortConversionSettingsTool",
    "category": "settings_environments",
    "description": "Updates project conversion units: manMonthToDays, manDayToHours, storyPointToHours.",
    "params": [
      "projectId",
      "manMonthToDays",
      "manDayToHours",
      "storyPointToHours"
    ],
    "aliases": [
      "environment",
      "settings",
      "gantt",
      "git repository",
      "columns"
    ],
    "searchText": "updateEffortConversionSettings | Category: settings_environments | Aliases: environment settings gantt git repository columns | Description: Updates project conversion units: manMonthToDays, manDayToHours, storyPointToHours. | Parameters: projectId manMonthToDays manDayToHours storyPointToHours"
  },
  {
    "name": "queryEffortSettings",
    "varName": "queryEffortSettingsTool",
    "category": "settings_environments",
    "description": "Retrieves configured effort conversion ratios.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "environment",
      "settings",
      "gantt",
      "git repository",
      "columns"
    ],
    "searchText": "queryEffortSettings | Category: settings_environments | Aliases: environment settings gantt git repository columns | Description: Retrieves configured effort conversion ratios. | Parameters: projectId"
  },
  {
    "name": "queryProjectTrashItems",
    "varName": "queryProjectTrashItemsTool",
    "category": "portfolio_project",
    "description": "Lists deleted work items, test cases, and sprints in project trash.",
    "params": [
      "projectId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "queryProjectTrashItems | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Lists deleted work items, test cases, and sprints in project trash. | Parameters: projectId"
  },
  {
    "name": "restoreProjectTrashItem",
    "varName": "restoreProjectTrashItemTool",
    "category": "portfolio_project",
    "description": "Restores soft-deleted work item, test case, or epic back to active project.",
    "params": [
      "projectId",
      "itemType",
      "itemId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "restoreProjectTrashItem | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Restores soft-deleted work item, test case, or epic back to active project. | Parameters: projectId itemType itemId"
  },
  {
    "name": "permanentlyDeleteProjectItem",
    "varName": "permanentlyDeleteProjectItemTool",
    "category": "portfolio_project",
    "description": "Permanently purges an item from project database.",
    "params": [
      "projectId",
      "itemType",
      "itemId"
    ],
    "aliases": [
      "portfolio",
      "project",
      "container",
      "archive",
      "duplicate"
    ],
    "searchText": "permanentlyDeleteProjectItem | Category: portfolio_project | Aliases: portfolio project container archive duplicate | Description: Permanently purges an item from project database. | Parameters: projectId itemType itemId"
  }
];

export const TOOL_CATALOG_MAP = new Map<string, ToolMetadata>(
  TOOL_CATALOG.map((t) => [t.name, t])
);
