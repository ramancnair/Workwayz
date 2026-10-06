import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { AsyncLocalStorage } from 'async_hooks';
import { isBugWorkItem } from '@/types';
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
  flowpilotMoveProjectToPortfolio,
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
  flowpilotGetProjectHomeMetrics,
  flowpilotDuplicateProject,
  flowpilotFilterPortfolioDashboardByDate,
  flowpilotExportPortfolioDashboardReport,
  flowpilotExportQualityEstimationsReport,
  flowpilotSetQualityVarianceAlertThreshold,
  flowpilotQueryDefectTrendByMonth,
  flowpilotQueryDefectRootCauseSummary,
  flowpilotExportBillingOverviewCsv,
  flowpilotQueryProjectProfitabilityForecast,
  flowpilotBulkUpdateResourceRates,
  flowpilotSetDefaultRoleBenchmarkRates,
  flowpilotCreateUser,
  flowpilotUpdateUserRole,
  flowpilotToggleUserStatus,
  flowpilotListAllUsers,
  flowpilotQueryDepartmentUtilizationTrends,
  flowpilotExportResourceUtilizationReport,
  flowpilotBulkImportHolidays,
  flowpilotUpdateHoliday,
  flowpilotResetAnnualLeaveBalances,
  flowpilotApproveLeaveRequest,
  flowpilotRejectLeaveRequest,
  flowpilotQueryEmployeeLeaveBalance,
  // Project Level
  flowpilotUpdateInitialImpactedSystem,
  flowpilotDeleteInitialImpactedSystem,
  flowpilotUpdateInitialHorizontal,
  flowpilotDeleteInitialHorizontal,
  flowpilotQueryInitialSpecifications,
  flowpilotConfirmProjectEstimation,
  flowpilotUpdateInitialProjectDates,
  flowpilotQueryInitialProjectStatus,
  flowpilotUpdateProjectHealth,
  flowpilotUpdateProjectDates,
  flowpilotQueryProjectStatusDetails,
  flowpilotQueryProjectPmDashboard,
  flowpilotQueryProjectWorkload,
  flowpilotQueryProjectResourceFinancials,
  flowpilotQuerySwimLaneCycleTime,
  flowpilotQueryResourceBottlenecks,
  flowpilotQueryEpicProgress,
  flowpilotUpdateImpactedSystem,
  flowpilotDeleteImpactedSystem,
  flowpilotUpdateHorizontal,
  flowpilotDeleteHorizontal,
  flowpilotQueryProjectSpecifications,
  flowpilotDeleteEnvironment,
  flowpilotReorderEnvironments,
  flowpilotRemoveProjectResource,
  flowpilotUpdateProjectResourceRole,
  flowpilotQueryProjectTeamMembers,
  flowpilotQueryProjectWorklogs,
  flowpilotDeleteWorklogEntry,
  flowpilotUpdateWorklogEntry,
  flowpilotQueryProjectResourceWorkloadMatrix,
  flowpilotReassignWorkload,
  flowpilotQueryProjectGanttTimeline,
  flowpilotUpdateGanttTaskDependency,
  flowpilotUpdateRelease,
  flowpilotDeleteRelease,
  flowpilotQueryProjectReleases,
  flowpilotAssignStoriesToRelease,
  flowpilotQueryDevDashboardSummary,
  flowpilotQuerySprintBurndownData,
  flowpilotQueryVelocityMetrics,
  flowpilotReorderBacklogStories,
  flowpilotDeleteEpic,
  flowpilotQueryBacklogStories,
  flowpilotDeleteWorkItem,
  flowpilotBulkEstimateStories,
  flowpilotQueryUngroomedStories,
  flowpilotTagStoryAcceptanceCriteria,
  flowpilotQueryKanbanBoardState,
  flowpilotUpdateKanbanWipLimits,
  flowpilotQuerySubTasksByStory,
  flowpilotDeleteSubTask,
  flowpilotBulkCreateSubTasks,
  flowpilotQueryProjectDefects,
  flowpilotLinkDefectToStory,
  flowpilotCloseDefect,
  flowpilotQueryTestDashboardSummary,
  flowpilotQueryTestExecutionProgress,
  flowpilotQueryDefectDensity,
  flowpilotUpdateTestCase,
  flowpilotDeleteTestCase,
  flowpilotQueryTestCases,
  flowpilotBulkImportTestCases,
  flowpilotUpdateTestPlan,
  flowpilotDeleteTestPlan,
  flowpilotQueryTestPlans,
  flowpilotRemoveTestCaseFromPlan,
  flowpilotQueryTestExecutionList,
  flowpilotBulkUpdateTestExecutionStatus,
  flowpilotLogDefectFromTestExecution,
  flowpilotQueryQaDefects,
  flowpilotExportDefectsReport,
  flowpilotQueryRaidDashboardSummary,
  flowpilotExportRaidLogCsv,
  flowpilotQueryProjectRisks,
  flowpilotDeleteRisk,
  flowpilotCloseRisk,
  flowpilotQueryProjectAssumptions,
  flowpilotDeleteAssumption,
  flowpilotValidateAssumption,
  flowpilotQueryProjectIssues,
  flowpilotDeleteIssue,
  flowpilotResolveIssue,
  flowpilotQueryProjectDependencies,
  flowpilotDeleteDependency,
  flowpilotUpdateDependencyStatus,
  flowpilotOverrideProjectHolidayCalendar,
  flowpilotQueryProjectSpecificHolidays,
  flowpilotQueryTeamAbsenceCalendarBySprint,
  flowpilotUploadPmoDocument,
  flowpilotDeletePmoDocument,
  flowpilotQueryPmoDocuments,
  flowpilotAddExternalDocLink,
  flowpilotQueryFbBillingSummary,
  flowpilotUpdateFbContractValue,
  flowpilotLogFbInvoice,
  flowpilotUpdatePaymentMilestone,
  flowpilotDeletePaymentMilestone,
  flowpilotQueryPaymentMilestones,
  flowpilotMarkMilestoneInvoiceRaised,
  flowpilotQueryTnmBillingSummary,
  flowpilotGenerateMonthlyTnmInvoice,
  flowpilotUpdateTnmMilestone,
  flowpilotDeleteTnmMilestone,
  flowpilotQueryTnmMilestones,
  flowpilotQueryBcpPlan,
  flowpilotUpdateBcpPrimaryContacts,
  flowpilotLogBcpDisasterRecoveryPlan,
  flowpilotAddKanbanColumn,
  flowpilotDeleteKanbanColumn,
  flowpilotUpdateKanbanColumnsOrder,
  flowpilotQueryBoardSettings,
  flowpilotUpdateSprintDurationSettings,
  flowpilotSetSprintStartDay,
  flowpilotQuerySprintSettings,
  flowpilotUpdateEffortConversionSettings,
  flowpilotQueryEffortSettings,
  flowpilotQueryProjectTrashItems,
  flowpilotRestoreProjectTrashItem,
  flowpilotPermanentlyDeleteProjectItem,
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
        .enum([
          'User Story',
          'Requirement/Story',
          'Feature Change',
          'Task',
          'Enabler',
          'Tech Debt',
          'Spike',
          'Bug / Defect',
          'Bug',
          'Subtasks',
          'Sub Task',
          'In-Sprint Bug',
        ])
        .default('User Story')
        .describe('The type of work item: User Story, Feature Change, Task, Enabler, Tech Debt, Spike, Bug / Defect, Subtasks, or In-Sprint Bug.'),
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
        url: isBugWorkItem(input.itemType) ? `/projects/${input.projectId}/testing/defect-tracker` : `/projects/${input.projectId}/development/kanban`,
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
      'Creates a new project in Workwayz workspace under a portfolio, initializing default Kanban columns, settings, and environments. WARNING: DO NOT call this tool when the user is already working inside an active project and providing project specifications, platform summary, or domain details — use updateProjectSpecifications or updateProjectDetails instead.',
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
        url: `/projects/${input.projectId}/testing/test-cases`,
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
        url: `/projects/${input.projectId}/testing/test-cases`,
        needsClientExecution: true,
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
        url: `/projects/${input.projectId}/testing/test-cycle`,
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
    description: 'Updates project summary, scope description, pricing model, overall health status, name, or portfolio assignment.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      portfolioId: z.string().optional().describe('Target portfolio ID or portfolio name to move this project under.'),
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
      portfolioId: z.string().optional(),
      summary: z.string().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    if (input.portfolioId) {
      try {
        await flowpilotMoveProjectToPortfolio({ projectId: input.projectId, portfolioId: input.portfolioId });
      } catch (e) {}
    }
    result = {
      success: true,
      projectId: input.projectId,
      portfolioId: input.portfolioId,
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

// 14b. Tool: Move Project to Portfolio
export const moveProjectToPortfolioTool = ai.defineTool(
  {
    name: 'moveProjectToPortfolio',
    description: 'Moves or reassigns an existing project to a different portfolio folder (e.g. "Move project Raman3 to Portfolio Raman" or "Reassign project to portfolio X").',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID (e.g. "P2600001") or project name.'),
      portfolioId: z.string().describe('The target portfolio ID (e.g. "PF001") or target portfolio name.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      projectId: z.string(),
      projectName: z.string().optional(),
      portfolioId: z.string(),
      portfolioName: z.string().optional(),
      message: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotMoveProjectToPortfolio(input);
    } catch (err: any) {
      result = {
        success: true,
        projectId: input.projectId,
        portfolioId: input.portfolioId,
        needsClientExecution: true,
        params: input,
        url: '/project-home',
      };
    }
    recordExecutedAction('moveProjectToPortfolio', result, input);
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

// 54. Tool: Get Project Home Metrics
export const getProjectHomeMetricsTool = ai.defineTool(
  {
    name: 'getProjectHomeMetrics',
    description: 'Queries workspace metrics for Project Home: total project count, active vs archived vs completed, health distributions (Red/Amber/Green), and portfolio counts.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      totalProjectsCount: z.number(),
      activeProjectsCount: z.number(),
      archivedProjectsCount: z.number(),
      deletedProjectsCount: z.number(),
      totalPortfoliosCount: z.number(),
      healthDistribution: z.object({
        Red: z.number(),
        Amber: z.number(),
        Green: z.number(),
      }),
      pricingModelDistribution: z.record(z.number()),
      statusDistribution: z.record(z.number()),
    }),
  },
  async () => {
    return await flowpilotGetProjectHomeMetrics();
  }
);

// 55. Tool: Duplicate / Clone Project
export const duplicateProjectTool = ai.defineTool(
  {
    name: 'duplicateProject',
    description: 'Clones an existing project with its Kanban columns, settings, testing environments, and epics/specifications into a new project.',
    inputSchema: z.object({
      sourceProjectId: z.string().describe('Source project ID to clone from (e.g. "P2600001").'),
      newProjectName: z.string().describe('Name for the cloned project.'),
      targetPortfolioId: z.string().optional().describe('Target portfolio ID.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      sourceProjectId: z.string(),
      newProjectId: z.string(),
      name: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDuplicateProject(input);
    } catch (err) {
      result = { success: true, ...input, newProjectId: `P2699999`, url: '/project-home', needsClientExecution: true, params: input };
    }
    recordExecutedAction('duplicateProject', result, input);
    return result;
  }
);

// 56. Tool: Filter Portfolio Dashboard By Date
export const filterPortfolioDashboardByDateTool = ai.defineTool(
  {
    name: 'filterPortfolioDashboardByDate',
    description: 'Filters the portfolio executive dashboard by a specific start date and end date range.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID.'),
      startDate: z.string().optional().describe('Start date in ISO format (YYYY-MM-DD).'),
      endDate: z.string().optional().describe('End date in ISO format (YYYY-MM-DD).'),
    }),
    outputSchema: z.object({
      dateRange: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
      filteredProjectsCount: z.number(),
      healthDistribution: z.object({
        Red: z.number(),
        Amber: z.number(),
        Green: z.number(),
      }),
      projects: z.array(z.any()),
      highPotentialRisks: z.array(z.any()),
      criticalIssues: z.array(z.any()),
    }),
  },
  async (input) => {
    return await flowpilotFilterPortfolioDashboardByDate(input);
  }
);

// 57. Tool: Export Portfolio Dashboard Report
export const exportPortfolioDashboardReportTool = ai.defineTool(
  {
    name: 'exportPortfolioDashboardReport',
    description: 'Generates structured executive portfolio status and health summary report data.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID.'),
    }),
    outputSchema: z.object({
      generatedAt: z.string(),
      totalActiveProjects: z.number(),
      healthDistribution: z.any(),
      projectsReport: z.array(z.any()),
      topRisks: z.array(z.any()),
      criticalIssues: z.array(z.any()),
      exportFormat: z.string(),
    }),
  },
  async (input) => {
    return await flowpilotExportPortfolioDashboardReport(input);
  }
);

// 58. Tool: Export Quality Estimations Report
export const exportQualityEstimationsReportTool = ai.defineTool(
  {
    name: 'exportQualityEstimationsReport',
    description: 'Exports cross-project initial ballpark man-days vs planned man-days, variance, and actual effort data for CSV export.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID.'),
    }),
    outputSchema: z.object({
      generatedAt: z.string(),
      totalProjectsTracked: z.number(),
      conformanceSummary: z.any(),
      estimationsData: z.array(z.any()),
      exportFormat: z.string(),
    }),
  },
  async (input) => {
    return await flowpilotExportQualityEstimationsReport(input);
  }
);

// 59. Tool: Set Quality Variance Alert Threshold
export const setQualityVarianceAlertThresholdTool = ai.defineTool(
  {
    name: 'setQualityVarianceAlertThreshold',
    description: 'Configures threshold percentage to trigger alerts when project planned effort exceeds initial estimation.',
    inputSchema: z.object({
      thresholdPercent: z.number().describe('Variance percentage threshold (e.g. 15 for 15%).'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      thresholdPercent: z.number(),
      url: z.string().optional(),
      message: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotSetQualityVarianceAlertThreshold(input);
    } catch (err) {
      result = { success: true, ...input, url: '/quality/estimations', needsClientExecution: true, params: input };
    }
    recordExecutedAction('setQualityVarianceAlertThreshold', result, input);
    return result;
  }
);

// 60. Tool: Query Defect Trend By Month
export const queryDefectTrendByMonthTool = ai.defineTool(
  {
    name: 'queryDefectTrendByMonth',
    description: 'Analyzes monthly defect creation, resolution, and open trends across the portfolio over the past N months.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID.'),
      months: z.number().optional().default(6).describe('Number of preceding months to analyze (default 6).'),
    }),
    outputSchema: z.object({
      monthsTracked: z.number(),
      trends: z.array(
        z.object({
          month: z.string(),
          created: z.number(),
          resolved: z.number(),
          open: z.number(),
        })
      ),
    }),
  },
  async (input) => {
    return await flowpilotQueryDefectTrendByMonth(input);
  }
);

// 61. Tool: Query Defect Root Cause Summary
export const queryDefectRootCauseSummaryTool = ai.defineTool(
  {
    name: 'queryDefectRootCauseSummary',
    description: 'Aggregates defect classification by root cause category (Coding Logic, Requirements, UI/Design, Environment) and phase containment.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID.'),
    }),
    outputSchema: z.object({
      totalDefects: z.number(),
      phaseContainment: z.any(),
      rootCauses: z.record(z.number()),
    }),
  },
  async (input) => {
    return await flowpilotQueryDefectRootCauseSummary(input);
  }
);

// 62. Tool: Export Billing Overview CSV Data
export const exportBillingOverviewCsvTool = ai.defineTool(
  {
    name: 'exportBillingOverviewCsv',
    description: 'Exports consolidated portfolio financial breakdown (revenue, cost, fixed cost, profit, margin %) to CSV-ready format.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID.'),
    }),
    outputSchema: z.object({
      generatedAt: z.string(),
      portfolioTotals: z.any(),
      projectBillingBreakdown: z.array(z.any()),
      exportFormat: z.string(),
    }),
  },
  async (input) => {
    return await flowpilotExportBillingOverviewCsv(input);
  }
);

// 63. Tool: Query Project Profitability Forecast
export const queryProjectProfitabilityForecastTool = ai.defineTool(
  {
    name: 'queryProjectProfitabilityForecast',
    description: 'Generates future profit margin projections and health status based on planned sprint allocations and milestone schedules.',
    inputSchema: z.object({
      portfolioId: z.string().optional().describe('Optional portfolio ID.'),
    }),
    outputSchema: z.object({
      portfolioForecastTotals: z.any(),
      projects: z.array(z.any()),
    }),
  },
  async (input) => {
    return await flowpilotQueryProjectProfitabilityForecast(input);
  }
);

// 64. Tool: Bulk Update Resource Rates
export const bulkUpdateResourceRatesTool = ai.defineTool(
  {
    name: 'bulkUpdateResourceRates',
    description: 'Batch updates daily billed and cost rates for multiple resources across projects in a single operation.',
    inputSchema: z.object({
      updates: z.array(
        z.object({
          employeeId: z.string().describe('Employee ID or empId.'),
          projectId: z.string().optional().describe('Optional project ID to update within a project.'),
          billedRate: z.number().optional().describe('New daily billed rate.'),
          costRate: z.number().optional().describe('New daily cost rate.'),
        })
      ),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      updatedCount: z.number().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotBulkUpdateResourceRates(input);
    } catch (err) {
      result = { success: true, updatedCount: input.updates.length, url: '/billing-rate', needsClientExecution: true, params: input };
    }
    recordExecutedAction('bulkUpdateResourceRates', result, input);
    return result;
  }
);

// 65. Tool: Set Default Role Benchmark Rates
export const setDefaultRoleBenchmarkRatesTool = ai.defineTool(
  {
    name: 'setDefaultRoleBenchmarkRates',
    description: 'Sets standard organization baseline billed and cost rates for standard roles (Developer, Tester, Architect, BA, PM).',
    inputSchema: z.object({
      role: z.string().describe('Role name (e.g. "Developer", "QA Engineer", "Architect", "Project Manager").'),
      defaultBilledRate: z.number().describe('Standard daily billed rate in USD.'),
      defaultCostRate: z.number().describe('Standard internal daily cost rate in USD.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      role: z.string(),
      defaultBilledRate: z.number(),
      defaultCostRate: z.number(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotSetDefaultRoleBenchmarkRates(input);
    } catch (err) {
      result = { success: true, ...input, url: '/billing-rate', needsClientExecution: true, params: input };
    }
    recordExecutedAction('setDefaultRoleBenchmarkRates', result, input);
    return result;
  }
);

// 66. Tool: Create User (RESTRICTED)
export const createUserTool = ai.defineTool(
  {
    name: 'createUser',
    description: 'RESTRICTED GOVERNANCE: Adding or creating users in Portfolio > Users through FlowPilot is strictly disallowed. Direct users to the Portfolio > Users page.',
    inputSchema: z.object({
      email: z.string().email().describe('User work email address.'),
      firstName: z.string().describe('First name.'),
      lastName: z.string().describe('Last name.'),
      empId: z.string().optional().describe('Optional employee ID (e.g. "E005"). If omitted, auto-generated sequentially.'),
      phone: z.string().optional(),
      role: z.string().optional().default('Developer').describe('Designation or role (Developer, Tester, Architect, BA, PM).'),
      accessLevel: z.enum(['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO']).default('Team Member'),
      experience: z.number().optional().describe('Years of experience.'),
      costAmount: z.number().optional().describe('Annual cost salary amount.'),
      costCurrency: z.string().optional().default('USD'),
      employmentStartDate: z.string().optional().describe('Company joining date in YYYY-MM-DD or ISO format.'),
      employmentEndDate: z.string().optional().describe('Company leaving/relieving date in YYYY-MM-DD or ISO format.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      empId: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
      accessLevel: z.string().optional(),
      role: z.string().optional(),
      url: z.string().optional(),
      message: z.string().optional(),
      error: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    const result = {
      success: false,
      error: 'ACTION_RESTRICTED',
      message: 'Adding or creating users from Portfolio > Users through FlowPilot is strictly disallowed for security and governance. Please add users directly on the Portfolio > Users (User List) page with Administrator privileges.',
      url: '/users',
    };
    recordExecutedAction('createUser', result, input);
    return result;
  }
);

// 67. Tool: Update User Role & Access Level
export const updateUserRoleTool = ai.defineTool(
  {
    name: 'updateUserRole',
    description: 'Modifies an existing user\'s organization role, access level, department, joining date, or leaving date in User List.',
    inputSchema: z.object({
      userIdOrEmpId: z.string().describe('User document ID or Emp ID (e.g. "E001").'),
      role: z.string().optional().describe('Updated role name.'),
      accessLevel: z.enum(['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO']).optional(),
      department: z.string().optional(),
      employmentStartDate: z.string().optional().describe('Company joining date in YYYY-MM-DD or ISO format.'),
      employmentEndDate: z.string().optional().describe('Company leaving/relieving date in YYYY-MM-DD or ISO format.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      empId: z.string().optional(),
      name: z.string().optional(),
      role: z.string().optional(),
      accessLevel: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateUserRole(input);
    } catch (err) {
      result = { success: true, ...input, url: '/users', needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateUserRole', result, input);
    return result;
  }
);

// 68. Tool: Toggle User Status (Enable / Disable)
export const toggleUserStatusTool = ai.defineTool(
  {
    name: 'toggleUserStatus',
    description: 'Enables or disables user account login access in User List.',
    inputSchema: z.object({
      userIdOrEmpId: z.string().describe('User document ID or Emp ID (e.g. "E001").'),
      isEnabled: z.boolean().describe('True to enable account, false to disable/suspend.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      id: z.string().optional(),
      empId: z.string().optional(),
      name: z.string().optional(),
      isEnabled: z.boolean(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotToggleUserStatus(input);
    } catch (err) {
      result = { success: true, ...input, url: '/users', needsClientExecution: true, params: input };
    }
    recordExecutedAction('toggleUserStatus', result, input);
    return result;
  }
);

// 69. Tool: List All Registered Users
export const listAllUsersTool = ai.defineTool(
  {
    name: 'listAllUsers',
    description: 'Retrieves the complete organization user directory with roles, access levels, enabled status, and employee IDs.',
    inputSchema: z.object({
      role: z.string().optional().describe('Optional role filter.'),
      accessLevel: z.string().optional().describe('Optional access level filter.'),
      isEnabled: z.boolean().optional().describe('Optional enabled status filter.'),
    }),
    outputSchema: z.object({
      totalUsersCount: z.number(),
      users: z.array(z.any()),
    }),
  },
  async (input) => {
    return await flowpilotListAllUsers(input);
  }
);

// 70. Tool: Query Department Utilization Trends
export const queryDepartmentUtilizationTrendsTool = ai.defineTool(
  {
    name: 'queryDepartmentUtilizationTrends',
    description: 'Aggregates team capacity utilization percentages grouped by department and skill role in Utilization view.',
    inputSchema: z.object({
      department: z.string().optional().describe('Optional department or role filter.'),
    }),
    outputSchema: z.object({
      totalDepartments: z.number(),
      departments: z.array(z.any()),
    }),
  },
  async (input) => {
    return await flowpilotQueryDepartmentUtilizationTrends(input);
  }
);

// 71. Tool: Export Resource Utilization Report
export const exportResourceUtilizationReportTool = ai.defineTool(
  {
    name: 'exportResourceUtilizationReport',
    description: 'Exports complete organization resource utilization sheet with allocation %, free capacity %, active projects, and workload status.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      generatedAt: z.string(),
      totalHeadcount: z.number(),
      utilizationMatrix: z.array(z.any()),
      exportFormat: z.string(),
    }),
  },
  async () => {
    return await flowpilotExportResourceUtilizationReport();
  }
);

// 72. Tool: Bulk Import Holidays
export const bulkImportHolidaysTool = ai.defineTool(
  {
    name: 'bulkImportHolidays',
    description: 'Batch uploads a list of national/regional holidays to the Holiday Calendar in a single operation.',
    inputSchema: z.object({
      holidays: z.array(
        z.object({
          name: z.string().describe('Holiday title/description.'),
          date: z.string().describe('Date in YYYY-MM-DD format.'),
          type: z.enum(['National', 'Regional', 'Optional']).optional().default('National'),
        })
      ),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      importedCount: z.number().optional(),
      holidays: z.array(z.any()).optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotBulkImportHolidays(input);
    } catch (err) {
      result = { success: true, importedCount: input.holidays.length, holidays: input.holidays, url: '/holidays/holiday-calendar', needsClientExecution: true, params: input };
    }
    recordExecutedAction('bulkImportHolidays', result, input);
    return result;
  }
);

// 73. Tool: Update Holiday
export const updateHolidayTool = ai.defineTool(
  {
    name: 'updateHoliday',
    description: 'Modifies an existing holiday name, date, or category in the Holiday Calendar.',
    inputSchema: z.object({
      holidayId: z.string().describe('Holiday document ID.'),
      name: z.string().optional().describe('Updated holiday title.'),
      date: z.string().optional().describe('Updated date in YYYY-MM-DD format.'),
      type: z.enum(['National', 'Regional', 'Optional']).optional(),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      holidayId: z.string(),
      name: z.string().optional(),
      date: z.string().optional(),
      type: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateHoliday(input);
    } catch (err) {
      result = { success: true, ...input, url: '/holidays/holiday-calendar', needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateHoliday', result, input);
    return result;
  }
);

// 74. Tool: Reset Annual Leave Balances
export const resetAnnualLeaveBalancesTool = ai.defineTool(
  {
    name: 'resetAnnualLeaveBalances',
    description: 'Executes annual leave quota rollover and applies carryover limit quotas for all employees.',
    inputSchema: z.object({
      year: z.number().optional().describe('Target reset year (defaults to current year).'),
      carryOverLimit: z.number().optional().default(10).describe('Maximum allowed carryover days.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      year: z.number().optional(),
      carryOverLimit: z.number().optional(),
      message: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotResetAnnualLeaveBalances(input);
    } catch (err) {
      result = { success: true, ...input, url: '/holidays/leave-settings', needsClientExecution: true, params: input };
    }
    recordExecutedAction('resetAnnualLeaveBalances', result, input);
    return result;
  }
);

// 75. Tool: Approve Leave Request
export const approveLeaveRequestTool = ai.defineTool(
  {
    name: 'approveLeaveRequest',
    description: 'Approves a pending employee leave request in Leave Tracker.',
    inputSchema: z.object({
      employeeId: z.string().describe('Employee ID or empId.'),
      leaveId: z.string().describe('Leave record ID.'),
      approverNotes: z.string().optional().describe('Approval comments or notes.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      employeeId: z.string(),
      leaveId: z.string(),
      status: z.string(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotApproveLeaveRequest(input);
    } catch (err) {
      result = { success: true, ...input, status: 'Approved', url: '/holidays/leave-tracker', needsClientExecution: true, params: input };
    }
    recordExecutedAction('approveLeaveRequest', result, input);
    return result;
  }
);

// 76. Tool: Reject Leave Request
export const rejectLeaveRequestTool = ai.defineTool(
  {
    name: 'rejectLeaveRequest',
    description: 'Rejects a pending employee leave request in Leave Tracker with reason.',
    inputSchema: z.object({
      employeeId: z.string().describe('Employee ID or empId.'),
      leaveId: z.string().describe('Leave record ID.'),
      reason: z.string().describe('Explanatory reason for rejecting the leave request.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      employeeId: z.string(),
      leaveId: z.string(),
      status: z.string(),
      reason: z.string().optional(),
      url: z.string().optional(),
      needsClientExecution: z.boolean().optional(),
      params: z.any().optional(),
    }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotRejectLeaveRequest(input);
    } catch (err) {
      result = { success: true, ...input, status: 'Rejected', url: '/holidays/leave-tracker', needsClientExecution: true, params: input };
    }
    recordExecutedAction('rejectLeaveRequest', result, input);
    return result;
  }
);

// 77. Tool: Query Employee Leave Balance
export const queryEmployeeLeaveBalanceTool = ai.defineTool(
  {
    name: 'queryEmployeeLeaveBalance',
    description: 'Checks allocated annual leave quota, used leave days, and real-time remaining leave balance for a specific employee.',
    inputSchema: z.object({
      employeeId: z.string().describe('Employee ID or empId.'),
      year: z.number().optional().describe('Target calendar year.'),
    }),
    outputSchema: z.object({
      employeeId: z.string(),
      empId: z.string(),
      name: z.string(),
      year: z.number(),
      allocatedAnnualQuota: z.number(),
      usedLeaveDays: z.number(),
      remainingLeaveBalance: z.number(),
      leaves: z.array(z.any()),
    }),
  },
  async (input) => {
    return await flowpilotQueryEmployeeLeaveBalance(input);
  }
);

// ==========================================
// PROJECT LEVEL TOOLS (MODULES 1 TO 10)
// ==========================================

// --- MODULE 1: INITIAL ESTIMATION & SPECIFICATIONS ---

export const updateInitialImpactedSystemTool = ai.defineTool(
  {
    name: 'updateInitialImpactedSystem',
    description: 'Updates an initial impacted system estimate or daily rate in the initial estimation phase.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Impacted system ID.'),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['Technology', 'Function']).optional(),
      estimate: z.number().optional().describe('Estimated man-days.'),
      dailyBillingRate: z.number().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateInitialImpactedSystem(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateInitialImpactedSystem', result, input);
    return result;
  }
);

export const deleteInitialImpactedSystemTool = ai.defineTool(
  {
    name: 'deleteInitialImpactedSystem',
    description: 'Deletes an initial impacted system from estimation.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Impacted system ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteInitialImpactedSystem(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteInitialImpactedSystem', result, input);
    return result;
  }
);

export const updateInitialHorizontalTool = ai.defineTool(
  {
    name: 'updateInitialHorizontal',
    description: 'Updates an initial horizontal capability weightage % or billing rate.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Horizontal capability ID.'),
      name: z.string().optional(),
      weightage: z.number().optional().describe('Weightage percentage (e.g. 15 for 15%).'),
      dailyBillingRate: z.number().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateInitialHorizontal(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateInitialHorizontal', result, input);
    return result;
  }
);

export const deleteInitialHorizontalTool = ai.defineTool(
  {
    name: 'deleteInitialHorizontal',
    description: 'Deletes an initial horizontal capability.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Horizontal capability ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteInitialHorizontal(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteInitialHorizontal', result, input);
    return result;
  }
);

export const queryInitialSpecificationsTool = ai.defineTool(
  {
    name: 'queryInitialSpecifications',
    description: 'Queries full initial estimation specifications, dev effort/cost rollups, and horizontals.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ specificationsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryInitialSpecifications(input);
      return { specificationsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { specificationsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const confirmProjectEstimationTool = ai.defineTool(
  {
    name: 'confirmProjectEstimation',
    description: 'Promotes initial estimation specifications to active project baseline and moves project status to Active.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      targetStatus: z.string().optional().describe('Target project status (e.g. "Active").'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotConfirmProjectEstimation(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('confirmProjectEstimation', result, input);
    return result;
  }
);

export const updateInitialProjectDatesTool = ai.defineTool(
  {
    name: 'updateInitialProjectDates',
    description: 'Sets planned start and end dates during initial estimation phase.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      startDate: z.string().describe('Planned start date (YYYY-MM-DD).'),
      endDate: z.string().describe('Planned end date (YYYY-MM-DD).'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateInitialProjectDates(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateInitialProjectDates', result, input);
    return result;
  }
);

export const queryInitialProjectStatusTool = ai.defineTool(
  {
    name: 'queryInitialProjectStatus',
    description: 'Retrieves estimation phase metadata, PM assignment, and timeline.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ statusJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryInitialProjectStatus(input);
      return { statusJson: JSON.stringify(data) };
    } catch (err: any) {
      return { statusJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// --- MODULE 2: PROJECT STATUS, HEALTH & PM DASHBOARD ---

export const updateProjectHealthTool = ai.defineTool(
  {
    name: 'updateProjectHealth',
    description: 'Updates Scope, Cost, Time, and Overall RAG health indicators with commentary.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      overallStatus: z.enum(['Red', 'Amber', 'Green']),
      scopeHealth: z.enum(['Red', 'Amber', 'Green']).optional(),
      costHealth: z.enum(['Red', 'Amber', 'Green']).optional(),
      timeHealth: z.enum(['Red', 'Amber', 'Green']).optional(),
      commentary: z.string().optional().describe('Executive health commentary.'),
      authorName: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateProjectHealth(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateProjectHealth', result, input);
    return result;
  }
);

export const updateProjectDatesTool = ai.defineTool(
  {
    name: 'updateProjectDates',
    description: 'Updates active project start and end dates with validation.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      startDate: z.string().describe('Active start date (YYYY-MM-DD).'),
      endDate: z.string().describe('Active end date (YYYY-MM-DD).'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateProjectDates(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateProjectDates', result, input);
    return result;
  }
);

export const queryProjectStatusDetailsTool = ai.defineTool(
  {
    name: 'queryProjectStatusDetails',
    description: 'Retrieves complete project status info, RAG health indicators, PM assignment, and status audit history.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ projectStatusJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectStatusDetails(input);
      return { projectStatusJson: JSON.stringify(data) };
    } catch (err: any) {
      return { projectStatusJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryProjectPmDashboardTool = ai.defineTool(
  {
    name: 'queryProjectPmDashboard',
    description: 'Retrieves PM dashboard metrics: task distribution, epic progress %, planned vs logged hours.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sprintId: z.string().optional(),
    }),
    outputSchema: z.object({ dashboardJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectPmDashboard(input);
      return { dashboardJson: JSON.stringify(data) };
    } catch (err: any) {
      return { dashboardJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryProjectWorkloadTool = ai.defineTool(
  {
    name: 'queryProjectWorkload',
    description: 'Queries sub-task effort vs bug effort allocated to each team member by sprint.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sprintId: z.string().optional(),
    }),
    outputSchema: z.object({ workloadJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectWorkload(input);
      return { workloadJson: JSON.stringify(data) };
    } catch (err: any) {
      return { workloadJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryProjectResourceFinancialsTool = ai.defineTool(
  {
    name: 'queryProjectResourceFinancials',
    description: 'Computes project billed revenue vs internal cost and margins by role.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      timeframe: z.enum(['Overall', 'Sprint', 'Release']).optional(),
    }),
    outputSchema: z.object({ financialsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectResourceFinancials(input);
      return { financialsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { financialsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const querySwimLaneCycleTimeTool = ai.defineTool(
  {
    name: 'querySwimLaneCycleTime',
    description: 'Calculates average duration spent by items in each Kanban status lane.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ cycleTimeJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQuerySwimLaneCycleTime(input);
      return { cycleTimeJson: JSON.stringify(data) };
    } catch (err: any) {
      return { cycleTimeJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryResourceBottlenecksTool = ai.defineTool(
  {
    name: 'queryResourceBottlenecks',
    description: 'Analyzes cycle times and active WIP per resource with bottleneck risk rankings.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ bottlenecksJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryResourceBottlenecks(input);
      return { bottlenecksJson: JSON.stringify(data) };
    } catch (err: any) {
      return { bottlenecksJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryEpicProgressTool = ai.defineTool(
  {
    name: 'queryEpicProgress',
    description: 'Queries epics with completed stories count and progress percentage.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ epicProgressJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryEpicProgress(input);
      return { epicProgressJson: JSON.stringify(data) };
    } catch (err: any) {
      return { epicProgressJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// --- MODULE 3: ACTIVE SPECIFICATIONS & ENVIRONMENTS ---

export const updateImpactedSystemTool = ai.defineTool(
  {
    name: 'updateImpactedSystem',
    description: 'Updates active impacted system details and man-days.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Impacted system ID.'),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(['Technology', 'Function']).optional(),
      estimate: z.number().optional(),
      dailyBillingRate: z.number().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateImpactedSystem(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateImpactedSystem', result, input);
    return result;
  }
);

export const deleteImpactedSystemTool = ai.defineTool(
  {
    name: 'deleteImpactedSystem',
    description: 'Deletes active impacted system from project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Impacted system ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteImpactedSystem(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteImpactedSystem', result, input);
    return result;
  }
);

export const updateHorizontalTool = ai.defineTool(
  {
    name: 'updateHorizontal',
    description: 'Updates active horizontal capability weightage % or billing rate.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Horizontal ID.'),
      name: z.string().optional(),
      weightage: z.number().optional(),
      dailyBillingRate: z.number().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateHorizontal(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateHorizontal', result, input);
    return result;
  }
);

export const deleteHorizontalTool = ai.defineTool(
  {
    name: 'deleteHorizontal',
    description: 'Deletes active horizontal capability from project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemId: z.string().describe('Horizontal ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteHorizontal(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteHorizontal', result, input);
    return result;
  }
);

export const queryProjectSpecificationsTool = ai.defineTool(
  {
    name: 'queryProjectSpecifications',
    description: 'Retrieves active project specifications, impacted systems, horizontals, and environments.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ specificationsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectSpecifications(input);
      return { specificationsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { specificationsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteEnvironmentTool = ai.defineTool(
  {
    name: 'deleteEnvironment',
    description: 'Removes a testing/deployment environment from the project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      envId: z.string().describe('Environment ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteEnvironment(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteEnvironment', result, input);
    return result;
  }
);

export const reorderEnvironmentsTool = ai.defineTool(
  {
    name: 'reorderEnvironments',
    description: 'Updates the display order sequence of project testing environments.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      orderedEnvIds: z.array(z.string()).describe('Ordered array of environment IDs.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotReorderEnvironments(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('reorderEnvironments', result, input);
    return result;
  }
);

// --- MODULE 4: RESOURCES, WORKLOGS, WORKLOAD & GANTT ---

export const removeProjectResourceTool = ai.defineTool(
  {
    name: 'removeProjectResource',
    description: 'De-allocates and removes a team member resource from the project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      resourceId: z.string().describe('Project resource document ID to remove.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotRemoveProjectResource(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('removeProjectResource', result, input);
    return result;
  }
);

export const updateProjectResourceRoleTool = ai.defineTool(
  {
    name: 'updateProjectResourceRole',
    description: 'Updates a project resource role or allocation percentage.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      resourceId: z.string().describe('Project resource document ID.'),
      role: z.string().optional(),
      allocationPercentage: z.number().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateProjectResourceRole(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateProjectResourceRole', result, input);
    return result;
  }
);

export const queryProjectTeamMembersTool = ai.defineTool(
  {
    name: 'queryProjectTeamMembers',
    description: 'Lists all allocated team members on the project with roles and billing rates.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ teamMembersJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectTeamMembers(input);
      return { teamMembersJson: JSON.stringify(data) };
    } catch (err: any) {
      return { teamMembersJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryProjectWorklogsTool = ai.defineTool(
  {
    name: 'queryProjectWorklogs',
    description: 'Queries timesheet worklogs filtered by employee, date range, or sprint.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      employeeId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
    outputSchema: z.object({ worklogsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectWorklogs(input);
      return { worklogsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { worklogsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteWorklogEntryTool = ai.defineTool(
  {
    name: 'deleteWorklogEntry',
    description: 'Deletes a timesheet worklog entry.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      worklogId: z.string().describe('Worklog ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteWorklogEntry(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteWorklogEntry', result, input);
    return result;
  }
);

export const updateWorklogEntryTool = ai.defineTool(
  {
    name: 'updateWorklogEntry',
    description: 'Modifies logged hours, description, or work type for a timesheet entry.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      worklogId: z.string().describe('Worklog ID.'),
      hours: z.number().optional(),
      description: z.string().optional(),
      workType: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateWorklogEntry(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateWorklogEntry', result, input);
    return result;
  }
);

export const queryProjectResourceWorkloadMatrixTool = ai.defineTool(
  {
    name: 'queryProjectResourceWorkloadMatrix',
    description: 'Returns workload matrix comparing team member capacity against planned hours with overallocation flags.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ workloadMatrixJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectResourceWorkloadMatrix(input);
      return { workloadMatrixJson: JSON.stringify(data) };
    } catch (err: any) {
      return { workloadMatrixJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const reassignWorkloadTool = ai.defineTool(
  {
    name: 'reassignWorkload',
    description: 'Reallocates work items or sub-tasks between resources.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sourceAssigneeId: z.string().describe('Original assignee ID.'),
      targetAssigneeId: z.string().describe('New assignee ID.'),
      targetAssigneeName: z.string().optional(),
      storyIds: z.array(z.string()).optional().describe('Optional specific story IDs to transfer.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotReassignWorkload(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('reassignWorkload', result, input);
    return result;
  }
);

export const queryProjectGanttTimelineTool = ai.defineTool(
  {
    name: 'queryProjectGanttTimeline',
    description: 'Returns chronological Gantt timeline with sprint dates, release milestones, and story schedules.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ ganttJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectGanttTimeline(input);
      return { ganttJson: JSON.stringify(data) };
    } catch (err: any) {
      return { ganttJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const updateGanttTaskDependencyTool = ai.defineTool(
  {
    name: 'updateGanttTaskDependency',
    description: 'Creates predecessor dependency link between tasks for Gantt charting.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      storyId: z.string().describe('Dependent story/task ID.'),
      predecessorStoryId: z.string().describe('Predecessor story/task ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateGanttTaskDependency(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateGanttTaskDependency', result, input);
    return result;
  }
);

// --- MODULE 5: RELEASES & AGILE DEVELOPMENT ---

export const updateReleaseTool = ai.defineTool(
  {
    name: 'updateRelease',
    description: 'Modifies release schedule dates, milestone date, name, or status.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      releaseId: z.string().describe('Release document ID.'),
      name: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      milestoneDate: z.string().optional(),
      status: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateRelease(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateRelease', result, input);
    return result;
  }
);

export const deleteReleaseTool = ai.defineTool(
  {
    name: 'deleteRelease',
    description: 'Deletes a release from project schedule.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      releaseId: z.string().describe('Release ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteRelease(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteRelease', result, input);
    return result;
  }
);

export const queryProjectReleasesTool = ai.defineTool(
  {
    name: 'queryProjectReleases',
    description: 'Lists all project releases, stages, and milestones.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ releasesJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectReleases(input);
      return { releasesJson: JSON.stringify(data) };
    } catch (err: any) {
      return { releasesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const assignStoriesToReleaseTool = ai.defineTool(
  {
    name: 'assignStoriesToRelease',
    description: 'Associates user stories or defects with a specific project release.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      releaseId: z.string().describe('Target release ID.'),
      storyIds: z.array(z.string()).describe('Array of story IDs (e.g. ["ST-1", "ST-2"]).'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotAssignStoriesToRelease(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('assignStoriesToRelease', result, input);
    return result;
  }
);

export const queryDevDashboardSummaryTool = ai.defineTool(
  {
    name: 'queryDevDashboardSummary',
    description: 'Retrieves agile sprint completion rate, velocity points, and open defect counts.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ devSummaryJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryDevDashboardSummary(input);
      return { devSummaryJson: JSON.stringify(data) };
    } catch (err: any) {
      return { devSummaryJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const querySprintBurndownDataTool = ai.defineTool(
  {
    name: 'querySprintBurndownData',
    description: 'Fetches ideal vs actual remaining effort points across active sprint days.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sprintId: z.string().optional(),
    }),
    outputSchema: z.object({ burndownJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQuerySprintBurndownData(input);
      return { burndownJson: JSON.stringify(data) };
    } catch (err: any) {
      return { burndownJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryVelocityMetricsTool = ai.defineTool(
  {
    name: 'queryVelocityMetrics',
    description: 'Computes historical sprint velocity metrics and average velocity points.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ velocityJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryVelocityMetrics(input);
      return { velocityJson: JSON.stringify(data) };
    } catch (err: any) {
      return { velocityJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const reorderBacklogStoriesTool = ai.defineTool(
  {
    name: 'reorderBacklogStories',
    description: 'Updates backlog priority ranking order of user stories.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      orderedStoryIds: z.array(z.string()).describe('Ordered array of story IDs.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotReorderBacklogStories(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('reorderBacklogStories', result, input);
    return result;
  }
);

export const deleteEpicTool = ai.defineTool(
  {
    name: 'deleteEpic',
    description: 'Deletes an Agile Epic and unlinks stories.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      epicId: z.string().describe('Epic ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteEpic(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteEpic', result, input);
    return result;
  }
);

export const queryBacklogStoriesTool = ai.defineTool(
  {
    name: 'queryBacklogStories',
    description: 'Queries backlog stories filtered by epic, priority, or status.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      epicId: z.string().optional(),
      priority: z.string().optional(),
      status: z.string().optional(),
    }),
    outputSchema: z.object({ storiesJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryBacklogStories(input);
      return { storiesJson: JSON.stringify(data) };
    } catch (err: any) {
      return { storiesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteWorkItemTool = ai.defineTool(
  {
    name: 'deleteWorkItem',
    description: 'Soft-deletes a work item moving it to project trash.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      storyIdOrDocId: z.string().describe('The work item identifier (e.g. "ST-1", "BUG-2").'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteWorkItem(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteWorkItem', result, input);
    return result;
  }
);

export const bulkEstimateStoriesTool = ai.defineTool(
  {
    name: 'bulkEstimateStories',
    description: 'Applies estimated hours to multiple backlog items in batch.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      estimates: z.array(z.object({ storyId: z.string(), estimatedHours: z.number() })),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotBulkEstimateStories(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('bulkEstimateStories', result, input);
    return result;
  }
);

export const queryUngroomedStoriesTool = ai.defineTool(
  {
    name: 'queryUngroomedStories',
    description: 'Filters backlog items lacking estimation hours or acceptance criteria.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ ungroomedJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryUngroomedStories(input);
      return { ungroomedJson: JSON.stringify(data) };
    } catch (err: any) {
      return { ungroomedJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const tagStoryAcceptanceCriteriaTool = ai.defineTool(
  {
    name: 'tagStoryAcceptanceCriteria',
    description: 'Adds structured Gherkin (Given/When/Then) acceptance criteria to a user story.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      storyId: z.string().describe('User story ID.'),
      acceptanceCriteria: z.string().describe('Acceptance criteria text.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotTagStoryAcceptanceCriteria(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('tagStoryAcceptanceCriteria', result, input);
    return result;
  }
);

export const queryKanbanBoardStateTool = ai.defineTool(
  {
    name: 'queryKanbanBoardState',
    description: 'Retrieves all active work items grouped into Kanban status columns.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sprintId: z.string().optional(),
    }),
    outputSchema: z.object({ kanbanStateJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryKanbanBoardState(input);
      return { kanbanStateJson: JSON.stringify(data) };
    } catch (err: any) {
      return { kanbanStateJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const updateKanbanWipLimitsTool = ai.defineTool(
  {
    name: 'updateKanbanWipLimits',
    description: 'Sets WIP limits on a Kanban status column.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      columnName: z.string().describe('Column name (e.g. "In Progress").'),
      wipLimit: z.number().describe('Max WIP limit count.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateKanbanWipLimits(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateKanbanWipLimits', result, input);
    return result;
  }
);

export const querySubTasksByStoryTool = ai.defineTool(
  {
    name: 'querySubTasksByStory',
    description: 'Retrieves all sub-tasks linked under a parent user story.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      parentStoryId: z.string().describe('Parent story ID (e.g. "ST-1").'),
    }),
    outputSchema: z.object({ subTasksJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQuerySubTasksByStory(input);
      return { subTasksJson: JSON.stringify(data) };
    } catch (err: any) {
      return { subTasksJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteSubTaskTool = ai.defineTool(
  {
    name: 'deleteSubTask',
    description: 'Deletes a sub-task from parent story.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      subTaskId: z.string().describe('Sub-task ID (e.g. "SUB-1").'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteSubTask(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteSubTask', result, input);
    return result;
  }
);

export const bulkCreateSubTasksTool = ai.defineTool(
  {
    name: 'bulkCreateSubTasks',
    description: 'Generates standard sub-tasks (Frontend, Backend, Unit Tests, Code Review) for a story in batch.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      parentStoryId: z.string().describe('Parent story ID (e.g. "ST-1").'),
      subTasks: z.array(z.object({ title: z.string(), estimatedHours: z.number().optional(), assigneeId: z.string().optional() })),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotBulkCreateSubTasks(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('bulkCreateSubTasks', result, input);
    return result;
  }
);

export const queryProjectDefectsTool = ai.defineTool(
  {
    name: 'queryProjectDefects',
    description: 'Lists project bugs filtered by severity, status, or sprint.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      severity: z.string().optional(),
      status: z.string().optional(),
      sprintId: z.string().optional(),
    }),
    outputSchema: z.object({ defectsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectDefects(input);
      return { defectsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { defectsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const linkDefectToStoryTool = ai.defineTool(
  {
    name: 'linkDefectToStory',
    description: 'Associates a defect/bug with the parent story.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      defectId: z.string().describe('Defect ID (e.g. "BUG-1").'),
      storyId: z.string().describe('Story ID (e.g. "ST-2").'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotLinkDefectToStory(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('linkDefectToStory', result, input);
    return result;
  }
);

export const closeDefectTool = ai.defineTool(
  {
    name: 'closeDefect',
    description: 'Marks defect as verified and closed with resolution summary.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      defectId: z.string().describe('Defect ID.'),
      resolutionSummary: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotCloseDefect(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('closeDefect', result, input);
    return result;
  }
);

// --- MODULE 6: TESTING LIFECYCLE ---

export const queryTestDashboardSummaryTool = ai.defineTool(
  {
    name: 'queryTestDashboardSummary',
    description: 'Retrieves total test cases, execution pass/fail rates, and cycle completion status.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ testSummaryJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTestDashboardSummary(input);
      return { testSummaryJson: JSON.stringify(data) };
    } catch (err: any) {
      return { testSummaryJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryTestExecutionProgressTool = ai.defineTool(
  {
    name: 'queryTestExecutionProgress',
    description: 'Returns test execution burn-up metrics across active cycles.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ progressJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTestExecutionProgress(input);
      return { progressJson: JSON.stringify(data) };
    } catch (err: any) {
      return { progressJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryDefectDensityTool = ai.defineTool(
  {
    name: 'queryDefectDensity',
    description: 'Computes defect density per story and QA leakage rate.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ densityJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryDefectDensity(input);
      return { densityJson: JSON.stringify(data) };
    } catch (err: any) {
      return { densityJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const updateTestCaseTool = ai.defineTool(
  {
    name: 'updateTestCase',
    description: 'Updates test case title, step description, expected outcome, or type.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      testCaseId: z.string().describe('Test case ID (e.g. "TC-1").'),
      title: z.string().optional(),
      description: z.string().optional(),
      expectedResult: z.string().optional(),
      type: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateTestCase(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateTestCase', result, input);
    return result;
  }
);

export const deleteTestCaseTool = ai.defineTool(
  {
    name: 'deleteTestCase',
    description: 'Soft-deletes test case from QA backlog.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      testCaseId: z.string().describe('Test case ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteTestCase(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteTestCase', result, input);
    return result;
  }
);

export const queryTestCasesTool = ai.defineTool(
  {
    name: 'queryTestCases',
    description: 'Queries QA test cases in project filtered by story ID or test type.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      storyId: z.string().optional(),
      type: z.string().optional(),
    }),
    outputSchema: z.object({ testCasesJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTestCases(input);
      return { testCasesJson: JSON.stringify(data) };
    } catch (err: any) {
      return { testCasesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const bulkImportTestCasesTool = ai.defineTool(
  {
    name: 'bulkImportTestCases',
    description: 'Imports test cases from structured JSON datasets in batch.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      testCases: z.array(z.object({ title: z.string(), description: z.string(), expectedResult: z.string(), type: z.string().optional(), storyId: z.string().optional() })),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotBulkImportTestCases(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('bulkImportTestCases', result, input);
    return result;
  }
);

export const updateTestPlanTool = ai.defineTool(
  {
    name: 'updateTestPlan',
    description: 'Modifies test cycle dates, environment, or target release.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      planId: z.string().describe('Test plan ID.'),
      name: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      environmentId: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateTestPlan(input);
    } catch (err: any) {
      result = { success: true, ...input, url: `/projects/${input.projectId}/testing/test-cycle`, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateTestPlan', result, input);
    return result;
  }
);

export const deleteTestPlanTool = ai.defineTool(
  {
    name: 'deleteTestPlan',
    description: 'Deletes test cycle and its execution records.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      planId: z.string().describe('Test plan ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteTestPlan(input);
    } catch (err: any) {
      result = { success: true, ...input, url: `/projects/${input.projectId}/testing/test-cycle`, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteTestPlan', result, input);
    return result;
  }
);

export const queryTestPlansTool = ai.defineTool(
  {
    name: 'queryTestPlans',
    description: 'Lists all test plans and cycles created in project.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ testPlansJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTestPlans(input);
      return { testPlansJson: JSON.stringify(data) };
    } catch (err: any) {
      return { testPlansJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const removeTestCaseFromPlanTool = ai.defineTool(
  {
    name: 'removeTestCaseFromPlan',
    description: 'Removes test case from specific test plan.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      planId: z.string().describe('Test plan ID.'),
      testCaseId: z.string().describe('Test case ID to remove.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotRemoveTestCaseFromPlan(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('removeTestCaseFromPlan', result, input);
    return result;
  }
);

export const queryTestExecutionListTool = ai.defineTool(
  {
    name: 'queryTestExecutionList',
    description: 'Retrieves test cases assigned to a cycle with current execution status.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      planId: z.string().optional(),
    }),
    outputSchema: z.object({ executionListJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTestExecutionList(input);
      return { executionListJson: JSON.stringify(data) };
    } catch (err: any) {
      return { executionListJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const bulkUpdateTestExecutionStatusTool = ai.defineTool(
  {
    name: 'bulkUpdateTestExecutionStatus',
    description: 'Batch marks multiple test cases as Passed, Failed, Blocked, or Skipped.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      testCaseIds: z.array(z.string()).describe('Array of test case IDs.'),
      status: z.enum(['Passed', 'Failed', 'Blocked', 'Skipped']),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotBulkUpdateTestExecutionStatus(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('bulkUpdateTestExecutionStatus', result, input);
    return result;
  }
);

export const logDefectFromTestExecutionTool = ai.defineTool(
  {
    name: 'logDefectFromTestExecution',
    description: 'Automatically creates a Bug linked directly to a failed test case execution.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      testCaseId: z.string().describe('Failed test case ID.'),
      bugTitle: z.string().describe('Defect title.'),
      severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
      description: z.string().describe('Repro steps / failure details.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotLogDefectFromTestExecution(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('logDefectFromTestExecution', result, input);
    return result;
  }
);

export const queryQaDefectsTool = ai.defineTool(
  {
    name: 'queryQaDefects',
    description: 'Queries defects logged during active test cycles filtered by environment.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      environment: z.string().optional(),
    }),
    outputSchema: z.object({ qaDefectsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryQaDefects(input);
      return { qaDefectsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { qaDefectsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const exportDefectsReportTool = ai.defineTool(
  {
    name: 'exportDefectsReport',
    description: 'Exports testing defects summary to structured report format.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ reportJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotExportDefectsReport(input);
      return { reportJson: JSON.stringify(data) };
    } catch (err: any) {
      return { reportJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// --- MODULE 7: GOVERNANCE & RAID MANAGEMENT ---

export const queryRaidDashboardSummaryTool = ai.defineTool(
  {
    name: 'queryRaidDashboardSummary',
    description: 'Executive breakdown of high-impact risks, open issues, unvalidated assumptions, and blocked dependencies.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ raidSummaryJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryRaidDashboardSummary(input);
      return { raidSummaryJson: JSON.stringify(data) };
    } catch (err: any) {
      return { raidSummaryJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const exportRaidLogCsvTool = ai.defineTool(
  {
    name: 'exportRaidLogCsv',
    description: 'Exports complete RAID register to CSV format.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ exportJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotExportRaidLogCsv(input);
      return { exportJson: JSON.stringify(data) };
    } catch (err: any) {
      return { exportJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryProjectRisksTool = ai.defineTool(
  {
    name: 'queryProjectRisks',
    description: 'Returns project risks ranked by risk score (Severity x Probability).',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ risksJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectRisks(input);
      return { risksJson: JSON.stringify(data) };
    } catch (err: any) {
      return { risksJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteRiskTool = ai.defineTool(
  {
    name: 'deleteRisk',
    description: 'Deletes risk entry from RAID log.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      riskId: z.string().describe('Risk ID (e.g. "RSK-1").'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteRisk(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteRisk', result, input);
    return result;
  }
);

export const closeRiskTool = ai.defineTool(
  {
    name: 'closeRisk',
    description: 'Marks risk as mitigated and closed.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      riskId: z.string().describe('Risk ID.'),
      closureNotes: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotCloseRisk(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('closeRisk', result, input);
    return result;
  }
);

export const queryProjectAssumptionsTool = ai.defineTool(
  {
    name: 'queryProjectAssumptions',
    description: 'Lists active and validated project assumptions.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ assumptionsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectAssumptions(input);
      return { assumptionsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { assumptionsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteAssumptionTool = ai.defineTool(
  {
    name: 'deleteAssumption',
    description: 'Deletes assumption entry from RAID log.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      assumptionId: z.string().describe('Assumption ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteAssumption(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteAssumption', result, input);
    return result;
  }
);

export const validateAssumptionTool = ai.defineTool(
  {
    name: 'validateAssumption',
    description: 'Changes assumption status to Validated or Invalidated with validation notes.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      assumptionId: z.string().describe('Assumption ID.'),
      status: z.enum(['Validated', 'Invalidated']),
      validationNotes: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotValidateAssumption(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('validateAssumption', result, input);
    return result;
  }
);

export const queryProjectIssuesTool = ai.defineTool(
  {
    name: 'queryProjectIssues',
    description: 'Returns open project blockers filtered by priority.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      priority: z.string().optional(),
    }),
    outputSchema: z.object({ issuesJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectIssues(input);
      return { issuesJson: JSON.stringify(data) };
    } catch (err: any) {
      return { issuesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteIssueTool = ai.defineTool(
  {
    name: 'deleteIssue',
    description: 'Deletes issue entry from RAID log.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      issueId: z.string().describe('Issue ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteIssue(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteIssue', result, input);
    return result;
  }
);

export const resolveIssueTool = ai.defineTool(
  {
    name: 'resolveIssue',
    description: 'Marks blocker issue as resolved with resolution details.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      issueId: z.string().describe('Issue ID.'),
      resolutionDetails: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotResolveIssue(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('resolveIssue', result, input);
    return result;
  }
);

export const queryProjectDependenciesTool = ai.defineTool(
  {
    name: 'queryProjectDependencies',
    description: 'Lists project dependencies categorized by incoming/outgoing and status.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ dependenciesJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectDependencies(input);
      return { dependenciesJson: JSON.stringify(data) };
    } catch (err: any) {
      return { dependenciesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const deleteDependencyTool = ai.defineTool(
  {
    name: 'deleteDependency',
    description: 'Deletes dependency entry from RAID log.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      dependencyId: z.string().describe('Dependency ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteDependency(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteDependency', result, input);
    return result;
  }
);

export const updateDependencyStatusTool = ai.defineTool(
  {
    name: 'updateDependencyStatus',
    description: 'Sets dependency status to On Track, At Risk, or Blocked.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      dependencyId: z.string().describe('Dependency ID.'),
      status: z.enum(['On Track', 'At Risk', 'Blocked']),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateDependencyStatus(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateDependencyStatus', result, input);
    return result;
  }
);

// --- MODULE 8: PROJECT HOLIDAYS & LEAVE CALENDAR ---

export const overrideProjectHolidayCalendarTool = ai.defineTool(
  {
    name: 'overrideProjectHolidayCalendar',
    description: 'Toggles whether project inherits global holidays or custom project calendar.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      isHolidayOverrideEnabled: z.boolean(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotOverrideProjectHolidayCalendar(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('overrideProjectHolidayCalendar', result, input);
    return result;
  }
);

export const queryProjectSpecificHolidaysTool = ai.defineTool(
  {
    name: 'queryProjectSpecificHolidays',
    description: 'Retrieves custom project holidays when override is enabled.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ holidaysJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectSpecificHolidays(input);
      return { holidaysJson: JSON.stringify(data) };
    } catch (err: any) {
      return { holidaysJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryTeamAbsenceCalendarBySprintTool = ai.defineTool(
  {
    name: 'queryTeamAbsenceCalendarBySprint',
    description: 'Returns planned team absences overlapping with active sprint date ranges.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      sprintId: z.string().describe('The sprint ID.'),
    }),
    outputSchema: z.object({ absenceJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTeamAbsenceCalendarBySprint(input);
      return { absenceJson: JSON.stringify(data) };
    } catch (err: any) {
      return { absenceJson: JSON.stringify({ error: err.message }) };
    }
  }
);

// --- MODULE 9: PMO FINANCIALS, DOCUMENTS & BCP ---

export const uploadPmoDocumentTool = ai.defineTool(
  {
    name: 'uploadPmoDocument',
    description: 'Records project charter, architecture diagram, SOW, or signoff deliverables in project PMO documents.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      name: z.string().describe('Document title.'),
      category: z.enum(['Charter', 'Architecture', 'SOW', 'Signoff', 'Deliverable']),
      fileUrl: z.string().describe('File download or storage URL.'),
      description: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUploadPmoDocument(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('uploadPmoDocument', result, input);
    return result;
  }
);

export const deletePmoDocumentTool = ai.defineTool(
  {
    name: 'deletePmoDocument',
    description: 'Deletes document attachment from project PMO documents.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      documentId: z.string().describe('Document ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeletePmoDocument(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deletePmoDocument', result, input);
    return result;
  }
);

export const queryPmoDocumentsTool = ai.defineTool(
  {
    name: 'queryPmoDocuments',
    description: 'Lists uploaded project documents with categories and dates.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ documentsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryPmoDocuments(input);
      return { documentsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { documentsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const addExternalDocLinkTool = ai.defineTool(
  {
    name: 'addExternalDocLink',
    description: 'Links external SharePoint, Google Drive, or Confluence URLs in PMO repository.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      title: z.string().describe('Document link title.'),
      url: z.string().describe('External URL.'),
      provider: z.enum(['SharePoint', 'Google Drive', 'Confluence', 'Other']),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotAddExternalDocLink(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('addExternalDocLink', result, input);
    return result;
  }
);

export const queryFbBillingSummaryTool = ai.defineTool(
  {
    name: 'queryFbBillingSummary',
    description: 'Retrieves fixed bid contract value, billed amount, and billing schedule.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ billingSummaryJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryFbBillingSummary(input);
      return { billingSummaryJson: JSON.stringify(data) };
    } catch (err: any) {
      return { billingSummaryJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const updateFbContractValueTool = ai.defineTool(
  {
    name: 'updateFbContractValue',
    description: 'Updates total contracted fixed bid revenue amount.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      contractValue: z.number().describe('Total contract value.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateFbContractValue(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateFbContractValue', result, input);
    return result;
  }
);

export const logFbInvoiceTool = ai.defineTool(
  {
    name: 'logFbInvoice',
    description: 'Records an invoice raised against fixed bid milestones.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      milestoneId: z.string().describe('Payment milestone ID.'),
      invoiceNumber: z.string().describe('Invoice reference number.'),
      invoiceAmount: z.number().describe('Invoice dollar amount.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotLogFbInvoice(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('logFbInvoice', result, input);
    return result;
  }
);

export const updatePaymentMilestoneTool = ai.defineTool(
  {
    name: 'updatePaymentMilestone',
    description: 'Modifies milestone name, billing percentage, dollar amount, or status.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      milestoneId: z.string().describe('Payment milestone ID.'),
      name: z.string().optional(),
      billingPercentage: z.number().optional(),
      amount: z.number().optional(),
      status: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdatePaymentMilestone(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updatePaymentMilestone', result, input);
    return result;
  }
);

export const deletePaymentMilestoneTool = ai.defineTool(
  {
    name: 'deletePaymentMilestone',
    description: 'Deletes payment milestone from commercial schedule.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      milestoneId: z.string().describe('Payment milestone ID.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeletePaymentMilestone(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deletePaymentMilestone', result, input);
    return result;
  }
);

export const queryPaymentMilestonesTool = ai.defineTool(
  {
    name: 'queryPaymentMilestones',
    description: 'Returns payment milestones with billing status.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ milestonesJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryPaymentMilestones(input);
      return { milestonesJson: JSON.stringify(data) };
    } catch (err: any) {
      return { milestonesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const markMilestoneInvoiceRaisedTool = ai.defineTool(
  {
    name: 'markMilestoneInvoiceRaised',
    description: 'Transitions milestone to Invoice Raised with invoice reference.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      milestoneId: z.string().describe('Payment milestone ID.'),
      invoiceNumber: z.string().describe('Invoice reference number.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotMarkMilestoneInvoiceRaised(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('markMilestoneInvoiceRaised', result, input);
    return result;
  }
);

export const queryTnmBillingSummaryTool = ai.defineTool(
  {
    name: 'queryTnmBillingSummary',
    description: 'Monthly hours logged across all roles multiplied by daily billed rates.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      month: z.string().optional().describe('Filter month (YYYY-MM).'),
    }),
    outputSchema: z.object({ tnmSummaryJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTnmBillingSummary(input);
      return { tnmSummaryJson: JSON.stringify(data) };
    } catch (err: any) {
      return { tnmSummaryJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const generateMonthlyTnmInvoiceTool = ai.defineTool(
  {
    name: 'generateMonthlyTnmInvoice',
    description: 'Calculates monthly billing invoice amount from approved timesheets.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      month: z.string().describe('Target billing month (YYYY-MM).'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    try {
      const result = await flowpilotGenerateMonthlyTnmInvoice(input);
      recordExecutedAction('generateMonthlyTnmInvoice', result, input);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message } as any;
    }
  }
);

export const updateTnmMilestoneTool = ai.defineTool(
  {
    name: 'updateTnmMilestone',
    description: 'Modifies T&M milestone target amount or status.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      milestoneId: z.string().describe('Milestone ID.'),
      name: z.string().optional(),
      targetAmount: z.number().optional(),
      status: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateTnmMilestone(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateTnmMilestone', result, input);
    return result;
  }
);

export const deleteTnmMilestoneTool = ai.defineTool(
  {
    name: 'deleteTnmMilestone',
    description: 'Deletes T&M milestone.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      milestoneId: z.string().describe('Milestone ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteTnmMilestone(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteTnmMilestone', result, input);
    return result;
  }
);

export const queryTnmMilestonesTool = ai.defineTool(
  {
    name: 'queryTnmMilestones',
    description: 'Retrieves all periodic T&M milestone checkpoints.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ milestonesJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryTnmMilestones(input);
      return { milestonesJson: JSON.stringify(data) };
    } catch (err: any) {
      return { milestonesJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryBcpPlanTool = ai.defineTool(
  {
    name: 'queryBcpPlan',
    description: 'Retrieves project Business Continuity Plan (BCP), key role backups, and emergency procedures.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ bcpJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryBcpPlan(input);
      return { bcpJson: JSON.stringify(data) };
    } catch (err: any) {
      return { bcpJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const updateBcpPrimaryContactsTool = ai.defineTool(
  {
    name: 'updateBcpPrimaryContacts',
    description: 'Configures primary and secondary successor backups for key project roles.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      contacts: z.array(z.object({ role: z.string(), primaryPerson: z.string(), backupPerson: z.string(), contactPhone: z.string().optional() })),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateBcpPrimaryContacts(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateBcpPrimaryContacts', result, input);
    return result;
  }
);

export const logBcpDisasterRecoveryPlanTool = ai.defineTool(
  {
    name: 'logBcpDisasterRecoveryPlan',
    description: 'Updates disaster recovery procedures, backup verification dates, and offsite contacts.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      procedures: z.string().describe('DR recovery steps.'),
      backupVerificationDate: z.string().describe('Verification date (YYYY-MM-DD).'),
      offsiteLocation: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotLogBcpDisasterRecoveryPlan(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('logBcpDisasterRecoveryPlan', result, input);
    return result;
  }
);

// --- MODULE 10: PROJECT SETTINGS & TRASH ---

export const addKanbanColumnTool = ai.defineTool(
  {
    name: 'addKanbanColumn',
    description: 'Adds custom workflow column (e.g. Code Review, Blocked) to Kanban board.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      columnName: z.string().describe('Name of column.'),
      wipLimit: z.number().optional(),
      order: z.number().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotAddKanbanColumn(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('addKanbanColumn', result, input);
    return result;
  }
);

export const deleteKanbanColumnTool = ai.defineTool(
  {
    name: 'deleteKanbanColumn',
    description: 'Deletes custom Kanban column from board.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      columnId: z.string().describe('Column ID to delete.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotDeleteKanbanColumn(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('deleteKanbanColumn', result, input);
    return result;
  }
);

export const updateKanbanColumnsOrderTool = ai.defineTool(
  {
    name: 'updateKanbanColumnsOrder',
    description: 'Reorders sequence of Kanban workflow columns.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      columnOrder: z.array(z.string()).describe('Ordered array of column IDs.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateKanbanColumnsOrder(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateKanbanColumnsOrder', result, input);
    return result;
  }
);

export const queryBoardSettingsTool = ai.defineTool(
  {
    name: 'queryBoardSettings',
    description: 'Retrieves all configured Kanban columns and workflow properties.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ boardSettingsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryBoardSettings(input);
      return { boardSettingsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { boardSettingsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const updateSprintDurationSettingsTool = ai.defineTool(
  {
    name: 'updateSprintDurationSettings',
    description: 'Configures default sprint duration in weeks (1, 2, 3, or 4 weeks).',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      durationWeeks: z.number().int().min(1).max(4).describe('Default sprint duration in weeks (1, 2, 3, or 4)'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateSprintDurationSettings(input as any);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateSprintDurationSettings', result, input);
    return result;
  }
);

export const setSprintStartDayTool = ai.defineTool(
  {
    name: 'setSprintStartDay',
    description: 'Configures default sprint start day of week (Monday, Tuesday, etc.).',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      startDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotSetSprintStartDay(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('setSprintStartDay', result, input);
    return result;
  }
);

export const querySprintSettingsTool = ai.defineTool(
  {
    name: 'querySprintSettings',
    description: 'Retrieves configured default sprint duration and start day.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ sprintSettingsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQuerySprintSettings(input);
      return { sprintSettingsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { sprintSettingsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const updateEffortConversionSettingsTool = ai.defineTool(
  {
    name: 'updateEffortConversionSettings',
    description: 'Updates project conversion units: manMonthToDays, manDayToHours, storyPointToHours.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      manMonthToDays: z.number().optional(),
      manDayToHours: z.number().optional(),
      storyPointToHours: z.number().optional(),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotUpdateEffortConversionSettings(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('updateEffortConversionSettings', result, input);
    return result;
  }
);

export const queryEffortSettingsTool = ai.defineTool(
  {
    name: 'queryEffortSettings',
    description: 'Retrieves configured effort conversion ratios.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ effortSettingsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryEffortSettings(input);
      return { effortSettingsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { effortSettingsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const queryProjectTrashItemsTool = ai.defineTool(
  {
    name: 'queryProjectTrashItems',
    description: 'Lists deleted work items, test cases, and sprints in project trash.',
    inputSchema: z.object({ projectId: z.string().describe('The project ID.') }),
    outputSchema: z.object({ trashItemsJson: z.string() }),
  },
  async (input) => {
    try {
      const data = await flowpilotQueryProjectTrashItems(input);
      return { trashItemsJson: JSON.stringify(data) };
    } catch (err: any) {
      return { trashItemsJson: JSON.stringify({ error: err.message }) };
    }
  }
);

export const restoreProjectTrashItemTool = ai.defineTool(
  {
    name: 'restoreProjectTrashItem',
    description: 'Restores soft-deleted work item, test case, or epic back to active project.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemType: z.enum(['story', 'testCase', 'epic']),
      itemId: z.string().describe('Document ID to restore.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotRestoreProjectTrashItem(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('restoreProjectTrashItem', result, input);
    return result;
  }
);

export const permanentlyDeleteProjectItemTool = ai.defineTool(
  {
    name: 'permanentlyDeleteProjectItem',
    description: 'Permanently purges an item from project database.',
    inputSchema: z.object({
      projectId: z.string().describe('The project ID.'),
      itemType: z.enum(['story', 'testCase', 'epic']),
      itemId: z.string().describe('Document ID to purge.'),
    }),
    outputSchema: z.object({ success: z.boolean(), url: z.string().optional(), needsClientExecution: z.boolean().optional(), params: z.any().optional() }),
  },
  async (input) => {
    let result: any;
    try {
      result = await flowpilotPermanentlyDeleteProjectItem(input);
    } catch (err: any) {
      result = { success: true, ...input, needsClientExecution: true, params: input };
    }
    recordExecutedAction('permanentlyDeleteProjectItem', result, input);
    return result;
  }
);

// All Tools Array
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
  moveProjectToPortfolioTool,
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
  getProjectHomeMetricsTool,
  duplicateProjectTool,
  filterPortfolioDashboardByDateTool,
  exportPortfolioDashboardReportTool,
  exportQualityEstimationsReportTool,
  setQualityVarianceAlertThresholdTool,
  queryDefectTrendByMonthTool,
  queryDefectRootCauseSummaryTool,
  exportBillingOverviewCsvTool,
  queryProjectProfitabilityForecastTool,
  bulkUpdateResourceRatesTool,
  setDefaultRoleBenchmarkRatesTool,
  createUserTool,
  updateUserRoleTool,
  toggleUserStatusTool,
  listAllUsersTool,
  queryDepartmentUtilizationTrendsTool,
  exportResourceUtilizationReportTool,
  bulkImportHolidaysTool,
  updateHolidayTool,
  resetAnnualLeaveBalancesTool,
  approveLeaveRequestTool,
  rejectLeaveRequestTool,
  queryEmployeeLeaveBalanceTool,
  // Project Level Tools
  updateInitialImpactedSystemTool,
  deleteInitialImpactedSystemTool,
  updateInitialHorizontalTool,
  deleteInitialHorizontalTool,
  queryInitialSpecificationsTool,
  confirmProjectEstimationTool,
  updateInitialProjectDatesTool,
  queryInitialProjectStatusTool,
  updateProjectHealthTool,
  updateProjectDatesTool,
  queryProjectStatusDetailsTool,
  queryProjectPmDashboardTool,
  queryProjectWorkloadTool,
  queryProjectResourceFinancialsTool,
  querySwimLaneCycleTimeTool,
  queryResourceBottlenecksTool,
  queryEpicProgressTool,
  updateImpactedSystemTool,
  deleteImpactedSystemTool,
  updateHorizontalTool,
  deleteHorizontalTool,
  queryProjectSpecificationsTool,
  deleteEnvironmentTool,
  reorderEnvironmentsTool,
  removeProjectResourceTool,
  updateProjectResourceRoleTool,
  queryProjectTeamMembersTool,
  queryProjectWorklogsTool,
  deleteWorklogEntryTool,
  updateWorklogEntryTool,
  queryProjectResourceWorkloadMatrixTool,
  reassignWorkloadTool,
  queryProjectGanttTimelineTool,
  updateGanttTaskDependencyTool,
  updateReleaseTool,
  deleteReleaseTool,
  queryProjectReleasesTool,
  assignStoriesToReleaseTool,
  queryDevDashboardSummaryTool,
  querySprintBurndownDataTool,
  queryVelocityMetricsTool,
  reorderBacklogStoriesTool,
  deleteEpicTool,
  queryBacklogStoriesTool,
  deleteWorkItemTool,
  bulkEstimateStoriesTool,
  queryUngroomedStoriesTool,
  tagStoryAcceptanceCriteriaTool,
  queryKanbanBoardStateTool,
  updateKanbanWipLimitsTool,
  querySubTasksByStoryTool,
  deleteSubTaskTool,
  bulkCreateSubTasksTool,
  queryProjectDefectsTool,
  linkDefectToStoryTool,
  closeDefectTool,
  queryTestDashboardSummaryTool,
  queryTestExecutionProgressTool,
  queryDefectDensityTool,
  updateTestCaseTool,
  deleteTestCaseTool,
  queryTestCasesTool,
  bulkImportTestCasesTool,
  updateTestPlanTool,
  deleteTestPlanTool,
  queryTestPlansTool,
  removeTestCaseFromPlanTool,
  queryTestExecutionListTool,
  bulkUpdateTestExecutionStatusTool,
  logDefectFromTestExecutionTool,
  queryQaDefectsTool,
  exportDefectsReportTool,
  queryRaidDashboardSummaryTool,
  exportRaidLogCsvTool,
  queryProjectRisksTool,
  deleteRiskTool,
  closeRiskTool,
  queryProjectAssumptionsTool,
  deleteAssumptionTool,
  validateAssumptionTool,
  queryProjectIssuesTool,
  deleteIssueTool,
  resolveIssueTool,
  queryProjectDependenciesTool,
  deleteDependencyTool,
  updateDependencyStatusTool,
  overrideProjectHolidayCalendarTool,
  queryProjectSpecificHolidaysTool,
  queryTeamAbsenceCalendarBySprintTool,
  uploadPmoDocumentTool,
  deletePmoDocumentTool,
  queryPmoDocumentsTool,
  addExternalDocLinkTool,
  queryFbBillingSummaryTool,
  updateFbContractValueTool,
  logFbInvoiceTool,
  updatePaymentMilestoneTool,
  deletePaymentMilestoneTool,
  queryPaymentMilestonesTool,
  markMilestoneInvoiceRaisedTool,
  queryTnmBillingSummaryTool,
  generateMonthlyTnmInvoiceTool,
  updateTnmMilestoneTool,
  deleteTnmMilestoneTool,
  queryTnmMilestonesTool,
  queryBcpPlanTool,
  updateBcpPrimaryContactsTool,
  logBcpDisasterRecoveryPlanTool,
  addKanbanColumnTool,
  deleteKanbanColumnTool,
  updateKanbanColumnsOrderTool,
  queryBoardSettingsTool,
  updateSprintDurationSettingsTool,
  setSprintStartDayTool,
  querySprintSettingsTool,
  updateEffortConversionSettingsTool,
  queryEffortSettingsTool,
  queryProjectTrashItemsTool,
  restoreProjectTrashItemTool,
  permanentlyDeleteProjectItemTool,
];

// Import and re-export deferred searchTools meta-tool
import { searchToolsTool } from '@/ai/tools/tool-search';
export { searchToolsTool };

// Tool lookup map indexed by canonical name for fast O(1) retrieval
export const flowpilotToolMap = new Map<string, any>(
  allFlowPilotTools.map((t: any) => [t.__action?.name || t.name, t])
);
flowpilotToolMap.set('searchTools', searchToolsTool);
flowpilotToolMap.set('queryProjectContext', queryProjectContextTool);

// Anchor tools always provided in context to ensure baseline grounding & discovery
export const flowpilotAnchorTools = [
  queryProjectContextTool,
  searchToolsTool,
];



