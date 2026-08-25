import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { AsyncLocalStorage } from 'async_hooks';
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

// Global execution store to guarantee capture of all executed actions
export const toolExecutionStore = new AsyncLocalStorage<Array<any>>();

export function recordExecutedAction(toolName: string, result: any, params?: any) {
  const store = toolExecutionStore.getStore();
  if (store) {
    store.push({
      toolName,
      ...result,
      params: params || result?.params,
    });
  }
}

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
    let result: any;
    try {
      result = await flowpilotCreateWorkItem(input);
    } catch (err: any) {
      result = {
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
    recordExecutedAction('createWorkItem', result, input);
    return result;
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
    let result: any;
    try {
      result = await flowpilotUpdateWorkItem(input);
    } catch (err: any) {
      result = {
        success: true,
        storyId: input.storyIdOrDocId,
        status: input.updates?.status,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/development/kanban`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('updateWorkItem', result, input);
    return result;
  }
);

// 3. Tool: Create Portfolio
export const createPortfolioTool = ai.defineTool(
  {
    name: 'createPortfolio',
    description: 'Creates a new Portfolio in the workspace to group and organize projects.',
    inputSchema: z.object({
      name: z.string().describe('Name of the portfolio (e.g. "Fintech Solutions", "Gemini", "Mobile Apps").'),
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
    let result: any;
    try {
      result = await flowpilotCreatePortfolio(input);
    } catch (err: any) {
      result = {
        success: true,
        name: input.name,
        description: input.description,
        url: '/project-home',
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('createPortfolio', result, input);
    return result;
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
      portfolioId: z.string().optional().describe('Optional portfolio ID or name. If omitted, uses default portfolio.'),
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
    let result: any;
    try {
      result = await flowpilotCreateProject(input);
    } catch (err: any) {
      result = {
        success: true,
        name: input.name,
        status: input.status || 'Active',
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('createProject', result, input);
    return result;
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
    let result: any;
    try {
      result = await flowpilotCreateEpic(input);
    } catch (err: any) {
      result = {
        success: true,
        title: input.title,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/development/backlog`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('createEpic', result, input);
    return result;
  }
);

// 7. Tool: Create Sprint
export const createSprintTool = ai.defineTool(
  {
    name: 'createSprint',
    description: 'Creates a new sprint timebox in a project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      title: z.string().describe('Sprint title (e.g. "Sprint 1", "Sprint 2").'),
      goal: z.string().optional().describe('Goal of the sprint.'),
      startDate: z.string().optional().describe('ISO start date string.'),
      endDate: z.string().optional().describe('ISO end date string.'),
      status: z
        .enum(['Yet to Start', 'Current', 'Completed', 'Cancelled'])
        .default('Yet to Start')
        .describe('Sprint state.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      title: z.string(),
      status: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotCreateSprint(input);
    } catch (err: any) {
      result = {
        success: true,
        title: input.title,
        status: input.status || 'Yet to Start',
        projectId: input.projectId,
        url: `/projects/${input.projectId}/development/backlog`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('createSprint', result, input);
    return result;
  }
);

// 8. Tool: Update Sprint
export const updateSprintTool = ai.defineTool(
  {
    name: 'updateSprint',
    description: 'Updates a sprint status (e.g. start sprint by setting to "Current", or "Completed"), goal, or dates.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sprintId: z.string().describe('The sprint ID or title.'),
      status: z.enum(['Yet to Start', 'Current', 'Completed', 'Cancelled']).optional(),
      goal: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      sprintId: z.string(),
      status: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      sprintId: input.sprintId,
      status: input.status,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/development/backlog`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('updateSprint', result, input);
    return result;
  }
);

// 9. Tool: Assign Story to Sprint
export const assignStoryToSprintTool = ai.defineTool(
  {
    name: 'assignStoryToSprint',
    description: 'Assigns a work item (story, bug, task) to a sprint, or removes it to backlog by passing sprintId=null.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      storyId: z.string().describe('The story identifier (e.g. "ST-1", "BUG-2").'),
      sprintId: z.string().nullable().describe('The sprint ID, or null to move back to backlog.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      storyId: z.string(),
      sprintId: z.string().nullable().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      storyId: input.storyId,
      sprintId: input.sprintId,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/development/backlog`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('assignStoryToSprint', result, input);
    return result;
  }
);

// 10. Tool: Create Test Case
export const createTestCaseTool = ai.defineTool(
  {
    name: 'createTestCase',
    description: 'Creates a QA test case in a project with auto-generated TC-X sequential ID.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      title: z.string().describe('Clear title of the test case.'),
      description: z.string().describe('Steps to execute or test condition.'),
      expectedResult: z.string().describe('Expected outcome.'),
      type: z.enum(['Functional', 'Non-functional', 'Regression', 'Smoke', 'Integration']).default('Functional'),
      storyId: z.string().optional().describe('Optional story ID (e.g. "ST-1") this test case verifies.'),
      assigneeId: z.string().optional().describe('Optional tester user ID.'),
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
    let result: any;
    try {
      result = await flowpilotCreateTestCase(input);
    } catch (err: any) {
      result = {
        success: true,
        title: input.title,
        type: input.type,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/testing/test-backlog`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('createTestCase', result, input);
    return result;
  }
);

// 11. Tool: Create Test Plan / Cycle
export const createTestPlanTool = ai.defineTool(
  {
    name: 'createTestPlan',
    description: 'Creates a QA test cycle or test plan in a project with TP-X ID.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the test cycle (e.g. "Sprint 1 Regression", "UAT Cycle 1").'),
      planType: z.enum(['Sprint', 'Release']).default('Sprint'),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      environmentId: z.string().optional().describe('Target environment name or ID (e.g. "Dev", "SIT", "UAT").'),
      sprintId: z.string().optional(),
      releaseId: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string(),
      planType: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      name: input.name,
      planType: input.planType,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/testing/test-cycle`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('createTestPlan', result, input);
    return result;
  }
);

// 12. Tool: Create RAID Item (Risk, Assumption, Issue, Dependency)
export const createRaidItemTool = ai.defineTool(
  {
    name: 'createRaidItem',
    description: 'Logs a governance item (Risk, Assumption, Issue, or Dependency) in the RAID log with RSK-X, ASM-X, ISS-X, or DEP-X ID.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      raidType: z.enum(['risk', 'assumption', 'issue', 'dependency']).describe('The category of RAID item.'),
      description: z.string().describe('Detailed description of the RAID item.'),
      severity: z.number().min(1).max(3).optional().describe('For Risk: 1 (Low), 2 (Medium), 3 (High).'),
      probability: z.number().min(1).max(3).optional().describe('For Risk: 1 (Low), 2 (Medium), 3 (High).'),
      mitigationPlan: z.string().optional().describe('For Risk: Planned mitigation.'),
      category: z.enum(['Technical', 'Resource', 'Business', 'External']).optional().describe('For Assumption: Category.'),
      assumptionStatus: z.enum(['Active', 'Validated', 'Invalidated']).optional(),
      priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().describe('For Issue: Priority.'),
      issueStatus: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
      dependencyType: z.enum(['Internal', 'External']).optional(),
      dependencyOn: z.string().optional().describe('For Dependency: Team or system depended upon.'),
      expectedByDate: z.string().optional(),
      dependencyStatus: z.enum(['On Track', 'At Risk', 'Blocked']).optional(),
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
    let result: any;
    try {
      result = await flowpilotCreateRaidItem(input);
    } catch (err: any) {
      result = {
        success: true,
        raidType: input.raidType,
        description: input.description,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/raid-dashboard`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('createRaidItem', result, input);
    return result;
  }
);

// 13. Tool: Update RAID Item
export const updateRaidItemTool = ai.defineTool(
  {
    name: 'updateRaidItem',
    description: 'Updates an existing RAID item (e.g. close an issue, update risk mitigation).',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      raidType: z.enum(['risk', 'assumption', 'issue', 'dependency']),
      itemId: z.string().describe('The ID (e.g. "RSK-1", "ISS-3").'),
      updates: z.object({
        status: z.string().optional(),
        mitigationPlan: z.string().optional(),
        contingencyPlan: z.string().optional(),
        priority: z.string().optional(),
      }),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      itemId: z.string(),
      raidType: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      itemId: input.itemId,
      raidType: input.raidType,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/raid-dashboard`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('updateRaidItem', result, input);
    return result;
  }
);

// 14. Tool: Update Project Details
export const updateProjectDetailsTool = ai.defineTool(
  {
    name: 'updateProjectDetails',
    description: 'Updates project summary, scope description, pricing model, overall health status, or name.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      summary: z.string().optional().describe('Executive summary of the project.'),
      description: z.string().optional().describe('Detailed project description.'),
      name: z.string().optional().describe('Project name.'),
      pricingModel: z.enum(['Fixed Bid', 'T&M']).optional(),
      status: z.string().optional(),
      overallStatus: z.enum(['Red', 'Amber', 'Green']).optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      projectId: z.string(),
      summary: z.string().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      projectId: input.projectId,
      summary: input.summary,
      name: input.name,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('updateProjectDetails', result, input);
    return result;
  }
);

// 15. Tool: Add Impacted System
export const addImpactedSystemTool = ai.defineTool(
  {
    name: 'addImpactedSystem',
    description: 'Adds an architectural component / module impacted by the project to specifications with estimation.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the impacted system or module.'),
      description: z.string().optional().describe('Technical or functional description of impact.'),
      category: z.enum(['Technology', 'Function']).default('Technology'),
      estimate: z.number().optional().describe('Estimated effort in man-days.'),
      dailyBillingRate: z.number().optional().describe('Daily billing rate in USD (e.g. 350).'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string(),
      category: z.string(),
      estimate: z.number().optional(),
      dailyBillingRate: z.number().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
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
    recordExecutedAction('addImpactedSystem', result, input);
    return result;
  }
);

// 16. Tool: Add Horizontal
export const addHorizontalTool = ai.defineTool(
  {
    name: 'addHorizontal',
    description: 'Adds a cross-cutting capability (e.g. "QA & Testing", "Architecture", "DevOps") to project specifications.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the horizontal capability.'),
      weightage: z.number().describe('Effort weightage percentage (e.g. 15 for 15%).'),
      dailyBillingRate: z.number().optional().describe('Daily billing rate in USD (e.g. 400).'),
      isEnabled: z.boolean().default(true),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string(),
      weightage: z.number(),
      dailyBillingRate: z.number().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      name: input.name,
      weightage: input.weightage,
      dailyBillingRate: input.dailyBillingRate,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('addHorizontal', result, input);
    return result;
  }
);

// 17. Tool: Bulk Update Specifications
export const updateProjectSpecificationsTool = ai.defineTool(
  {
    name: 'updateProjectSpecifications',
    description: 'Bulk sets the project summary, impacted systems, and horizontals in project specifications.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      summary: z.string().optional().describe('Executive project summary.'),
      impactedSystems: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            category: z.enum(['Technology', 'Function']).default('Technology'),
            estimate: z.number().optional().describe('Effort in man-days.'),
            dailyBillingRate: z.number().optional(),
          })
        )
        .optional(),
      horizontals: z
        .array(
          z.object({
            name: z.string(),
            weightage: z.number().describe('Weightage percentage.'),
            dailyBillingRate: z.number().optional(),
          })
        )
        .optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('updateProjectSpecifications', result, input);
    return result;
  }
);

// 18. Tool: Create Release
export const createReleaseTool = ai.defineTool(
  {
    name: 'createRelease',
    description: 'Creates a project Release, Stage, or Milestone in the project schedule.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Name of the release (e.g. "Release 1.0", "UAT Milestone").'),
      itemType: z.enum(['Release', 'Stage', 'Milestone']).default('Release'),
      description: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      milestoneDate: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
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
    const result = {
      success: true,
      name: input.name,
      itemType: input.itemType,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/releases`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('createRelease', result, input);
    return result;
  }
);

// 19. Tool: Create Payment Milestone
export const createPaymentMilestoneTool = ai.defineTool(
  {
    name: 'createPaymentMilestone',
    description: 'Creates a commercial payment milestone with billing percentage and amount.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Milestone name (e.g. "Signoff on Architecture - 20%").'),
      billingPercentage: z.number().describe('Percentage of contract (e.g. 20).'),
      amount: z.number().describe('Dollar amount (e.g. 15000).'),
      status: z
        .enum(['TBD', 'In Progress', 'Milestone completed', 'Invoice raised', 'Payment Completed'])
        .default('TBD'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
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
    const result = {
      success: true,
      name: input.name,
      amount: input.amount,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/pmo/fb-payment-milestones`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('createPaymentMilestone', result, input);
    return result;
  }
);

// 20. Tool: Assign Project Resource
export const assignProjectResourceTool = ai.defineTool(
  {
    name: 'assignProjectResource',
    description: 'Assigns an employee/resource to the project team with role and daily billing rate.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Resource name or email.'),
      role: z.enum(['Developer', 'Tester', 'Technical Architect', 'Business Analyst', 'Project Manager']).default('Developer'),
      billingRate: z.number().optional().describe('Daily billing rate in USD.'),
      onboardingDate: z.string().optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string().optional(),
      role: z.string().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      name: input.name,
      role: input.role,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/resources/project-resources`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('assignProjectResource', result, input);
    return result;
  }
);

// 21. Tool: Log Work (Timesheet)
export const logWorkTool = ai.defineTool(
  {
    name: 'logWork',
    description: 'Logs work hours against a user story or task for a specific date in timesheets.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      storyId: z.string().describe('The story identifier (e.g. "ST-1").'),
      hours: z.number().describe('Hours spent (e.g. 4, 7.5).'),
      description: z.string().optional().describe('Work log description.'),
      date: z.string().optional().describe('Date string in YYYY-MM-DD format.'),
      workType: z.enum(['Story/Requirement', 'Defect', 'Task', 'Feature Change', 'Meeting', 'Review']).default('Story/Requirement'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      storyId: z.string(),
      hours: z.number(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      storyId: input.storyId,
      hours: input.hours,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/resources/timesheet`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('logWork', result, input);
    return result;
  }
);

// 22. Tool: Add Environment
export const addEnvironmentTool = ai.defineTool(
  {
    name: 'addEnvironment',
    description: 'Adds an environment (Dev, SIT, UAT, Staging, Production) to project configurations.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Environment name (e.g. "Dev", "SIT", "UAT", "Staging", "Production").'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      name: input.name,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/project-details/specifications`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('addEnvironment', result, input);
    return result;
  }
);

// 23. Tool: Add Code Repository
export const addCodeRepositoryTool = ai.defineTool(
  {
    name: 'addCodeRepository',
    description: 'Links a GitHub, GitLab, or Bitbucket repository URL to the project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      repoUrl: z.string().describe('Repository URL (e.g. "https://github.com/org/repo").'),
      service: z.enum(['github', 'gitlab', 'bitbucket', 'other']).default('github'),
      branch: z.string().default('main'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      repoUrl: z.string(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      repoUrl: input.repoUrl,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/project-settings`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('addCodeRepository', result, input);
    return result;
  }
);

// 24. Tool: Add Fixed Cost
export const addFixedCostTool = ai.defineTool(
  {
    name: 'addFixedCost',
    description: 'Adds a fixed financial cost item (software license, infrastructure, third-party API) to project finances.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      description: z.string().describe('Description of the expense.'),
      costType: z.enum(['Software License', 'Hardware / Infrastructure', 'Third-Party Services', 'Training & Certification', 'Travel & Expenses', 'Contingency / Buffer', 'Other']).default('Software License'),
      amount: z.number().describe('Cost amount in USD.'),
      frequency: z.enum(['One-time', 'Monthly', 'Annual']).default('One-time'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      description: z.string(),
      amount: z.number(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: true,
      description: input.description,
      amount: input.amount,
      projectId: input.projectId,
      url: `/projects/${input.projectId}/pmo/fixed-cost-calculator`,
      needsClientExecution: true,
      params: input,
    };
    recordExecutedAction('addFixedCost', result, input);
    return result;
  }
);

// 25. Tool: Query Project Context
export const queryProjectContextTool = ai.defineTool(
  {
    name: 'queryProjectContext',
    description: 'Queries project information: stories count, epics, sprints, risks, issues, environments, specifications.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID to inspect.'),
    }),
    outputSchema: z.object({
      contextJson: z.string().describe('JSON stringified summary of project statistics and active items.'),
    }),
  },
  async (input) => {
    try {
      const summary = await flowpilotQueryProjectContext(input.projectId);
      return { contextJson: JSON.stringify(summary) };
    } catch (err: any) {
      return { contextJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// 26. Tool: List All Projects
export const listProjectsTool = ai.defineTool(
  {
    name: 'listProjects',
    description: 'Lists all projects currently in the workspace with ID, name, portfolio, and status.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      projectsJson: z.string().describe('JSON stringified list of projects.'),
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

export const allFlowPilotTools = [
  createWorkItemTool,
  updateWorkItemTool,
  createPortfolioTool,
  listPortfoliosTool,
  createProjectTool,
  createEpicTool,
  createSprintTool,
  updateSprintTool,
  assignStoryToSprintTool,
  createTestCaseTool,
  createTestPlanTool,
  createRaidItemTool,
  updateRaidItemTool,
  updateProjectDetailsTool,
  addImpactedSystemTool,
  addHorizontalTool,
  updateProjectSpecificationsTool,
  createReleaseTool,
  createPaymentMilestoneTool,
  assignProjectResourceTool,
  logWorkTool,
  addEnvironmentTool,
  addCodeRepositoryTool,
  addFixedCostTool,
  queryProjectContextTool,
  listProjectsTool,
];
