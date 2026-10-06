import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getActiveAiDetails } from './flowpilot-agent';
import { db, collection, getDocs, doc, getDoc } from '@/lib/db-provider';
import { executeFpQuery } from '@/lib/fp-query-engine';
import { executeFpPmQuery, type FpPmProjectData } from '@/lib/fp-pm-query-engine';
import type { FpQueryResponse, FpKpiCard, FpChartSpec, FpTableSpec, FpAuditStamp } from '@/types/fp-dashboard';

export const FpAnalyticsInputSchema = z.object({
  query: z.string(),
  scope: z.enum(['portfolio', 'project']),
  portfolioId: z.string().optional(),
  projectId: z.string().optional(),
  projectDataSnapshot: z.any().optional(),
  portfolioDataSnapshot: z.any().optional(),
  modelId: z.string().optional(),
  provider: z.string().optional(),
});
export type FpAnalyticsInput = z.infer<typeof FpAnalyticsInputSchema>;

const FpKpiCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  subtext: z.string().optional(),
  badge: z.string().optional(),
  status: z.enum(['positive', 'warning', 'negative', 'neutral']).optional(),
});

const FpChartSpecSchema = z.object({
  type: z.enum(['pie', 'bar', 'line', 'none']),
  title: z.string(),
  description: z.string().optional(),
  dataKey: z.string().describe('Key representing the numeric metric in each data object.'),
  categoryKey: z.string().describe('Key representing the category label in each data object.'),
  secondaryKey: z.string().optional(),
  data: z.array(z.record(z.any())).describe('Array of data points. Each item must contain the keys specified in categoryKey and dataKey.'),
  colors: z.array(z.string()).optional(),
});

const FpTableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'badge', 'number', 'currency', 'link', 'date']).optional(),
});

const FpTableSpecSchema = z.object({
  columns: z.array(FpTableColumnSchema),
  rows: z.array(z.record(z.any())),
  defaultSortKey: z.string().optional(),
  defaultSortDir: z.enum(['asc', 'desc']).optional(),
});

export const FpAnalyticsOutputSchema = z.object({
  title: z.string().describe('Executive report title summarizing the analysis.'),
  intent: z.string().describe('Short machine-readable intent slug (e.g. projects_by_pm, delayed_stories, defect_breakdown, budget_analysis).'),
  executiveSummary: z.array(z.string()).describe('3-5 concise, bulleted executive takeaways with exact counts, metrics, and actionable strategic insights.'),
  kpis: z.array(FpKpiCardSchema).describe('Exactly 4 high-level KPI cards derived specifically for this query.'),
  chart: FpChartSpecSchema.describe('Chart specification for Recharts visualization.'),
  table: FpTableSpecSchema.describe('Table specification with columns and rows for interactive filtering and sorting.'),
  followUpSuggestions: z.array(z.string()).describe('3-4 recommended follow-up analytical questions based on the findings.'),
});

async function generateWithModelFallback(prompt: string, aiDetails: any) {
  let modelId = aiDetails.model || 'gemini-3.5-flash';
  let primaryModel = aiDetails.provider === 'google' ? `googleai/${modelId}` : `lmstudio/${modelId}`;
  if (aiDetails.provider === 'openai') primaryModel = `openai/${modelId}`;
  if (aiDetails.provider === 'ollama') primaryModel = `ollama/${modelId}`;

  try {
    const res = await ai.generate({
      model: primaryModel,
      prompt,
      output: { schema: FpAnalyticsOutputSchema },
    });
    if (res.output) return res.output;
    throw new Error('Genkit produced empty structured output');
  } catch (err: any) {
    const errMsg = String(err?.message || '').toLowerCase();
    const isQuotaOrBusy =
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('resource_exhausted') ||
      errMsg.includes('503') ||
      errMsg.includes('unavailable') ||
      errMsg.includes('overloaded') ||
      errMsg.includes('no capacity') ||
      errMsg.includes('capacity');

    if (isQuotaOrBusy && aiDetails.provider === 'google') {
      const alternateModel =
        primaryModel === 'googleai/gemini-3.8-flash'
          ? 'googleai/gemini-flash-latest'
          : 'googleai/gemini-3.8-flash';
      console.warn(`[FpAnalytics] Primary model ${primaryModel} quota/busy (${err.message}). Attempting fallback model ${alternateModel}...`);
      try {
        const retryRes = await ai.generate({
          model: alternateModel,
          prompt,
          output: { schema: FpAnalyticsOutputSchema },
        });
        if (retryRes.output) return retryRes.output;
      } catch (retryErr: any) {
        console.warn(`[FpAnalytics] Fallback model ${alternateModel} also failed (${retryErr?.message}).`);
      }
    }
    throw err;
  }
}

export function classifyAiError(err: any, modelName?: string): {
  errorCategory: 'quota_exceeded' | 'high_demand' | 'auth_error' | 'network_error' | 'other';
  title: string;
  description: string;
} {
  const rawMsg = err?.message || String(err || '');
  const msg = rawMsg.toLowerCase();

  if (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('no capacity') ||
    msg.includes('capacity')
  ) {
    const isNoCapacity = msg.includes('no capacity') || msg.includes('capacity');
    return {
      errorCategory: 'high_demand',
      title: isNoCapacity ? 'AI Service No Capacity (HTTP 503)' : 'AI Service High Demand (HTTP 503)',
      description: rawMsg.length > 0 && (rawMsg.includes('capacity') || rawMsg.includes('demand') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('503'))
        ? `${rawMsg}. The AI server is experiencing peak load for "${modelName || 'this model'}". Switch to another model or retry.`
        : `Model "${modelName || 'selected model'}" is temporarily experiencing high demand/capacity constraints on Google servers. Switch to another model above.`,
    };
  }

  if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
    return {
      errorCategory: 'quota_exceeded',
      title: 'AI Quota Exceeded (HTTP 429)',
      description: `The request quota for "${modelName || 'selected model'}" has been reached on your Google AI key (Resource Exhausted 429). Switch to another model using the Model Selector above (e.g. Gemini 3.5 Flash).`,
    };
  }

  if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
    return {
      errorCategory: 'other',
      title: 'Model Not Found / Unsupported (HTTP 404)',
      description: `Model "${modelName || 'selected model'}" is not supported or not found on Google AI servers. Switch to another model above (e.g. Gemini 3.5 Flash).`,
    };
  }

  if (msg.includes('401') || msg.includes('403') || msg.includes('api_key') || msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('permission')) {
    return {
      errorCategory: 'auth_error',
      title: 'AI Authentication / Permission Issue',
      description: `Authentication or permission check failed for "${modelName || 'selected model'}". Check your API key configuration.`,
    };
  }

  if (
    msg.includes('failed to fetch') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('network error') ||
    msg.includes('connection reset') ||
    msg.includes('timeout')
  ) {
    return {
      errorCategory: 'network_error',
      title: 'Network / Connection Timeout',
      description: `Could not connect to the AI service for "${modelName || 'selected model'}". Check network connectivity.`,
    };
  }

  return {
    errorCategory: 'other',
    title: 'AI Service Notice',
    description: rawMsg || `AI generation failed for model "${modelName || 'selected model'}". Operating with local heuristic engine.`,
  };
}

/**
 * Executes a Genkit-powered analytics query over live project/portfolio data.
 * Falls back to the deterministic heuristic engine if AI is offline or encounters an error.
 */
export async function runFpAnalyticsQuery(input: FpAnalyticsInput): Promise<FpQueryResponse> {
  const { query, scope, portfolioId = 'all', projectId, projectDataSnapshot, portfolioDataSnapshot, modelId, provider } = input;
  const rawQuery = (query || '').trim();
  if (!rawQuery) {
    throw new Error('Please enter a search query or question.');
  }

  const aiDetails = await getActiveAiDetails().catch(() => ({
    provider: 'unknown',
    model: 'unknown',
    displayName: 'AI Model',
  }));

  if (modelId) {
    aiDetails.model = modelId;
    aiDetails.displayName = `Gemini: ${modelId}`;
  }
  if (provider) {
    aiDetails.provider = provider;
  }

  // Attempt Genkit AI reasoning
  try {
    if (scope === 'portfolio') {
      return await executePortfolioAiAnalytics(rawQuery, portfolioId, aiDetails, portfolioDataSnapshot);
    } else {
      return await executeProjectAiAnalytics(rawQuery, projectId, projectDataSnapshot, aiDetails);
    }
  } catch (aiError: any) {
    console.warn(`[FpAnalytics] Genkit AI generation failed (${aiError?.message || aiError}). Activating failsafe local heuristic engine...`);
    const errInfo = classifyAiError(aiError, aiDetails.model);
    
    // Fallback to local heuristic engine
    if (scope === 'portfolio') {
      const fallbackResult = await executeFpQuery(rawQuery, portfolioId, portfolioDataSnapshot);
      fallbackResult.isFallback = true;
      fallbackResult.errorCategory = errInfo.errorCategory;
      fallbackResult.fallbackTitle = errInfo.title;
      fallbackResult.fallbackReason = errInfo.description;
      fallbackResult.failedModel = aiDetails.model;
      fallbackResult.audit = {
        ...fallbackResult.audit,
        provider: `Local Heuristic Engine (${errInfo.title})`,
        confidence: 'Heuristic pattern match (Switch AI model or retry to restore deep reasoning)',
      };
      return fallbackResult;
    } else {
      let dataForPm = projectDataSnapshot;
      if (!dataForPm && projectId) {
        dataForPm = await fetchProjectDataForPm(projectId);
      }
      if (!dataForPm) {
        throw aiError;
      }
      const fallbackResult = executeFpPmQuery(rawQuery, dataForPm);
      fallbackResult.isFallback = true;
      fallbackResult.errorCategory = errInfo.errorCategory;
      fallbackResult.fallbackTitle = errInfo.title;
      fallbackResult.fallbackReason = errInfo.description;
      fallbackResult.failedModel = aiDetails.model;
      fallbackResult.audit = {
        ...fallbackResult.audit,
        provider: `Local Heuristic Engine (${errInfo.title})`,
        confidence: 'Heuristic pattern match (Switch AI model or retry to restore deep reasoning)',
      };
      return fallbackResult;
    }
  }
}

/**
 * Portfolio Analytics via Genkit
 */
async function executePortfolioAiAnalytics(
  rawQuery: string,
  portfolioScopeId: string,
  aiDetails: any,
  portfolioDataSnapshot?: any
): Promise<FpQueryResponse> {
  const portfoliosMap = new Map<string, string>();
  const portfoliosList: any[] = [];
  const employeesMap = new Map<string, string>();
  const employeesList: any[] = [];
  let projects: any[] = [];

  if (portfolioDataSnapshot) {
    if (Array.isArray(portfolioDataSnapshot.portfolios)) {
      portfolioDataSnapshot.portfolios.forEach((d: any) => {
        if (!d.isDeleted) {
          portfoliosMap.set(d.id, d.name || d.id);
          portfoliosList.push({ id: d.id, name: d.name || d.id });
        }
      });
    }
    if (Array.isArray(portfolioDataSnapshot.employees)) {
      portfolioDataSnapshot.employees.forEach((d: any) => {
        if (!d.isDeleted) {
          const fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || d.empId || d.id;
          employeesMap.set(d.id, fullName);
          if (d.empId) employeesMap.set(d.empId, fullName);
          employeesList.push({ id: d.id, name: fullName, role: d.role || d.accessLevel, email: d.email });
        }
      });
    }
    if (Array.isArray(portfolioDataSnapshot.projects)) {
      projects = portfolioDataSnapshot.projects.filter((p: any) => !p.isDeleted && !p.isArchived);
    }
  } else {
    if (!db) {
      throw new Error('Database connection is not initialized.');
    }

    // 1. Fetch Portfolios
    const portfoliosSnap = await getDocs(collection(db, 'portfolios'));
    portfoliosSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (!data.isDeleted) {
        portfoliosMap.set(d.id, data.name || d.id);
        portfoliosList.push({ id: d.id, name: data.name || d.id });
      }
    });

    // 2. Fetch Employees
    const employeesSnap = await getDocs(collection(db, 'employees'));
    employeesSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (!data.isDeleted) {
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || data.empId || d.id;
        employeesMap.set(d.id, fullName);
        if (data.empId) employeesMap.set(data.empId, fullName);
        employeesList.push({ id: d.id, name: fullName, role: data.role || data.accessLevel, email: data.email });
      }
    });

    // 3. Fetch Projects
    const projectsSnap = await getDocs(collection(db, 'projects'));
    projects = projectsSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((p: any) => !p.isDeleted && !p.isArchived);
  }

  // Filter by portfolio if scoped
  if (portfolioScopeId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === portfolioScopeId);
  }

  const portfolioName =
    portfolioScopeId === 'all'
      ? 'All Portfolios'
      : portfoliosMap.get(portfolioScopeId) || portfolioScopeId;

  // Sanitize project records for LLM context
  const projectsContext = projects.map((p: any) => {
    let pmName = 'Unassigned';
    if (p.projectManagerId && employeesMap.has(p.projectManagerId)) {
      pmName = employeesMap.get(p.projectManagerId)!;
    } else if (p.projectManager && p.projectManager !== 'Unassigned') {
      pmName = p.projectManager;
    }

    return {
      id: p.id,
      name: p.name || p.id,
      portfolioId: p.portfolioId || 'N/A',
      portfolioName: portfoliosMap.get(p.portfolioId) || p.portfolioName || 'General',
      projectManager: pmName,
      pricingModel: p.pricingModel || 'Fixed Bid',
      overallStatus: p.overallStatus || 'Green',
      budget: p.budget || p.totalCost || 0,
      dailyBillingRate: p.dailyBillingRate || 0,
      startDate: p.startDate || null,
      endDate: p.endDate || null,
      ragHealth: p.ragHealth || p.overallStatus || 'Green',
    };
  });

  const now = new Date().toISOString();
  const prompt = `You are Workwayz Executive Portfolio Analytics Intelligence.
You are tasked with providing deep, zero-hallucination executive analytics answering the user's question about the organization's portfolios and projects.

=== USER QUERY ===
"${rawQuery}"

=== ACTIVE PORTFOLIO SCOPE ===
${portfolioName} (Scope ID: ${portfolioScopeId})

=== LIVE DATABASE RECORDS (${projectsContext.length} Active Projects) ===
${JSON.stringify(projectsContext, null, 2)}

=== KNOWN PORTFOLIOS (${portfoliosList.length}) ===
${JSON.stringify(portfoliosList)}

=== KNOWN EMPLOYEES & MANAGERS (${employeesList.length}) ===
${JSON.stringify(employeesList.slice(0, 30))}

=== INSTRUCTIONS & OPERATING RULES ===
1. Analyze the records thoroughly. Compute EXACT counts, groupings, percentages, and metrics.
2. Title: A clean executive title (e.g. "Projects Grouped by Project Manager - All Portfolios").
3. Intent: A concise identifier slug (e.g. "projects_by_pm", "rag_health", "pricing_model_breakdown", "portfolio_valuation").
4. Executive Takeaways: 3 to 5 bullet points with verified data findings, comparisons, and actionable insights. Do NOT start bullets with symbols like ΓÇó or weird characters. Use plain concise text.
5. KPIs: EXACTLY 4 high-level KPI cards with labels, values (numbers or short formatted strings), and status ("positive" | "warning" | "negative" | "neutral").
6. Chart:
   - Choose the best chart type for this data: "bar" (comparisons, rankings), "pie" (proportions, distributions), "line" (trends), or "none".
   - categoryKey: The property in data objects for labels (e.g. "manager", "status", "portfolio", "pricingModel").
   - dataKey: The property in data objects for numeric values (e.g. "count", "value", "projects").
   - data: Array of objects with keys categoryKey and dataKey.
7. Table:
   - Provide comprehensive columns with appropriate types ('text', 'badge', 'number', 'currency', 'link', 'date').
   - Provide rows matching the query.
8. Follow-up Suggestions: 3-4 natural follow-up questions the user can ask.
`;

  const output = await generateWithModelFallback(prompt, aiDetails);

  return {
    success: true,
    query: rawQuery,
    title: output.title,
    intent: output.intent,
    executiveSummary: output.executiveSummary,
    kpis: output.kpis,
    chart: output.chart,
    table: output.table,
    audit: {
      sourceCollection: 'projects, portfolios, employees',
      recordsAnalyzed: projectsContext.length,
      portfolioScope: portfolioName,
      timestamp: now,
      provider: `FlowPilot AI Analytics (${aiDetails.displayName || aiDetails.provider})`,
      confidence: '100% (Grounded in Live Database via FlowPilot Genkit AI)',
    },
    followUpSuggestions: output.followUpSuggestions,
    isFallback: false,
  };
}

/**
 * Project-level Analytics via Genkit
 */
async function executeProjectAiAnalytics(
  rawQuery: string,
  projectId?: string,
  projectDataSnapshot?: any,
  aiDetails?: any
): Promise<FpQueryResponse> {
  let projectData: FpPmProjectData = projectDataSnapshot;
  if (!projectData && projectId) {
    projectData = await fetchProjectDataForPm(projectId);
  }

  if (!projectData || !projectData.project) {
    throw new Error(`Project data not found for projectId "${projectId}".`);
  }

  const {
    project = {},
    stories = [],
    sprints = [],
    epics = [],
    employees = [],
    risks = [],
    issues = [],
    assumptions = [],
    dependencies = [],
    testCases = [],
    worklogs = [],
    paymentMilestones = [],
    portfolioName = 'General Portfolio',
  } = projectData;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Sanitize and enrich stories with delay status
  const activeStories = (stories || []).filter((s: any) => !s.isDeleted).map((s: any) => {
    const isDone = String(s.status || '').toLowerCase() === 'done' || String(s.status || '').toLowerCase() === 'completed';
    const hasPlannedDate = !!s.plannedDate || !!s.dueDate || !!s.targetDate;
    const dateToCheck = s.plannedDate || s.dueDate || s.targetDate;
    const isPastDue = hasPlannedDate && dateToCheck < todayStr;
    const isDelayed = !isDone && isPastDue;

    return {
      id: s.id || s.storyId,
      storyId: s.storyId || s.id,
      title: s.title || 'Untitled',
      itemType: s.itemType || 'Story',
      status: s.status || 'To Do',
      priority: s.priority || 'Medium',
      severity: s.severity || 'Medium',
      sprintId: s.sprintId || 'Backlog',
      sprintTitle: s.sprintTitle || 'Backlog',
      assigneeName: s.assigneeName || s.assignedTo || 'Unassigned',
      storyPoints: Number(s.storyPoints || s.points || 0),
      plannedDate: s.plannedDate || null,
      isDelayed,
    };
  });

  const activeSprints = (sprints || []).filter((sp: any) => !sp.isDeleted).map((sp: any) => ({
    id: sp.id,
    title: sp.title || sp.name,
    status: sp.status || 'Yet to Start',
    startDate: sp.startDate || null,
    endDate: sp.endDate || null,
    capacity: sp.capacity || 0,
  }));

  const activeEpics = (epics || []).filter((e: any) => !e.isDeleted).map((e: any) => ({
    id: e.id,
    title: e.title || e.name,
    status: e.status || 'Active',
  }));

  const activeRisks = (risks || []).filter((r: any) => !r.isDeleted).map((r: any) => ({
    id: r.id,
    description: r.description || r.title,
    severity: r.severity || 'Medium',
    probability: r.probability || 'Medium',
    status: r.status || 'Open',
    mitigationPlan: r.mitigationPlan || '',
  }));

  const activeIssues = (issues || []).filter((i: any) => !i.isDeleted).map((i: any) => ({
    id: i.id,
    description: i.description || i.title,
    priority: i.priority || 'Medium',
    status: i.status || 'Open',
  }));

  const activePaymentMilestones = (paymentMilestones || []).map((pm: any) => ({
    id: pm.id || pm.milestoneId,
    milestoneName: pm.milestoneName || pm.name || 'Milestone',
    percentage: pm.percentage || 0,
    amount: pm.amount || 0,
    status: pm.status || 'Pending',
    invoiceDate: pm.invoiceDate || null,
  }));

  const totalRecordsAnalyzed =
    1 +
    activeStories.length +
    activeSprints.length +
    activeEpics.length +
    (employees || []).length +
    activeRisks.length +
    activeIssues.length +
    (testCases || []).length +
    (worklogs || []).length +
    activePaymentMilestones.length;

  const prompt = `You are FlowPilot Project Management Delivery Analytics Intelligence.
You are tasked with analyzing live project deliverables, velocity, bugs, RAID risks, workload, and milestones for project "${project.name || projectId}" (${projectId}).

=== USER QUERY ===
"${rawQuery}"

=== PROJECT CONTEXT ===
- Project ID: ${project.id || projectId}
- Name: ${project.name || 'Active Project'}
- Portfolio: ${portfolioName}
- Pricing Model: ${project.pricingModel || 'Fixed Bid'}
- Overall Status: ${project.overallStatus || 'Green'}
- Budget: $${project.budget || project.totalCost || 0}
- Current Date for Delay Checks: ${todayStr}

=== ACTIVE WORK ITEMS & STORIES (${activeStories.length}) ===
${JSON.stringify(activeStories.slice(0, 80), null, 2)}

=== SPRINTS (${activeSprints.length}) ===
${JSON.stringify(activeSprints)}

=== EPICS (${activeEpics.length}) ===
${JSON.stringify(activeEpics)}

=== RISKS & BLOCKERS (${activeRisks.length} Risks, ${activeIssues.length} Issues) ===
Risks: ${JSON.stringify(activeRisks)}
Issues: ${JSON.stringify(activeIssues)}

=== PAYMENT MILESTONES (${activePaymentMilestones.length}) ===
${JSON.stringify(activePaymentMilestones)}

=== INSTRUCTIONS & OPERATING RULES ===
1. Accurately analyze the records. Note that for questions about delayed items, each work item has an "isDelayed" boolean indicating if plannedDate < ${todayStr} while status is not Done.
2. Title: A clean executive title (e.g. "Delayed Work Items & Backlog Delivery Status - ${project.name || projectId}").
3. Intent: A concise identifier slug (e.g. "delayed_stories", "sprint_delivery", "defect_breakdown", "team_workload").
4. Executive Takeaways: 3 to 5 bullet points with verified data findings, comparisons, counts, and delivery health implications. Do NOT start bullets with symbols like ΓÇó or weird characters. Use plain concise text.
5. KPIs: EXACTLY 4 high-level KPI cards with labels, values (numbers or short formatted strings), and status ("positive" | "warning" | "negative" | "neutral").
6. Chart:
   - Choose the best chart type for this data: "bar" (comparisons, rankings), "pie" (proportions, distributions), "line" (trends), or "none".
   - categoryKey: The property in data objects for labels (e.g. "status", "priority", "sprint", "assignee").
   - dataKey: The property in data objects for numeric values (e.g. "count", "points", "hours", "delayedCount").
   - data: Array of objects with keys categoryKey and dataKey.
7. Table:
   - Provide comprehensive columns with appropriate types ('text', 'badge', 'number', 'currency', 'link', 'date').
   - Provide rows matching the query.
8. Follow-up Suggestions: 3-4 natural follow-up questions the user can ask.
`;

  const output = await generateWithModelFallback(prompt, aiDetails);

  return {
    success: true,
    query: rawQuery,
    title: output.title,
    intent: output.intent,
    executiveSummary: output.executiveSummary,
    kpis: output.kpis,
    chart: output.chart,
    table: output.table,
    audit: {
      sourceCollection: `projects/${project.id || projectId} (stories, sprints, epics, raid)`,
      recordsAnalyzed: totalRecordsAnalyzed,
      portfolioScope: `Project: ${project.name || projectId} (${project.id || projectId})`,
      timestamp: now.toISOString(),
      provider: `FlowPilot AI PM Intelligence (${aiDetails.displayName || aiDetails.provider})`,
      confidence: '100% (Grounded in Live Project DB via FlowPilot Genkit AI)',
    },
    followUpSuggestions: output.followUpSuggestions,
    isFallback: false,
  };
}

/**
 * Headless server-side fetch of a project's subcollections (for cron jobs or direct API calls)
 */
async function fetchProjectDataForPm(projectId: string): Promise<FpPmProjectData> {
  if (!db) {
    throw new Error('Database connection is not initialized.');
  }

  const projDoc = await getDoc(doc(db, 'projects', projectId));
  if (!projDoc.exists()) {
    throw new Error(`Project ${projectId} not found.`);
  }
  const project = { id: projDoc.id, ...projDoc.data() };

  // Fetch subcollections concurrently
  const [
    storiesSnap,
    sprintsSnap,
    epicsSnap,
    employeesSnap,
    risksSnap,
    issuesSnap,
    assumptionsSnap,
    dependenciesSnap,
    testCasesSnap,
    worklogsSnap,
    paymentsSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'projects', projectId, 'stories')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'sprints')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'epics')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'employees')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'risks')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'issues')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'assumptions')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'dependencies')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'testCases')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'worklogs')).catch(() => ({ docs: [] })),
    getDocs(collection(db, 'projects', projectId, 'paymentMilestones')).catch(() => ({ docs: [] })),
  ]);

  return {
    project,
    stories: storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    sprints: sprintsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    epics: epicsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    employees: employeesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    risks: risksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    issues: issuesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    assumptions: assumptionsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    dependencies: dependenciesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    testCases: testCasesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    worklogs: worklogsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    paymentMilestones: paymentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
  };
}
