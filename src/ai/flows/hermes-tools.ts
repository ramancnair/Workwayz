import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  hermesCreateWorkItem,
  hermesUpdateWorkItem,
  hermesCreateProject,
  hermesCreateEpic,
  hermesCreateSprint,
  hermesCreateTestCase,
  hermesCreateRaidItem,
  hermesQueryProjectContext,
  hermesListProjects,
  hermesCreatePortfolio,
  hermesListPortfolios,
} from '@/lib/hermes-db-server';

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
      return await hermesCreateWorkItem(input);
    } catch (err: any) {
      // Return client-executable payload if server permissions are restricted
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
      return await hermesUpdateWorkItem(input);
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
      name: z.string().describe('Name of the portfolio (e.g. "Fintech Solutions", "Hermes", "Mobile Apps").'),
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
      return await hermesCreatePortfolio(input);
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
      const portfolios = await hermesListPortfolios();
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
      'Creates a new project in ProjectFlow workspace under a portfolio, initializing default Kanban columns, settings, and environments.',
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
      return await hermesCreateProject(input);
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
      return await hermesCreateEpic(input);
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
      return await hermesCreateSprint(input);
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
      return await hermesCreateTestCase(input);
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
      return await hermesCreateRaidItem(input as any);
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
      'Queries live project state (stories, bugs, sprints, epics, test cases, risks, issues) or lists all projects so Hermes can answer queries accurately.',
    inputSchema: z.object({
      projectId: z.string().optional().describe('The project ID to query. If omitted, returns global portfolio overview.'),
    }),
    outputSchema: z.object({
      dataJson: z.string().describe('JSON stringified project context data.'),
    }),
  },
  async (input) => {
    try {
      const data = await hermesQueryProjectContext(input.projectId);
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
      const projects = await hermesListProjects();
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

export const allHermesTools = [
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
  createTestCaseTool,
  createRaidItemTool,
  queryProjectDataContextTool,
  listProjectsTool,
];

