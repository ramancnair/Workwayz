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
  flowpilotBulkCreateTestCases,
  flowpilotCreateTestPlan,
  flowpilotAddTestCasesToTestPlan,
  flowpilotUpdateTestCaseStatus,
  flowpilotCreateRaidItem,
  flowpilotQueryProjectContext,
  flowpilotListProjects,
  flowpilotCreatePortfolio,
  flowpilotListPortfolios,
  flowpilotArchiveProject,
  flowpilotUnarchiveProject,
  flowpilotDeleteProject,
  flowpilotUpdatePortfolio,
  flowpilotDeletePortfolio,
  flowpilotSetProjectManager,
  flowpilotAutogenProject,
  flowpilotGetPortfolioDashboardSummary,
  flowpilotQueryPortfolioRisks,
  flowpilotQueryPortfolioIssues,
  flowpilotQueryQualityEstimations,
  flowpilotQueryQualityDefects,
  flowpilotQueryBillingOverview,
  flowpilotQueryBillingRates,
  flowpilotUpdateResourceRate,
  flowpilotUpdateSpecificationRate,
  flowpilotQueryResourceUtilization,
  flowpilotQueryAvailableResources,
  flowpilotQueryOverallocatedResources,
  flowpilotQueryHolidays,
  flowpilotCreateHoliday,
  flowpilotDeleteHoliday,
  flowpilotQueryLeaveSettings,
  flowpilotUpdateLeaveSettings,
  flowpilotQueryLeaveRequests,
  flowpilotApplyLeave,
  flowpilotDeleteLeave,
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

// 10b. Tool: Bulk Create / Generate Test Cases
export const bulkCreateTestCasesTool = ai.defineTool(
  {
    name: 'bulkCreateTestCases',
    description:
      'Creates multiple QA test cases in a single batch operation. Highly recommended when generating test cases for user stories, features, or system specifications.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      testCases: z
        .array(
          z.object({
            title: z.string().describe('Clear, descriptive test case title.'),
            description: z.string().describe('Steps to execute or test condition.'),
            expectedResult: z.string().describe('Expected outcome.'),
            type: z.enum(['Functional', 'Non-functional', 'Regression', 'Smoke', 'Integration']).default('Functional'),
            storyId: z.string().optional().describe('Optional story ID (e.g. "ST-1") this test case verifies.'),
            assigneeId: z.string().optional().describe('Optional tester user ID.'),
          })
        )
        .describe('Array of test cases to create.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      count: z.number().optional(),
      testCases: z.array(z.any()).optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotBulkCreateTestCases(input);
    } catch (err: any) {
      result = {
        success: true,
        count: input.testCases.length,
        testCases: input.testCases,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/testing/test-backlog`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('bulkCreateTestCases', result, input);
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
    let result: any;
    try {
      result = await flowpilotCreateTestPlan(input);
    } catch (err: any) {
      result = {
        success: true,
        name: input.name,
        planType: input.planType,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/testing/test-cycle`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('createTestPlan', result, input);
    return result;
  }
);

// 11b. Tool: Add Test Cases to Test Plan / Cycle
export const addTestCasesToTestPlanTool = ai.defineTool(
  {
    name: 'addTestCasesToTestPlan',
    description: 'Adds existing project test cases into a specific Test Plan or Test Cycle for execution.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      planId: z.string().optional().describe('Test plan document ID or testPlanId (e.g. "TP-1").'),
      planName: z.string().optional().describe('Optional name of the test plan.'),
      testCaseIds: z.array(z.string()).optional().describe('Array of test case IDs (e.g. ["TC-1", "TC-2"]). If omitted, all test cases in the project are added.'),
      executionDate: z.string().optional().describe('Target execution date ISO string.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      planId: z.string().optional(),
      planName: z.string().optional(),
      addedCount: z.number().optional(),
      projectId: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotAddTestCasesToTestPlan(input);
    } catch (err: any) {
      result = {
        success: true,
        planId: input.planId,
        planName: input.planName,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/testing/test-plan`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('addTestCasesToTestPlan', result, input);
    return result;
  }
);

// 11c. Tool: Update Test Case Execution Status in Cycle
export const updateTestCaseStatusTool = ai.defineTool(
  {
    name: 'updateTestCaseStatus',
    description: 'Updates the execution status of a test case in a test cycle (Passed, Failed, Blocked, Skipped, Not Run).',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      testCaseId: z.string().describe('Test case ID (e.g. "TC-1" or "TP-1-TC-1").'),
      planId: z.string().optional().describe('Optional target test plan ID.'),
      status: z.enum(['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped']).describe('Execution status.'),
      actualEffortHours: z.number().optional().describe('Actual effort hours spent on execution.'),
      comments: z.string().optional().describe('Execution notes or comments.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      testCaseId: z.string(),
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
      result = await flowpilotUpdateTestCaseStatus(input);
    } catch (err: any) {
      result = {
        success: true,
        testCaseId: input.testCaseId,
        status: input.status,
        projectId: input.projectId,
        url: `/projects/${input.projectId}/testing/test-execution`,
        needsClientExecution: true,
        params: input,
      };
    }
    recordExecutedAction('updateTestCaseStatus', result, input);
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

// 27. Tool: Archive Project
export const archiveProjectTool = ai.defineTool(
  {
    name: 'archiveProject',
    description: 'Archives an active project, moving it to the Archived Projects tab on Project Home.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID to archive.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      url: z.string().optional(),
      message: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotArchiveProject(input);
    } catch (err) {
      result = { success: true, projectId: input.projectId, url: '/project-home', needsClientExecution: true, params: input };
    }
    recordExecutedAction('archiveProject', result, input);
    return result;
  }
);

// 28. Tool: Unarchive Project (Restore)
export const unarchiveProjectTool = ai.defineTool(
  {
    name: 'unarchiveProject',
    description: 'Restores an archived project back to Active status on Project Home.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID to restore.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      url: z.string().optional(),
      message: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUnarchiveProject(input);
    } catch (err) {
      result = { success: true, projectId: input.projectId, url: '/project-home', needsClientExecution: true, params: input };
    }
    recordExecutedAction('unarchiveProject', result, input);
    return result;
  }
);

// 29. Tool: Delete Project
export const deleteProjectTool = ai.defineTool(
  {
    name: 'deleteProject',
    description: 'Moves a project to trash / deletes a project from Project Home.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID to delete.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      url: z.string().optional(),
      message: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteProject(input);
    } catch (err) {
      result = { success: true, projectId: input.projectId, url: '/project-home', needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteProject', result, input);
    return result;
  }
);

// 30. Tool: Update Portfolio
export const updatePortfolioTool = ai.defineTool(
  {
    name: 'updatePortfolio',
    description: 'Updates a portfolio folder name or description on Project Home.',
    inputSchema: z.object({
      portfolioId: z.string().describe('The portfolio ID (e.g. "PF001").'),
      name: z.string().optional().describe('New name for the portfolio.'),
      description: z.string().optional().describe('New description.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      portfolioId: z.string(),
      name: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdatePortfolio(input);
    } catch (err) {
      result = { success: true, portfolioId: input.portfolioId, name: input.name, url: '/project-home', needsClientExecution: true, params: input };
    }
    recordExecutedAction('updatePortfolio', result, input);
    return result;
  }
);

// 31. Tool: Delete Portfolio
export const deletePortfolioTool = ai.defineTool(
  {
    name: 'deletePortfolio',
    description: 'Deletes an empty portfolio folder from Project Home (fails if active projects belong to it).',
    inputSchema: z.object({
      portfolioId: z.string().describe('The portfolio ID to delete.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      portfolioId: z.string(),
      url: z.string().optional(),
      message: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeletePortfolio(input);
    } catch (err: any) {
      result = { success: false, portfolioId: input.portfolioId, message: err.message, url: '/project-home' };
    }
    recordExecutedAction('deletePortfolio', result, input);
    return result;
  }
);

// 32. Tool: Set Primary Project Manager
export const setProjectManagerTool = ai.defineTool(
  {
    name: 'setProjectManager',
    description: 'Assigns or updates the primary Project Manager for a project on Project Home.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      projectManagerId: z.string().describe('Employee ID of the Project Manager.'),
      projectManagerName: z.string().optional().describe('Full name of the Project Manager.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      projectManagerId: z.string(),
      projectManager: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotSetProjectManager(input);
    } catch (err) {
      result = { success: true, projectId: input.projectId, projectManagerId: input.projectManagerId, url: '/project-home', needsClientExecution: true, params: input };
    }
    recordExecutedAction('setProjectManager', result, input);
    return result;
  }
);

// 33. Tool: Autogen Project
export const autogenProjectTool = ai.defineTool(
  {
    name: 'autogenProject',
    description: 'Scaffolds an entire turnkey project with epics, stories, tasks, test cycles, test cases, and RAID items.',
    inputSchema: z.object({
      projectName: z.string().describe('Name of the new project to generate.'),
      portfolioId: z.string().optional().describe('Portfolio ID (e.g. "PF001").'),
      pricingModel: z.enum(['Fixed Bid', 'T&M']).default('Fixed Bid').describe('Pricing model.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string().optional(),
      name: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotAutogenProject(input);
    } catch (err) {
      result = { success: true, name: input.projectName, needsClientExecution: true, params: input };
    }
    recordExecutedAction('autogenProject', result, input);
    return result;
  }
);

// 34. Tool: Get Portfolio Dashboard Summary
export const getPortfolioDashboardSummaryTool = ai.defineTool(
  {
    name: 'getPortfolioDashboardSummary',
    description: 'Retrieves executive RAG health distribution (Red, Amber, Green), high potential risks, and critical issues across the portfolio.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID filter or "all".'),
    }),
    outputSchema: z.object({
      summaryJson: z.string().describe('JSON summary of portfolio health, red projects, high risks, and critical issues.'),
    }),
  },
  async (input) => {
    try {
      const summary = await flowpilotGetPortfolioDashboardSummary(input);
      return { summaryJson: JSON.stringify(summary) };
    } catch (err: any) {
      return { summaryJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// 35. Tool: Query Portfolio Risks
export const queryPortfolioRisksTool = ai.defineTool(
  {
    name: 'queryPortfolioRisks',
    description: 'Queries and ranks high-potential risks across all active projects in the portfolio.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID filter or "all".'),
      minPotential: z.enum(['High', 'Medium', 'Low']).optional().describe('Minimum risk potential filter.'),
    }),
    outputSchema: z.object({
      risksJson: z.string().describe('JSON stringified array of ranked portfolio risks.'),
    }),
  },
  async (input) => {
    try {
      const risks = await flowpilotQueryPortfolioRisks(input);
      return { risksJson: JSON.stringify(risks) };
    } catch (err: any) {
      return { risksJson: JSON.stringify([]) };
    }
  }
);

// 36. Tool: Query Portfolio Issues
export const queryPortfolioIssuesTool = ai.defineTool(
  {
    name: 'queryPortfolioIssues',
    description: 'Queries open critical and high priority issues/blockers across all active projects.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID filter or "all".'),
      priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional().describe('Priority filter.'),
      status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional().describe('Status filter.'),
    }),
    outputSchema: z.object({
      issuesJson: z.string().describe('JSON stringified array of portfolio issues.'),
    }),
  },
  async (input) => {
    try {
      const issues = await flowpilotQueryPortfolioIssues(input);
      return { issuesJson: JSON.stringify(issues) };
    } catch (err: any) {
      return { issuesJson: JSON.stringify([]) };
    }
  }
);

// 37. Tool: Query Quality Estimations
export const queryQualityEstimationsTool = ai.defineTool(
  {
    name: 'queryQualityEstimations',
    description: 'Queries initial man-days vs planned man-days, variance, actual effort, and conformance rates across projects.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID filter.'),
    }),
    outputSchema: z.object({
      estimationsJson: z.string().describe('JSON stringified array of project estimations and variance.'),
    }),
  },
  async (input) => {
    try {
      const est = await flowpilotQueryQualityEstimations(input);
      return { estimationsJson: JSON.stringify(est) };
    } catch (err: any) {
      return { estimationsJson: JSON.stringify([]) };
    }
  }
);

// 38. Tool: Query Quality Defects
export const queryQualityDefectsTool = ai.defineTool(
  {
    name: 'queryQualityDefects',
    description: 'Queries cross-project defect counts (SIT, UAT, Production) and production defect leakage rate percentages.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID filter.'),
    }),
    outputSchema: z.object({
      defectsJson: z.string().describe('JSON stringified array of project defect metrics.'),
    }),
  },
  async (input) => {
    try {
      const def = await flowpilotQueryQualityDefects(input);
      return { defectsJson: JSON.stringify(def) };
    } catch (err: any) {
      return { defectsJson: JSON.stringify([]) };
    }
  }
);

// 39. Tool: Query Billing Overview
export const queryBillingOverviewTool = ai.defineTool(
  {
    name: 'queryBillingOverview',
    description: 'Queries revenue, resource costs, fixed costs, gross profit, and profit margin % across all projects.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID filter.'),
    }),
    outputSchema: z.object({
      billingJson: z.string().describe('JSON stringified portfolio financial breakdown.'),
    }),
  },
  async (input) => {
    try {
      const billing = await flowpilotQueryBillingOverview(input);
      return { billingJson: JSON.stringify(billing) };
    } catch (err: any) {
      return { billingJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// 40. Tool: Query Billing Rates
export const queryBillingRatesTool = ai.defineTool(
  {
    name: 'queryBillingRates',
    description: 'Queries master resource rate directory, role benchmarks (avg billed rate, avg cost rate, avg margin %), and assigned rates.',
    inputSchema: z.object({
      projectId: z.string().optional().describe('Optional project ID filter.'),
    }),
    outputSchema: z.object({
      ratesJson: z.string().describe('JSON stringified role benchmarks and resource rates.'),
    }),
  },
  async (input) => {
    try {
      const rates = await flowpilotQueryBillingRates(input);
      return { ratesJson: JSON.stringify(rates) };
    } catch (err: any) {
      return { ratesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// 41. Tool: Update Resource Rate
export const updateResourceRateTool = ai.defineTool(
  {
    name: 'updateResourceRate',
    description: 'Updates daily billed rate and internal cost rate for an assigned resource in a project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      employeeId: z.string().describe('The employee ID.'),
      billedRate: z.number().describe('Daily billed rate in USD.'),
      costRate: z.number().describe('Daily cost rate in USD.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      employeeId: z.string(),
      billedRate: z.number(),
      costRate: z.number(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateResourceRate(input);
    } catch (err) {
      result = { success: true, ...input, url: '/billing-rate', needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateResourceRate', result, input);
    return result;
  }
);

// 42. Tool: Update Specification Rate
export const updateSpecificationRateTool = ai.defineTool(
  {
    name: 'updateSpecificationRate',
    description: 'Updates the daily billing rate on an impacted system or horizontal capability.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      specType: z.enum(['system', 'horizontal']).describe('Whether updating an impacted system or horizontal.'),
      itemId: z.string().describe('Item document ID.'),
      dailyBillingRate: z.number().describe('New daily billing rate in USD.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      specType: z.string(),
      itemId: z.string(),
      dailyBillingRate: z.number(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateSpecificationRate(input);
    } catch (err) {
      result = { success: true, ...input, url: '/billing-rate', needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateSpecificationRate', result, input);
    return result;
  }
);

// 43. Tool: Query Resource Utilization
export const queryResourceUtilizationTool = ai.defineTool(
  {
    name: 'queryResourceUtilization',
    description: 'Queries resource workload: active project allocations, availability %, planned task hours, actual logged hours, and over/under-allocation status.',
    inputSchema: z.object({
      employeeId: z.string().optional().describe('Employee ID to inspect.'),
      employeeName: z.string().optional().describe('Employee name to search.'),
    }),
    outputSchema: z.object({
      utilizationJson: z.string().describe('JSON stringified utilization metrics for the employee.'),
    }),
  },
  async (input) => {
    try {
      const util = await flowpilotQueryResourceUtilization(input);
      return { utilizationJson: JSON.stringify(util) };
    } catch (err: any) {
      return { utilizationJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// 44. Tool: Query Available Resources (Bench)
export const queryAvailableResourcesTool = ai.defineTool(
  {
    name: 'queryAvailableResources',
    description: 'Searches for employees with available/free capacity (< 100% allocated across projects) filtered by role.',
    inputSchema: z.object({
      role: z.string().optional().describe('Optional role filter (e.g. "Developer", "Tester", "Architect").'),
      minAvailability: z.number().optional().describe('Minimum free percentage capacity (default 20%).'),
    }),
    outputSchema: z.object({
      availableResourcesJson: z.string().describe('JSON stringified array of available team members.'),
    }),
  },
  async (input) => {
    try {
      const list = await flowpilotQueryAvailableResources(input);
      return { availableResourcesJson: JSON.stringify(list) };
    } catch (err: any) {
      return { availableResourcesJson: JSON.stringify([]) };
    }
  }
);

// 45. Tool: Query Overallocated Resources
export const queryOverallocatedResourcesTool = ai.defineTool(
  {
    name: 'queryOverallocatedResources',
    description: 'Identifies team members allocated > 100% across multiple simultaneous active projects.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      overallocatedJson: z.string().describe('JSON stringified list of overallocated resources.'),
    }),
  },
  async () => {
    try {
      const list = await flowpilotQueryOverallocatedResources();
      return { overallocatedJson: JSON.stringify(list) };
    } catch (err: any) {
      return { overallocatedJson: JSON.stringify([]) };
    }
  }
);

// 46. Tool: Query Holidays
export const queryHolidaysTool = ai.defineTool(
  {
    name: 'queryHolidays',
    description: 'Queries organization calendar holidays for the specified year.',
    inputSchema: z.object({
      year: z.number().optional().describe('Year to query (defaults to current year).'),
    }),
    outputSchema: z.object({
      holidaysJson: z.string().describe('JSON stringified list of holidays.'),
    }),
  },
  async (input) => {
    try {
      const hols = await flowpilotQueryHolidays(input);
      return { holidaysJson: JSON.stringify(hols) };
    } catch (err: any) {
      return { holidaysJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// 47. Tool: Create Holiday
export const createHolidayTool = ai.defineTool(
  {
    name: 'createHoliday',
    description: 'Adds a new holiday to the organization Holiday Calendar.',
    inputSchema: z.object({
      name: z.string().describe('Name or description of the holiday.'),
      date: z.string().describe('Date in YYYY-MM-DD format.'),
      type: z.enum(['National', 'Regional', 'Optional']).default('National').describe('Holiday type.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      name: z.string(),
      date: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotCreateHoliday(input);
    } catch (err) {
      result = { success: true, ...input, url: '/holidays/holiday-calendar', needsClientExecution: true, params: input };
    }
    recordExecutedAction('createHoliday', result, input);
    return result;
  }
);

// 48. Tool: Delete Holiday
export const deleteHolidayTool = ai.defineTool(
  {
    name: 'deleteHoliday',
    description: 'Deletes a holiday from the organization Holiday Calendar.',
    inputSchema: z.object({
      holidayId: z.string().describe('Holiday document ID to delete.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      holidayId: z.string(),
      url: z.string().optional(),
      message: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteHoliday(input);
    } catch (err) {
      result = { success: true, holidayId: input.holidayId, url: '/holidays/holiday-calendar', needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteHoliday', result, input);
    return result;
  }
);

// 49. Tool: Query Leave Settings
export const queryLeaveSettingsTool = ai.defineTool(
  {
    name: 'queryLeaveSettings',
    description: 'Queries global leave policy quotas (allocated annual paid leaves, carryover limit, weekly off days).',
    inputSchema: z.object({}),
    outputSchema: z.object({
      settingsJson: z.string().describe('JSON stringified leave policy settings.'),
    }),
  },
  async () => {
    try {
      const s = await flowpilotQueryLeaveSettings();
      return { settingsJson: JSON.stringify(s) };
    } catch (err: any) {
      return { settingsJson: JSON.stringify({}) };
    }
  }
);

// 50. Tool: Update Leave Settings
export const updateLeaveSettingsTool = ai.defineTool(
  {
    name: 'updateLeaveSettings',
    description: 'Updates organization leave quotas, carryover permissions, or weekly off days in Leave Settings.',
    inputSchema: z.object({
      allocatedPaidLeavesPerYear: z.number().optional().describe('Annual allocated paid leave days.'),
      allowCarryOver: z.boolean().optional().describe('Whether unused leaves can carry over.'),
      carryOverLimit: z.number().optional().describe('Maximum carryover days limit.'),
      weeklyOffDays: z.array(z.number()).optional().describe('Array of weekday indices (0=Sun, 6=Sat).'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      url: z.string().optional(),
      settings: z.any().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateLeaveSettings(input);
    } catch (err) {
      result = { success: true, url: '/holidays/leave-settings', needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateLeaveSettings', result, input);
    return result;
  }
);

// 51. Tool: Query Leave Requests
export const queryLeaveRequestsTool = ai.defineTool(
  {
    name: 'queryLeaveRequests',
    description: 'Queries employee leave requests and planned absences across the portfolio.',
    inputSchema: z.object({
      employeeId: z.string().optional().describe('Optional employee ID filter.'),
      type: z.enum(['Paid Leave', 'Loss of Pay']).optional().describe('Leave type filter.'),
    }),
    outputSchema: z.object({
      leavesJson: z.string().describe('JSON stringified list of leave records.'),
    }),
  },
  async (input) => {
    try {
      const leaves = await flowpilotQueryLeaveRequests(input);
      return { leavesJson: JSON.stringify(leaves) };
    } catch (err: any) {
      return { leavesJson: JSON.stringify([]) };
    }
  }
);

// 52. Tool: Apply Leave
export const applyLeaveTool = ai.defineTool(
  {
    name: 'applyLeave',
    description: 'Submits a leave request for an employee in Leave Tracker.',
    inputSchema: z.object({
      employeeId: z.string().describe('Employee ID or empId.'),
      startDate: z.string().describe('Start date (YYYY-MM-DD).'),
      endDate: z.string().describe('End date (YYYY-MM-DD).'),
      type: z.enum(['Paid Leave', 'Loss of Pay']).default('Paid Leave').describe('Leave type.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      leaveId: z.string().optional(),
      employeeId: z.string(),
      employeeName: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
      type: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotApplyLeave(input);
    } catch (err) {
      result = { success: true, ...input, url: '/holidays/leave-tracker', needsClientExecution: true, params: input };
    }
    recordExecutedAction('applyLeave', result, input);
    return result;
  }
);

// 53. Tool: Delete / Cancel Leave
export const deleteLeaveTool = ai.defineTool(
  {
    name: 'deleteLeave',
    description: 'Cancels and deletes an employee leave record in Leave Tracker.',
    inputSchema: z.object({
      employeeId: z.string().describe('Employee ID or empId.'),
      leaveId: z.string().describe('The leave record ID to delete.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      employeeId: z.string(),
      leaveId: z.string(),
      url: z.string().optional(),
      message: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteLeave(input);
    } catch (err) {
      result = { success: true, ...input, url: '/holidays/leave-tracker', needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteLeave', result, input);
    return result;
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
  bulkCreateTestCasesTool,
  createTestPlanTool,
  addTestCasesToTestPlanTool,
  updateTestCaseStatusTool,
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
  archiveProjectTool,
  unarchiveProjectTool,
  deleteProjectTool,
  updatePortfolioTool,
  deletePortfolioTool,
  setProjectManagerTool,
  autogenProjectTool,
  getPortfolioDashboardSummaryTool,
  queryPortfolioRisksTool,
  queryPortfolioIssuesTool,
  queryQualityEstimationsTool,
  queryQualityDefectsTool,
  queryBillingOverviewTool,
  queryBillingRatesTool,
  updateResourceRateTool,
  updateSpecificationRateTool,
  queryResourceUtilizationTool,
  queryAvailableResourcesTool,
  queryOverallocatedResourcesTool,
  queryHolidaysTool,
  createHolidayTool,
  deleteHolidayTool,
  queryLeaveSettingsTool,
  updateLeaveSettingsTool,
  queryLeaveRequestsTool,
  applyLeaveTool,
  deleteLeaveTool,
];
