import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { allFlowPilotTools, toolExecutionStore } from './flowpilot-tools';

export const FlowPilotMessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']),
  content: z.string(),
});
export type FlowPilotMessage = z.infer<typeof FlowPilotMessageSchema>;

export const FlowPilotAgentInputSchema = z.object({
  messages: z.array(FlowPilotMessageSchema),
  currentProjectId: z.string().optional(),
  currentProjectName: z.string().optional(),
  activeProjectSnapshot: z.any().optional(),
  currentUser: z
    .object({
      empId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      accessLevel: z.string().optional(),
    })
    .optional(),
});
export type FlowPilotAgentInput = z.infer<typeof FlowPilotAgentInputSchema>;

export const FlowPilotActionItemSchema = z.object({
  toolName: z.string(),
  type: z.string().optional(),
  id: z.string().optional(),
  itemId: z.string().optional(),
  storyId: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  priority: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  projectId: z.string().optional(),
  url: z.string().optional(),
  needsClientExecution: z.boolean().optional(),
  params: z.any().optional(),
});
export type FlowPilotActionItem = z.infer<typeof FlowPilotActionItemSchema>;

export const AiDetailsSchema = z.object({
  provider: z.string(),
  model: z.string(),
  endpoint: z.string().optional(),
  displayName: z.string().optional(),
});
export type AiDetails = z.infer<typeof AiDetailsSchema>;

export const FlowPilotAgentOutputSchema = z.object({
  reply: z.string(),
  executedActions: z.array(FlowPilotActionItemSchema).optional(),
  aiDetails: AiDetailsSchema.optional(),
});
export type FlowPilotAgentOutput = z.infer<typeof FlowPilotAgentOutputSchema>;

// Aliases for backwards compatibility
export type HermesMessage = FlowPilotMessage;
export type HermesAgentInput = FlowPilotAgentInput;
export type HermesActionItem = FlowPilotActionItem;
export type HermesAgentOutput = FlowPilotAgentOutput;

export async function getActiveAiDetails(): Promise<AiDetails> {
  let p = process.env.NEXT_PUBLIC_AI_PROVIDER || 'google';
  let model = process.env.AI_DEFAULT_MODEL || '';
  let endpoint = process.env.LOCAL_AI_BASE_URL || '';

  // Check connections.json fallback
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const connsPath = path.join(process.cwd(), 'connections.json');
      if (fs.existsSync(connsPath)) {
        const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
        const activeAi = conns.ai?.find((item: any) => item.isActive) || conns.ai?.[0];
        if (activeAi) {
          if (activeAi.provider) p = activeAi.provider;
          if (activeAi.model) model = activeAi.model;
          if (activeAi.baseUrl) endpoint = activeAi.baseUrl;
        }
      }
    } catch (e) {
      // Non-fatal
    }
  }

  // If LM Studio, query LM Studio /v1/models to see the exact loaded model name in real time
  if (p === 'lmstudio') {
    const baseUrl = endpoint || 'http://localhost:1234/v1';
    try {
      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const loadedModel = data.data[0].id || data.data[0].name;
          if (loadedModel) {
            model = loadedModel;
          }
        }
      }
    } catch (err) {
      // LM Studio not running or unreachable, keep configured model name
    }
  } else if (p === 'ollama') {
    const baseUrl = endpoint || 'http://localhost:11434';
    try {
      const psRes = await fetch(`${baseUrl}/api/ps`, { signal: AbortSignal.timeout(1500) });
      if (psRes.ok) {
        const psData = await psRes.json();
        if (psData.models && psData.models.length > 0) {
          model = psData.models[0].name;
        }
      }
    } catch (e) {
      // Non-fatal
    }
  }

  // Provider-aware model sanitization and validation
  if (p === 'google') {
    if (!model || model === 'local-model' || !model.startsWith('gemini-')) {
      model = 'gemini-2.5-flash';
    }
  } else if (p === 'openai') {
    if (!model || model === 'local-model' || model.startsWith('gemini-')) {
      model = 'gpt-4o';
    }
  } else if (p === 'anthropic') {
    if (!model || !model.startsWith('claude-')) {
      model = 'claude-3-5-sonnet';
    }
  } else if (p === 'lmstudio') {
    if (!model || model.startsWith('gemini-')) {
      model = 'meta/muse-glimmer';
    }
  } else if (p === 'ollama') {
    if (!model || model.startsWith('gemini-') || model === 'local-model') {
      model = 'llama3';
    }
  }

  const cleanModelName = model.replace(/^googleai\//, '').replace(/^openai\//, '').replace(/^lmstudio\//, '').replace(/^ollama\//, '');

  let displayName = `${cleanModelName}`;
  if (p === 'lmstudio') displayName = `LM Studio: ${cleanModelName}`;
  else if (p === 'ollama') displayName = `Ollama: ${cleanModelName}`;
  else if (p === 'google') displayName = `Gemini: ${cleanModelName}`;
  else if (p === 'openai') displayName = `OpenAI: ${cleanModelName}`;
  else if (p === 'anthropic') displayName = `Anthropic: ${cleanModelName}`;

  return {
    provider: p,
    model: cleanModelName,
    endpoint: endpoint || (p === 'lmstudio' ? 'http://localhost:1234/v1' : p === 'ollama' ? 'http://localhost:11434' : undefined),
    displayName,
  };
}

export async function runFlowPilotAgent(input: FlowPilotAgentInput): Promise<FlowPilotAgentOutput> {
  const { messages, currentProjectId, currentProjectName, currentUser, activeProjectSnapshot } = input;
  const aiDetails = await getActiveAiDetails();

  let liveSnapshotContext = '';
  if (activeProjectSnapshot) {
    const s = activeProjectSnapshot;
    liveSnapshotContext = `
=== LIVE PROJECT DATA (AUTHENTICATED SNAPSHOT) ===
- Project ID: "${s.id}" | Name: "${s.name}" | Status: "${s.status}"
- Executive Summary: ${s.summary || 'None set yet'}
- Project Description: ${s.description || 'None set yet'}
- Impacted Systems (${s.impactedSystems?.length || 0}):
${s.impactedSystems && s.impactedSystems.length > 0 ? s.impactedSystems.map((sys: any) => `  * [${sys.category || 'Technology'}] "${sys.name}": ${sys.description || 'No description'} (Estimate: ${sys.estimate || 0} man-days, Rate: $${sys.dailyBillingRate || 0})`).join('\n') : '  None'}
- Horizontals (${s.horizontals?.length || 0}):
${s.horizontals && s.horizontals.length > 0 ? s.horizontals.map((h: any) => `  * "${h.name}": ${h.weightage || 0}% weightage (Rate: $${h.dailyBillingRate || 0})`).join('\n') : '  None'}
- Existing Work Items / Stories (${s.stories?.length || 0}):
${s.stories && s.stories.length > 0 ? s.stories.map((st: any) => `  * ${st.storyId || st.id}: "${st.title}" (${st.itemType || 'Story'}, Status: ${st.status || 'To Do'}, Priority: ${st.priority || 'Medium'})`).join('\n') : '  None'}
- Sprints: ${s.sprints && s.sprints.length > 0 ? s.sprints.map((sp: any) => `${sp.title} (${sp.status})`).join(', ') : 'None'}
- Epics: ${s.epics && s.epics.length > 0 ? s.epics.map((ep: any) => ep.title).join(', ') : 'None'}
`;
  }

  const systemInstruction = `You are FlowPilot, the autonomous AI Project Management Copilot built natively inside ProjectFlow.
You assist engineering leads, project managers, QA testers, PMO directors, and team members with seamless management of software projects.

=== PROJECTFLOW ARCHITECTURE & HIERARCHY ===
1. **Portfolios (Root Containers)**:
   - Formatted as "PF001", "PF002", "PF003"...
   - Names are strictly unique (case-insensitive).
   - Contains 1 or more Projects.
2. **Projects (Core Management Containers)**:
   - Formatted as "P" + Current Year + 5 Digits: "P2600001", "P2600002"...
   - Belong to a Portfolio (via portfolioId).
   - Contain subcollections: stories, epics, sprints, testCases, testPlans, risks, assumptions, issues, dependencies, kanbanColumns, settings, environments.
3. **Work Items (User Stories, Bugs, Tasks, Feature Changes, Sub-Tasks)**:
   - Stored in "projects/{projectId}/stories".
   - ID Conventions:
     * User Stories / Requirements: "ST-1", "ST-2", "ST-3"...
     * Bugs / Defects: "BUG-1", "BUG-2", "BUG-3"...
     * Tasks: "TASK-1", "TASK-2"...
     * Feature Changes: "FC-1", "FC-2"...
     * Sub Tasks: "SUB-1", "SUB-2"...
   - Status Flow: "To Do" -> "In Progress" -> "In QA" -> "Done".
   - Priority: "Critical", "High", "Medium", "Low", "Backburner".
   - Bug Severity: "Critical", "High", "Medium", "Low".
4. **Specifications & Initial Estimation (Project Summary, Impacted Systems, Horizontals)**:
   - Project Summary: High-level overview stored directly on the Project document.
   - Impacted Systems: Architecture components / modules impacted by the project with Category ("Technology" or "Function"), estimated effort in man-days, and daily billing rate (USD).
   - Horizontals: Cross-cutting capabilities (e.g. "QA & Testing", "Architecture & Design", "Compliance & Legal", "DevOps & Infrastructure") with Weightage (%) and daily billing rate (USD).
5. **Agile Epics & Sprints**:
   - Epics: Group related user stories.
   - Sprints: 2-week timeboxes ("Yet to Start", "Current", "Completed", "Cancelled"). Tool "updateSprint" can change status (e.g. start sprint, complete sprint) and dates. Tool "assignStoryToSprint" assigns stories/bugs/tasks to sprints.
6. **QA & Testing**:
   - Test Cases (Test Backlog / Test Cases): Tool "createTestCase" creates a single test case with ID "TC-X". Tool "bulkCreateTestCases" creates or generates multiple test cases (e.g. 5-10 test cases) in a single batch operation with steps, expected results, and type ("Functional" / "Non-functional").
   - Test Cycles / Plans: Tool "createTestPlan" creates a test cycle (e.g. "Sprint 1 SIT", "v1.0 Regression") with ID "TP-X" on "Dev", "SIT", "UAT", or "Production".
   - Test Execution & Cycle Assignment: Tool "addTestCasesToTestPlan" adds test cases into a test plan/cycle. Tool "updateTestCaseStatus" records test case execution results ("Passed", "Failed", "Blocked", "Skipped", "Not Run").
7. **RAID Governance Log**:
   - Risks ("RSK-1"...): Severity 1-3, Probability 1-3, mitigationPlan. Tool "updateRaidItem" updates mitigations or closes risks.
   - Assumptions ("ASM-1"...): Category ("Technical", "Resource", "Business", "External"), Status ("Active", "Validated", "Invalidated").
   - Issues ("ISS-1"...): Priority ("Critical", "High", "Medium", "Low"), Status ("Open", "In Progress", "Resolved", "Closed").
   - Dependencies ("DEP-1"...): Type ("Internal", "External"), Status ("On Track", "At Risk", "Blocked"), dependencyOn, expectedByDate.
8. **Releases & Milestones**:
   - Releases ("REL-1"...), Stages ("S-1"...), Milestones ("M-1"...). Tool "createRelease".
   - Payment Milestones ("PM-1"...): Tool "createPaymentMilestone" with percentage, amount, status.
9. **Resources & Timesheets**:
   - Tool "assignProjectResource": Assigns engineers (Developer, Tester, Architect, BA, PM) to the project with billing rates and onboarding dates.
   - Tool "logWork": Logs hours for timesheets against stories, tasks, or meetings.
10. **Environments, Repositories & Financials**:
    - Tool "addEnvironment": Adds Dev, SIT, UAT, Staging, or Production environments.
    - Tool "addCodeRepository": Links Git repository URLs.
    - Tool "addFixedCost": Adds one-time or monthly software licenses / cloud costs.

=== ACTIVE CONTEXT ===
- Inference Engine: ${aiDetails.displayName} (${aiDetails.provider})
- Current Project ID: ${currentProjectId ? `"${currentProjectId}"` : 'None (Global Workspace Scope)'}
- Current Project Name: ${currentProjectName ? `"${currentProjectName}"` : 'None'}
- Current User: ${currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}` : 'User'} (${currentUser?.accessLevel || 'Team Member'})
${liveSnapshotContext}

=== STRICT OPERATING RULES & GUIDELINES ===
1. **MANDATORY TOOL INVOCATION**:
   - You MUST call the appropriate tool when fulfilling any user request (e.g. "updateProjectSpecifications", "createWorkItem", "createSprint", "createTestCase", "bulkCreateTestCases", "createTestPlan", "archiveProject", "applyLeave", etc.).
   - Text descriptions alone do NOT save to the database. The database updates ONLY when you generate tool calls.
   - If the user asks you to write or set up project specifications/summary for a business domain, do NOT just output text: YOU MUST CALL "updateProjectSpecifications" with the generated summary, 4-6 relevant impactedSystems, and horizontals!
2. **QA & Test Case Generation**:
   - When the user asks to create or generate test cases (e.g. "Generate test cases for login", "Create 5 test cases for story ST-1", "Add test cases for checkout"):
     * Call "bulkCreateTestCases" (when generating multiple test cases) or "createTestCase" (for a single test case) with clear titles, detailed step-by-step descriptions, and expected results.
     * If the user mentions a specific user story (e.g. ST-1), pass storyId="ST-1" to link them.
   - When the user asks to create a test plan or add test cases to a cycle:
     * Call "createTestPlan" to create the test cycle.
     * Call "addTestCasesToTestPlan" to add test cases into the cycle for execution.
   - When the user asks to update execution status (e.g. "Mark TC-1 as Passed"):
     * Call "updateTestCaseStatus" with the appropriate status ("Passed", "Failed", "Blocked", "Skipped").
3. **CRITICAL - Active Project Context vs Project Creation**:
   - The user is currently working inside Project "${currentProjectName || 'Active Project'}" (${currentProjectId ? `ID: ${currentProjectId}` : 'Global Scope'}).
   - When an active project is selected (${currentProjectId ? `"${currentProjectId}"` : 'None'}), NEVER call "createProject" when the user describes an application, platform, specifications, summary, features, or test cases. They are specifying the content for the CURRENT active project "${currentProjectName || ''}"!
   - Instead, use "updateProjectSpecifications", "bulkCreateTestCases", "createWorkItem", or "updateProjectDetails" with projectId="${currentProjectId || ''}".
   - ONLY call "createProject" if the user explicitly says "Create a new separate project named X".
4. **Specifications, Summary & Estimation**:
   - When the user asks to "Add the summary to the project and save it", call "updateProjectDetails" (or "updateProjectSpecifications") with "summary" for projectId="${currentProjectId || ''}".
   - When the user asks to add Impacted Systems, call "addImpactedSystem" or "updateProjectSpecifications" with the list of impacted systems (name, category, estimate in man-days, dailyBillingRate).
   - When the user asks to add Horizontals, call "addHorizontal" or "updateProjectSpecifications" with the list of horizontals (name, weightage %, dailyBillingRate).
   - NEVER create Kanban Stories or Tasks (ST-1, TASK-1) when the user asks to set the project summary, impacted systems, or horizontals!
5. **Sprint & Backlog Operations**:
   - To assign a story/bug to a sprint, call "assignStoryToSprint".
   - To start or complete a sprint, call "updateSprint" with status="Current" or status="Completed".
6. **Portfolio & Project Hierarchy**:
   - If the user explicitly asks to create a Project inside a Portfolio (e.g. "Create project Raman in Fintech portfolio" or "Add a project under Mobile Apps"), call "createProject" with name="Raman" and pass the portfolio ID.
   - NEVER call "createPortfolio" if the user only requested to create a project in an existing portfolio.
7. **Portfolio Dashboards, Billing, Utilization & Leaves**:
   - Executive & Project Home: Use "getProjectHomeMetrics" to query total projects, active/archived/health breakdown; "duplicateProject" to clone projects; "filterPortfolioDashboardByDate" to filter trends by date range; "exportPortfolioDashboardReport" to generate executive summary reports.
   - Quality Estimations & Defects: Use "exportQualityEstimationsReport" for man-day variance data; "setQualityVarianceAlertThreshold" to set variance alert thresholds; "queryDefectTrendByMonth" for monthly defect trends; "queryDefectRootCauseSummary" for root cause breakdown.
   - Billing & Rates: Use "exportBillingOverviewCsv" for financial overview; "queryProjectProfitabilityForecast" for margin forecasting; "bulkUpdateResourceRates" to update multiple resource rates; "setDefaultRoleBenchmarkRates" for role benchmarks.
   - User Directory & Utilization: Use "createUser", "updateUserRole", "toggleUserStatus", "listAllUsers" for employee directory management; "queryDepartmentUtilizationTrends" and "exportResourceUtilizationReport" for utilization sheets.
   - Holidays & Leaves: Use "bulkImportHolidays", "updateHoliday" for calendar; "resetAnnualLeaveBalances" for annual rollovers; "approveLeaveRequest", "rejectLeaveRequest", "queryEmployeeLeaveBalance" for leave management.
8. **Project Level Tools (Modules 1-10)**:
   - Initial Estimation: "updateInitialImpactedSystem", "deleteInitialImpactedSystem", "updateInitialHorizontal", "deleteInitialHorizontal", "queryInitialSpecifications", "confirmProjectEstimation", "updateInitialProjectDates", "queryInitialProjectStatus".
   - Status & PM Dashboard: "updateProjectHealth", "updateProjectDates", "queryProjectStatusDetails", "queryProjectPmDashboard", "queryProjectWorkload", "queryProjectResourceFinancials", "querySwimLaneCycleTime", "queryResourceBottlenecks", "queryEpicProgress".
   - Specifications & Environments: "updateImpactedSystem", "deleteImpactedSystem", "updateHorizontal", "deleteHorizontal", "queryProjectSpecifications", "deleteEnvironment", "reorderEnvironments".
   - Resources, Worklogs & Gantt: "removeProjectResource", "updateProjectResourceRole", "queryProjectTeamMembers", "queryProjectWorklogs", "deleteWorklogEntry", "updateWorklogEntry", "queryProjectResourceWorkloadMatrix", "reassignWorkload", "queryProjectGanttTimeline", "updateGanttTaskDependency".
   - Releases & Agile Development: "updateRelease", "deleteRelease", "queryProjectReleases", "assignStoriesToRelease", "queryDevDashboardSummary", "querySprintBurndownData", "queryVelocityMetrics", "reorderBacklogStories", "deleteEpic", "queryBacklogStories", "deleteWorkItem", "bulkEstimateStories", "queryUngroomedStories", "tagStoryAcceptanceCriteria", "queryKanbanBoardState", "updateKanbanWipLimits", "querySubTasksByStory", "deleteSubTask", "bulkCreateSubTasks", "queryProjectDefects", "linkDefectToStory", "closeDefect".
   - Testing Lifecycle: "queryTestDashboardSummary", "queryTestExecutionProgress", "queryDefectDensity", "updateTestCase", "deleteTestCase", "queryTestCases", "bulkImportTestCases", "updateTestPlan", "deleteTestPlan", "queryTestPlans", "removeTestCaseFromPlan", "queryTestExecutionList", "bulkUpdateTestExecutionStatus", "logDefectFromTestExecution", "queryQaDefects", "exportDefectsReport".
   - Governance & RAID: "queryRaidDashboardSummary", "exportRaidLogCsv", "queryProjectRisks", "deleteRisk", "closeRisk", "queryProjectAssumptions", "deleteAssumption", "validateAssumption", "queryProjectIssues", "deleteIssue", "resolveIssue", "queryProjectDependencies", "deleteDependency", "updateDependencyStatus".
   - Holidays & Leaves: "overrideProjectHolidayCalendar", "queryProjectSpecificHolidays", "queryTeamAbsenceCalendarBySprint".
   - PMO Financials & Documents: "uploadPmoDocument", "deletePmoDocument", "queryPmoDocuments", "addExternalDocLink", "queryFbBillingSummary", "updateFbContractValue", "logFbInvoice", "updatePaymentMilestone", "deletePaymentMilestone", "queryPaymentMilestones", "markMilestoneInvoiceRaised", "queryTnmBillingSummary", "generateMonthlyTnmInvoice", "updateTnmMilestone", "deleteTnmMilestone", "queryTnmMilestones", "queryBcpPlan", "updateBcpPrimaryContacts", "logBcpDisasterRecoveryPlan".
   - Project Settings & Trash: "addKanbanColumn", "deleteKanbanColumn", "updateKanbanColumnsOrder", "queryBoardSettings", "updateSprintDurationSettings", "setSprintStartDay", "querySprintSettings", "updateEffortConversionSettings", "queryEffortSettings", "queryProjectTrashItems", "restoreProjectTrashItem", "permanentlyDeleteProjectItem".
9. **Tool Execution**:
   - Execute the appropriate tool immediately when an action is requested.
   - Return a crisp, professional confirmation summarizing the created/updated item with its ID and attributes.`;

  // Format messages for Genkit
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  const historyMessages = messages.slice(0, -1).map((m) => ({
    role: m.role === 'model' ? ('model' as const) : ('user' as const),
    content: [{ text: m.content }],
  }));

  try {
    const executedActions: FlowPilotActionItem[] = [];

    let modelId = aiDetails.model;
    let genkitModel = aiDetails.provider === 'google' ? `googleai/${modelId}` : `lmstudio/${modelId}`;
    if (aiDetails.provider === 'openai') genkitModel = `openai/${modelId}`;
    if (aiDetails.provider === 'ollama') genkitModel = `ollama/${modelId}`;

    const generateOptions: any = {
      model: genkitModel,
      system: systemInstruction,
      prompt: lastUserMessage,
      tools: allFlowPilotTools,
    };

    if (historyMessages.length > 0) {
      generateOptions.messages = historyMessages;
    }

    let response: any;

    response = await toolExecutionStore.run(executedActions, async () => {
      try {
        return await ai.generate(generateOptions);
      } catch (genErr: any) {
        const errMsg = (genErr.message || '').toLowerCase();
        const isOverloadedOr503 =
          errMsg.includes('503') ||
          errMsg.includes('unavailable') ||
          errMsg.includes('high demand') ||
          errMsg.includes('overloaded') ||
          errMsg.includes('resource exhausted');

        if (isOverloadedOr503 && aiDetails.provider === 'google' && genkitModel !== 'googleai/gemini-2.5-flash') {
          console.warn(`Model ${genkitModel} is busy (${genErr.message}). Retrying with gemini-2.5-flash fallback...`);
          generateOptions.model = 'googleai/gemini-2.5-flash';
          return await ai.generate(generateOptions);
        } else {
          throw genErr;
        }
      }
    });

    // Also inspect any additional tool responses from generation response messages
    if (response?.messages) {
      for (const msg of response.messages) {
        if (msg.content) {
          for (const part of msg.content as any[]) {
            if (part.toolResponse) {
              const toolName = part.toolResponse.name;
              const output = part.toolResponse.output;
              if (output && typeof output === 'object') {
                const alreadyAdded = executedActions.some(
                  (a) => a.toolName === toolName && (a.id === output.id || a.title === output.title || a.name === output.name)
                );
                if (!alreadyAdded) {
                  executedActions.push({
                    toolName,
                    ...output,
                  });
                }
              }
            }
          }
        }
      }
    }

    return {
      reply: response?.text || 'I have completed your request.',
      executedActions: executedActions.length > 0 ? executedActions : undefined,
      aiDetails,
    };
  } catch (error: any) {
    console.error('FlowPilot Agent Flow Error:', error);
    throw error;
  }
}

export const flowpilotAgentFlow = ai.defineFlow(
  {
    name: 'flowpilotAgentFlow',
    inputSchema: FlowPilotAgentInputSchema,
    outputSchema: FlowPilotAgentOutputSchema,
  },
  async (input) => {
    return await runFlowPilotAgent(input);
  }
);

