import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  flowpilotCreateWorkItem,
  flowpilotUpdateWorkItem,
  flowpilotCreateProject,
  flowpilotCreateEpic,
  flowpilotCreateSprint,
  flowpilotCreateTestCase,
  flowpilotCreateRaidItem,
  flowpilotQueryProjectContext,
  flowpilotListProjects,
  flowpilotCreatePortfolio,
  flowpilotListPortfolios,
} from '@/lib/flowpilot-db-server';

// 1. Tool: Create Work Item (Story, Bug, Task, Feature Change, Sub Task)
export const createWorkItemTool = ai.defineTool(
  {
    name: 'createWorkItem',
    description:
      'Creates a new work item (User Story, Bug, Task, Feature Change, or Sub Task) in a project. Automatically assigns the next sequential ID (e.g. BUG-1, ST-5) and stores it in the database.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID in which to create the work item.'),
      itemType: z
        .enum(['Requirement/Story', 'Bug', 'Task', 'Feature Change', 'Sub Task'])
        .default('Requirement/Story')
        .describe('The type of work item: "Bug", "Requirement/Story", "Task", "Feature Change", or "Sub Task".'),
      title: z.string().describe('Clear, concise title or headline of the work item.'),
      description: z.string().optional().describe('Detailed description, steps to reproduce, or requirements.'),
      priority: z
        .enum(['Critical', 'High', 'Medium', 'Low', 'Backburner'])
        .default('Medium')
        .describe('Priority level of the work item.'),
      severity: z
        .enum(['Critical', 'High', 'Medium', 'Low'])
        .optional()
        .describe('Severity level (especially for Bugs).'),
      status: z
        .string()
        .default('To Do')
        .describe('Current status, typically "To Do", "In Progress", "In QA", or "Done".'),
      estimatedHours: z.number().optional().describe('Estimated effort in hours (e.g. 4, 8, 16).'),
      acceptanceCriteria: z.string().optional().describe('Acceptance criteria for user stories.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      storyId: z.string().optional(),
      itemType: z.string(),
      title: z.string(),
      priority: z.string().optional(),
      status: z.string(),
      severity: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotCreateWorkItem(input);
    } catch (err: any) {
      return {
        success: true,
        itemType: input.itemType,
        title: input.title,
        status: input.status || 'To Do',
        priority: input.priority,
        severity: input.severity,
        projectId: input.projectId,
        url: input.itemType === 'Bug' ? `/projects/${input.projectId}/testing/defect-tracker` : `/projects/${input.projectId}/development/kanban`,
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 2. Tool: Update Work Item
export const updateWorkItemTool = ai.defineTool(
  {
    name: 'updateWorkItem',
    description:
      'Updates an existing work item (story, bug, task) status (e.g. move to "In Progress", "In QA", "Done"), priority, assignee, estimation, or description.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID containing the work item.'),
      storyIdOrDocId: z.string().describe('The work item identifier, e.g. "BUG-1", "ST-4", or the document ID.'),
      updates: z.object({
        status: z.string().optional().describe('New status (e.g. "To Do", "In Progress", "In QA", "Done").'),
        priority: z.enum(['Critical', 'High', 'Medium', 'Low', 'Backburner']).optional().describe('Updated priority.'),
        severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional().describe('Updated severity for bugs.'),
        estimatedHours: z.number().optional().describe('Updated estimated hours.'),
        title: z.string().optional().describe('Updated title.'),
        description: z.string().optional().describe('Updated description.'),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      storyId: z.string().optional(),
      itemType: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotUpdateWorkItem(input);
    } catch (err: any) {
      return {
        success: true,
        storyId: input.storyIdOrDocId,
        status: input.updates?.status,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/development/kanban`,
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 3. Tool: Create Portfolio
export const createPortfolioTool = ai.defineTool(
  {
    name: 'createPortfolio',
    description: 'Creates a new Portfolio in the workspace to group and organize projects.',
    inputSchema: z.object({
      name: z.string().describe('Name of the portfolio (e.g. "Fintech Solutions", "FlowPilot", "Mobile Apps").'),
      description: z.string().optional().describe('Description of what this portfolio encompasses.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string(),
      description: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotCreatePortfolio(input);
    } catch (err: any) {
      return {
        success: true,
        name: input.name,
        description: input.description,
        url: '/project-home',
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 4. Tool: List All Portfolios
export const listPortfoliosTool = ai.defineTool(
  {
    name: 'listPortfolios',
    description: 'Lists all portfolios available in the workspace.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      portfoliosJson: z.string().describe('JSON stringified array of portfolios.'),
    }),
  },
  async () => {
    try {
      const portfolios = await flowpilotListPortfolios();
      return { portfoliosJson: JSON.stringify(portfolios) };
    } catch (err: any) {
      return { portfoliosJson: JSON.stringify([]) };
    }
  }
);

// 5. Tool: Create Project
export const createProjectTool = ai.defineTool(
  {
    name: 'createProject',
    description:
      'Creates a new project in ProjectFlow workspace under a portfolio, initializing default Kanban columns, settings, and environments. WARNING: DO NOT call this tool when the user is already working inside an active project and providing project specifications, platform summary, or domain details — use updateProjectSpecifications or updateProjectDetails instead.',
    inputSchema: z.object({
      name: z.string().describe('Name of the new project.'),
      portfolioId: z.string().optional().describe('Optional portfolio ID. If omitted, uses the default portfolio.'),
      pricingModel: z.enum(['Fixed Bid', 'T&M']).default('Fixed Bid').describe('Pricing model: "Fixed Bid" or "T&M".'),
      status: z
        .enum(['Initial Estimation', 'Not Started', 'Active', 'On Hold', 'Completed', 'Cancelled'])
        .default('Active')
        .describe('Initial project status.'),
      summary: z.string().optional().describe('Brief 1-2 sentence executive summary of the project.'),
      description: z.string().optional().describe('Detailed project description and scope.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string(),
      portfolioId: z.string().optional(),
      status: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotCreateProject(input);
    } catch (err: any) {
      return {
        success: true,
        name: input.name,
        status: input.status || 'Active',
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 6. Tool: Create Epic
export const createEpicTool = ai.defineTool(
  {
    name: 'createEpic',
    description: 'Creates a new Agile Epic in a project to group related user stories.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      title: z.string().describe('Title of the epic.'),
      description: z.string().optional().describe('Scope and goal of the epic.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      title: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotCreateEpic(input);
    } catch (err: any) {
      return {
        success: true,
        title: input.title,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/development/backlog`,
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 7. Tool: Create Sprint
export const createSprintTool = ai.defineTool(
  {
    name: 'createSprint',
    description: 'Creates a new development sprint in a project with start/end dates and status.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      title: z.string().describe('Sprint title, e.g. "Sprint 1", "Release 2 Sprint A".'),
      startDate: z.string().optional().describe('ISO date string or YYYY-MM-DD for sprint start.'),
      endDate: z.string().optional().describe('ISO date string or YYYY-MM-DD for sprint end.'),
      status: z
        .enum(['Yet to Start', 'Current', 'Completed', 'Cancelled'])
        .default('Yet to Start')
        .describe('Sprint status.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      title: z.string(),
      status: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotCreateSprint(input);
    } catch (err: any) {
      return {
        success: true,
        title: input.title,
        status: input.status || 'Yet to Start',
        projectId: input.projectId,
        url: `/projects/${input.projectId}/development/backlog`,
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 8. Tool: Create Test Case
export const createTestCaseTool = ai.defineTool(
  {
    name: 'createTestCase',
    description: 'Creates a QA test case in a project with expected results and optional linked story.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      title: z.string().describe('Title of the test case.'),
      description: z.string().optional().describe('Steps to execute the test.'),
      expectedResult: z.string().optional().describe('Expected outcome of the test.'),
      type: z.enum(['Functional', 'Non-functional']).default('Functional').describe('Type of test case.'),
      storyId: z.string().optional().describe('Optional linked user story ID.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      testCaseId: z.string().optional(),
      title: z.string(),
      type: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotCreateTestCase(input);
    } catch (err: any) {
      return {
        success: true,
        title: input.title,
        type: input.type || 'Functional',
        projectId: input.projectId,
        url: `/projects/${input.projectId}/testing/test-backlog`,
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 9. Tool: Create RAID Item (Risk, Assumption, Issue, Dependency)
export const createRaidItemTool = ai.defineTool(
  {
    name: 'createRaidItem',
    description: 'Logs a project governance RAID item: Risk, Assumption, Issue, or Dependency.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      raidType: z.enum(['risk', 'assumption', 'issue', 'dependency']).describe('Type of RAID entity to create.'),
      description: z.string().describe('Description of the risk, assumption, issue, or dependency.'),
      severity: z.number().min(1).max(3).optional().describe('Risk severity (1=Low, 2=Medium, 3=High).'),
      probability: z.number().min(1).max(3).optional().describe('Risk probability (1=Low, 2=Medium, 3=High).'),
      mitigationPlan: z.string().optional().describe('Mitigation plan for risk.'),
      category: z.enum(['Technical', 'Resource', 'Business', 'External']).optional().describe('Category for assumption.'),
      priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().describe('Priority for issue.'),
      dependencyType: z.enum(['Internal', 'External']).optional().describe('Type of dependency.'),
      dependencyOn: z.string().optional().describe('Team, vendor, or module being depended on.'),
      expectedByDate: z.string().optional().describe('Expected completion date of dependency (YYYY-MM-DD).'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      itemId: z.string().optional(),
      raidType: z.string(),
      description: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      return await flowpilotCreateRaidItem(input as any);
    } catch (err: any) {
      return {
        success: true,
        raidType: input.raidType,
        description: input.description,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/raid-dashboard`,
        needsClientExecution: true,
        params: input,
      };
    }
  }
);

// 10. Tool: Query Project Data & Summaries
export const queryProjectDataContextTool = ai.defineTool(
  {
    name: 'queryProjectData',
    description:
      'Queries live project state (stories, bugs, sprints, epics, test cases, risks, issues) or lists all projects so FlowPilot can answer queries accurately.',
    inputSchema: z.object({
      projectId: z.string().optional().describe('The project ID to query. If omitted, returns global portfolio overview.'),
    }),
    outputSchema: z.object({
      dataJson: z.string().describe('JSON stringified project context data.'),
    }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectContext(input.projectId);
      return { dataJson: JSON.stringify(data) };
    } catch (err: any) {
      return { dataJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// 11. Tool: List All Projects
export const listProjectsTool = ai.defineTool(
  {
    name: 'listProjects',
    description: 'Lists all active projects in the workspace.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      projectsJson: z.string().describe('JSON stringified array of active projects.'),
    }),
  },
  async () => {
    try {
      const projects = await flowpilotListProjects();
      return { projectsJson: JSON.stringify(projects) };
    } catch (err: any) {
      return { projectsJson: JSON.stringify([]) };
    }
  }
);

// 12. Tool: Update Project Details & Summary
export const updateProjectDetailsTool = ai.defineTool(
  {
    name: 'updateProjectDetails',
    description: 'Updates project executive summary, description, name, pricing model, or status on the project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      summary: z.string().optional().describe('Project executive summary text.'),
      description: z.string().optional().describe('Detailed project description.'),
      name: z.string().optional().describe('Updated project name.'),
      pricingModel: z.enum(['Fixed Bid', 'T&M']).optional().describe('Pricing model.'),
      status: z.string().optional().describe('Project status.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      summary: z.string().optional(),
      description: z.string().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      projectId: input.projectId,
      summary: input.summary,
      description: input.description,
      name: input.name,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 13. Tool: Add Impacted System
export const addImpactedSystemTool = ai.defineTool(
  {
    name: 'addImpactedSystem',
    description: 'Adds an Impacted System to the project specifications with estimated effort in man-days and daily billing rate.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the impacted system or module (e.g. "Payment Gateway", "Logistics API").'),
      description: z.string().optional().describe('Description of the impact or integration.'),
      category: z.enum(['Technology', 'Function']).default('Technology').describe('Category: Technology or Function.'),
      estimate: z.number().optional().describe('Estimated development effort in man-days.'),
      dailyBillingRate: z.number().optional().describe('Daily billing rate in USD.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      name: z.string(),
      category: z.string().optional(),
      estimate: z.number().optional(),
      dailyBillingRate: z.number().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      category: input.category,
      estimate: input.estimate,
      dailyBillingRate: input.dailyBillingRate,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 14. Tool: Add Horizontal
export const addHorizontalTool = ai.defineTool(
  {
    name: 'addHorizontal',
    description: 'Adds a Horizontal to the project specifications with weightage percentage and daily billing rate.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the horizontal (e.g. "QA & Testing", "Architecture & Design", "Compliance & Legal").'),
      weightage: z.number().optional().describe('Weightage percentage (e.g. 10, 15, 20).'),
      dailyBillingRate: z.number().optional().describe('Daily billing rate in USD.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      name: z.string(),
      weightage: z.number().optional(),
      dailyBillingRate: z.number().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      weightage: input.weightage,
      dailyBillingRate: input.dailyBillingRate,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 15. Tool: Bulk Update Specifications
export const updateProjectSpecificationsTool = ai.defineTool(
  {
    name: 'updateProjectSpecifications',
    description:
      'Updates the Project Summary, Impacted Systems, and Horizontals on the project Specifications page in a single operation.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      summary: z.string().optional().describe('Project executive summary text.'),
      impactedSystems: z
        .array(
          z.object({
            name: z.string().describe('System or module name.'),
            description: z.string().optional().describe('Brief description of impact.'),
            category: z.enum(['Technology', 'Function']).default('Technology'),
            estimate: z.number().optional().describe('Effort in man-days.'),
            dailyBillingRate: z.number().optional().describe('Daily billing rate in USD.'),
          })
        )
        .optional()
        .describe('List of impacted systems to add.'),
      horizontals: z
        .array(
          z.object({
            name: z.string().describe('Horizontal name.'),
            weightage: z.number().optional().describe('Weightage percentage (e.g. 15 for 15%).'),
            dailyBillingRate: z.number().optional().describe('Daily billing rate in USD.'),
          })
        )
        .optional()
        .describe('List of horizontals to add.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      summary: z.string().optional(),
      systemsCount: z.number().optional(),
      horizontalsCount: z.number().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      projectId: input.projectId,
      summary: input.summary,
      systemsCount: input.impactedSystems?.length || 0,
      horizontalsCount: input.horizontals?.length || 0,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 16. Tool: Update Sprint
export const updateSprintTool = ai.defineTool(
  {
    name: 'updateSprint',
    description: 'Updates a sprint status (Yet to Start, Current, Completed, Cancelled), dates, or title.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sprintId: z.string().describe('The Sprint ID or title (e.g. "Sprint 1").'),
      status: z.enum(['Yet to Start', 'Current', 'Completed', 'Cancelled']).optional().describe('New sprint status.'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD).'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD).'),
      title: z.string().optional().describe('Updated sprint title.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      sprintId: z.string(),
      status: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      sprintId: input.sprintId,
      status: input.status,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/development/backlog`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 17. Tool: Assign Story to Sprint
export const assignStoryToSprintTool = ai.defineTool(
  {
    name: 'assignStoryToSprint',
    description: 'Assigns a user story, bug, or task to a sprint, or moves it to the backlog (null sprint).',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      storyId: z.string().describe('The Story ID or Bug ID (e.g. "ST-1", "BUG-2").'),
      sprintId: z.string().nullable().describe('The Sprint ID/doc ID to assign to, or null for Backlog.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      storyId: z.string(),
      sprintId: z.string().nullable(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      storyId: input.storyId,
      sprintId: input.sprintId,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/development/backlog`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 18. Tool: Create Test Plan / Cycle
export const createTestPlanTool = ai.defineTool(
  {
    name: 'createTestPlan',
    description: 'Creates a QA Test Plan / Test Cycle (e.g. Sprint Test Cycle or Release Test Cycle on Dev/SIT/UAT/Prod).',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the test plan (e.g. "Sprint 1 Regression", "SIT Cycle 1").'),
      planType: z.enum(['Sprint', 'Release']).describe('Type: Sprint or Release.'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD).'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD).'),
      environmentId: z.string().optional().describe('Target environment (Dev, SIT, UAT, Production).'),
      sprintId: z.string().optional().describe('Associated sprint ID.'),
      releaseId: z.string().optional().describe('Associated release ID.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      testPlanId: z.string().optional(),
      name: z.string(),
      planType: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      planType: input.planType,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/testing/test-cycle`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 19. Tool: Update RAID Item
export const updateRaidItemTool = ai.defineTool(
  {
    name: 'updateRaidItem',
    description: 'Updates a risk, assumption, issue, or dependency (e.g. close issue, update mitigation plan, change status).',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      raidType: z.enum(['risk', 'assumption', 'issue', 'dependency']).describe('Type of RAID entity.'),
      itemId: z.string().describe('ID of the item (e.g. "RSK-1", "ISS-2", "DEP-1", "ASM-1").'),
      status: z.string().optional().describe('New status (e.g. "Closed", "Resolved", "Validated", "Blocked").'),
      priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().describe('Priority for issue.'),
      mitigationPlan: z.string().optional().describe('Updated mitigation plan for risk.'),
      residualRisk: z.string().optional().describe('Residual risk note.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      itemId: z.string(),
      raidType: z.string(),
      status: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      itemId: input.itemId,
      raidType: input.raidType,
      status: input.status,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/raid-dashboard`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 20. Tool: Create Release or Milestone
export const createReleaseTool = ai.defineTool(
  {
    name: 'createRelease',
    description: 'Creates a project Release, Stage, or Milestone with target delivery dates.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the release (e.g. "v1.0 MVP Launch", "Phase 1 Beta").'),
      description: z.string().optional().describe('Scope and release notes.'),
      itemType: z.enum(['Release', 'Stage', 'Milestone']).describe('Type: Release, Stage, or Milestone.'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD).'),
      endDate: z.string().optional().describe('Target completion date (YYYY-MM-DD).'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      releaseId: z.string().optional(),
      name: z.string(),
      itemType: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      itemType: input.itemType,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/releases`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 21. Tool: Create Payment Milestone
export const createPaymentMilestoneTool = ai.defineTool(
  {
    name: 'createPaymentMilestone',
    description: 'Creates a contract billing payment milestone with percentage, dollar amount, and status.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Milestone name (e.g. "Sign-off & Initial Deposit", "UAT Completion Milestone").'),
      billingPercentage: z.number().describe('Billing percentage (e.g. 25 for 25%).'),
      amount: z.number().describe('Billing dollar amount (e.g. 50000).'),
      status: z.enum(['TBD', 'In Progress', 'Milestone completed', 'Invoice raised', 'Payment Completed']).default('TBD'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      milestoneId: z.string().optional(),
      name: z.string(),
      amount: z.number(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      amount: input.amount,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/pmo/fb-payment-milestones`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 22. Tool: Assign Project Resource
export const assignProjectResourceTool = ai.defineTool(
  {
    name: 'assignProjectResource',
    description: 'Assigns a team member / engineer to a project with role, onboarding dates, and billing rates.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      userId: z.string().optional().describe('User ID or email/employee name.'),
      name: z.string().optional().describe('Full name of the resource.'),
      role: z.enum(['Developer', 'Tester', 'Architect', 'BA', 'PM', 'Program Director']).describe('Project role.'),
      onboardingDate: z.string().optional().describe('Onboarding date (YYYY-MM-DD).'),
      offloadingDate: z.string().optional().describe('Offloading date (YYYY-MM-DD).'),
      billedRate: z.number().optional().describe('Daily billed rate in USD.'),
      costRate: z.number().optional().describe('Daily cost rate in USD.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      name: z.string(),
      role: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name || input.userId || 'Team Member',
      role: input.role,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/resources/project-resources`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 23. Tool: Log Timesheet Work
export const logWorkTool = ai.defineTool(
  {
    name: 'logWork',
    description: 'Logs hours worked on a project against a story or task for timesheets.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      employeeId: z.string().optional().describe('Employee ID or email. Defaults to logged-in user.'),
      itemId: z.string().describe('Story ID, Bug ID, Task ID, or "meeting".'),
      hours: z.number().describe('Number of hours worked (e.g. 4 or 7.5).'),
      date: z.string().optional().describe('Work date (YYYY-MM-DD). Defaults to today.'),
      description: z.string().optional().describe('Worklog notes or activity description.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      hours: z.number(),
      itemId: z.string(),
      date: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      hours: input.hours,
      itemId: input.itemId,
      date: input.date,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/resources/worklog`,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 24. Tool: Add Project Environment
export const addEnvironmentTool = ai.defineTool(
  {
    name: 'addEnvironment',
    description: 'Adds a project deployment environment (e.g. "Dev", "SIT", "UAT", "Staging", "Production").',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Environment name.'),
      order: z.number().optional().describe('Display order sequence.'),
      url: z.string().optional().describe('Environment URL endpoint.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      name: z.string(),
      projectId: z.string(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      projectId: input.projectId,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 25. Tool: Add Code Repository
export const addCodeRepositoryTool = ai.defineTool(
  {
    name: 'addCodeRepository',
    description: 'Links a GitHub/GitLab/Bitbucket repository to the project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Repository name or label (e.g. "Backend API", "Mobile App Repo").'),
      url: z.string().describe('Repository URL (e.g. "https://github.com/org/repo").'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      name: z.string(),
      url: z.string(),
      projectId: z.string(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      url: input.url,
      projectId: input.projectId,
      needsClientExecution: true,
      params: input,
    };
  }
);

// 26. Tool: Add Fixed Cost
export const addFixedCostTool = ai.defineTool(
  {
    name: 'addFixedCost',
    description: 'Adds a non-labor fixed cost (e.g. software licenses, cloud servers, travel expenses) to project financials.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Cost item name (e.g. "AWS Cloud Hosting", "Figma Enterprise License").'),
      cost: z.number().describe('Dollar cost amount.'),
      type: z.enum(['One time', 'Monthly']).default('One time').describe('Billing frequency.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      name: z.string(),
      cost: z.number(),
      type: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    return {
      success: true,
      name: input.name,
      cost: input.cost,
      type: input.type,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/pmo/fb-billing`,
      needsClientExecution: true,
      params: input,
    };
  }
);

export const allFlowPilotTools = [
  createPortfolioTool,
  listPortfoliosTool,
  createWorkItemTool,
  updateWorkItemTool,
  createProjectTool,
  updateProjectDetailsTool,
  addImpactedSystemTool,
  addHorizontalTool,
  updateProjectSpecificationsTool,
  createEpicTool,
  createSprintTool,
  updateSprintTool,
  assignStoryToSprintTool,
  createTestCaseTool,
  createTestPlanTool,
  createRaidItemTool,
  updateRaidItemTool,
  createReleaseTool,
  createPaymentMilestoneTool,
  assignProjectResourceTool,
  logWorkTool,
  addEnvironmentTool,
  addCodeRepositoryTool,
  addFixedCostTool,
  queryProjectDataContextTool,
  listProjectsTool,
];

// Backwards compatibility alias
export const allHermesTools = allFlowPilotTools;

