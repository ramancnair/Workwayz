import type { FpQueryResponse, FpKpiCard, FpAuditStamp } from '@/types/wayfinder-dashboard';
import { isBugWorkItem } from '@/types';

function formatDateStr(d?: string | null): string {
  if (!d) return 'Not Specified';
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return String(d);
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(d);
  }
}

export interface FpPmProjectData {
  project: any;
  stories: any[];
  sprints: any[];
  epics: any[];
  employees: any[];
  allUsers?: any[];
  risks: any[];
  issues: any[];
  assumptions: any[];
  dependencies: any[];
  testCases: any[];
  worklogs: any[];
  paymentMilestones: any[];
  releases: any[];
  impactedSystems?: any[];
  portfolioName?: string;
}

export function executeFpPmQuery(
  rawQuery: string,
  data: FpPmProjectData
): FpQueryResponse {
  const queryText = (rawQuery || '').trim();
  if (!queryText) {
    throw new Error('Please enter a search query or question.');
  }

  const {
    project = {},
    stories = [],
    sprints = [],
    epics = [],
    employees = [],
    allUsers = [],
    risks = [],
    issues = [],
    assumptions = [],
    dependencies = [],
    testCases = [],
    worklogs = [],
    paymentMilestones = [],
    releases = [],
    portfolioName: providedPortfolioName,
  } = data;

  const projectName = project?.name || 'Current Project';
  const projectId = project?.id || '';
  const pricingModel = project?.pricingModel || 'Fixed Bid';
  const overallHealth = project?.overallStatus || 'Green';
  const portfolioName =
    providedPortfolioName ||
    project?.portfolioName ||
    project?.portfolioId ||
    'General Portfolio';
  const portfolioId = project?.portfolioId || 'N/A';
  const lowerQuery = queryText.toLowerCase();

  // Active non-deleted stories
  const activeStories = stories.filter((s: any) => !s.isDeleted);
  const activeBugs = activeStories.filter((s: any) => isBugWorkItem(s.itemType) || s.itemType === 'Defect');
  const activeRisks = risks.filter((r: any) => !r.isDeleted);
  const activeIssues = issues.filter((i: any) => !i.isDeleted);
  const activeSprints = sprints.filter((sp: any) => !sp.isDeleted);
  const activeEpics = epics.filter((e: any) => !e.isDeleted);

  const totalRecordsAnalyzed =
    (project?.id ? 1 : 0) +
    activeStories.length +
    activeSprints.length +
    activeEpics.length +
    employees.length +
    activeRisks.length +
    activeIssues.length +
    testCases.length +
    worklogs.length +
    paymentMilestones.length;

  const now = new Date().toISOString();
  const baseAudit: FpAuditStamp = {
    sourceCollection: `projects/${projectId} (stories, sprints, epics, team, raid, worklogs)`,
    recordsAnalyzed: totalRecordsAnalyzed,
    portfolioScope: `Project: ${projectName} (${projectId})`,
    timestamp: now,
    provider: 'WayFinder Deterministic PM Engine',
    confidence: '100% (Grounded in Project DB, Zero Hallucination)',
  };

  // Intent Classification
  const isPortfolioQuery = /\b(portfolio|portfolios|program)\b/i.test(lowerQuery);
  const isManagerQuery =
    /\b(pm|project manager|manager|who manages|who leads|leadership|lead)\b/i.test(lowerQuery) &&
    !/workload|distribution|logged hours/i.test(lowerQuery);
  const isTimelineQuery =
    /\b(start date|end date|timeline|schedule|dates|when does|duration|deadline)\b/i.test(lowerQuery);
  const isProjectProfileQuery =
    isPortfolioQuery ||
    isManagerQuery ||
    isTimelineQuery ||
    /\b(overview|about this project|project details|project info|project summary|who is|what is this project|metadata|profile)\b/i.test(
      lowerQuery
    );

  const isSprintQuery = /sprint|velocity|burndown|sprint progress|sprints|current sprint/i.test(lowerQuery);
  const isBugQuery = /defect|defects|bug|bugs|quality|test case|qa|failed test|leakage|severity/i.test(lowerQuery);
  const isRaidQuery = /risk|risks|issue|issues|blocker|blockers|assumption|assumptions|dependency|dependencies|raid/i.test(lowerQuery);
  const isTeamQuery = /workload|team|allocation|member|members|employee|developer|logged|worklog|hours|capacity|assignee|staff/i.test(lowerQuery);
  const isEpicQuery = /epic|epics|feature|features|initiative|milestone/i.test(lowerQuery) && !/payment/i.test(lowerQuery);
  const isFinancialQuery = /billing|financial|revenue|budget|cost|profit|margin|money|burn|pricing|milestone payment/i.test(lowerQuery);
  const isStoryQuery = /story|stories|task|tasks|backlog|kanban|status|to do|in progress|done|blocked|priority/i.test(lowerQuery);

  const isOffTopic =
    /weather|president|capital of|recipe|who won|world cup|joke|movie|song|celebrity|bitcoin price|crypto/i.test(lowerQuery) &&
    !isProjectProfileQuery &&
    !isSprintQuery &&
    !isBugQuery &&
    !isRaidQuery &&
    !isTeamQuery &&
    !isEpicQuery &&
    !isFinancialQuery &&
    !isStoryQuery;

  if (isOffTopic) {
    return {
      success: true,
      query: queryText,
      title: 'Query Out of Project Scope',
      intent: 'unsupported_or_off_topic',
      executiveSummary: [
        `No matching project records found in ${projectName} for this query.`,
        'The Project PromptBoard is strictly grounded in your active project tasks, sprints, epics, team, RAID items, and worklog records to guarantee zero hallucinations.',
        'Try inquiring about sprint progress, backlog status, open bugs, critical risks, team workload, or payment milestones.',
      ],
      kpis: [
        { id: 'kpi-0', label: 'Database Match', value: '0 records', status: 'warning', subtext: 'Query not in project schema' },
        { id: 'kpi-1', label: 'Project Stories', value: activeStories.length, status: 'positive', subtext: 'Available for querying' },
      ],
      chart: {
        type: 'none',
        title: 'No Visual Data',
        dataKey: 'count',
        categoryKey: 'category',
        data: [],
      },
      table: {
        columns: [
          { key: 'topic', label: 'Supported Project Subject' },
          { key: 'sampleQuery', label: 'Example Question' },
        ],
        rows: [
          { topic: 'Portfolio & Profile', sampleQuery: 'What is the portfolio name of this project' },
          { topic: 'Sprint Delivery', sampleQuery: 'Show current sprint progress and velocity' },
          { topic: 'Stories & Tasks', sampleQuery: 'Show stories and tasks grouped by status' },
          { topic: 'Defects & Quality', sampleQuery: 'List open bugs and defect severity breakdown' },
          { topic: 'RAID Governance', sampleQuery: 'List critical risks, blockers and open issues' },
          { topic: 'Team Workload', sampleQuery: 'Show team workload and planned vs logged hours' },
          { topic: 'Epics Progress', sampleQuery: 'Show epics completion percentage' },
        ],
      },
      audit: {
        ...baseAudit,
        recordsAnalyzed: 0,
        confidence: 'Off-topic Guardrail Triggered',
      },
      followUpSuggestions: [
        'What is the portfolio name of this project',
        'Show current sprint progress and velocity',
        'Show stories and tasks grouped by status',
        'List open bugs and defect severity breakdown',
        'List critical risks, blockers and open issues',
      ],
    };
  }

  // --- 0. PROJECT PROFILE, PORTFOLIO & LEADERSHIP METADATA ---
  if (isProjectProfileQuery) {
    const allStaff = [...(employees || []), ...(allUsers || [])];
    const pmUser = allStaff.find(
      (u: any) => u.id === project?.projectManagerId || u.empId === project?.projectManagerId
    );
    const pmName = pmUser
      ? `${pmUser.firstName || ''} ${pmUser.lastName || ''}`.trim() || pmUser.email || project?.projectManagerId
      : project?.projectManagerId || 'Not Assigned';

    const formattedProjectValue = project?.projectValue
      ? `$${Number(project.projectValue).toLocaleString()}`
      : 'Not Specified';

    let queryTitle = `Project Profile & Overview - ${projectName}`;
    let primarySummary = `Project "${projectName}" (${projectId}) belongs to the "${portfolioName}" portfolio.`;

    if (isPortfolioQuery) {
      queryTitle = `Portfolio Alignment - ${projectName}`;
      primarySummary = `Project "${projectName}" (${projectId}) is assigned to portfolio "${portfolioName}" (Portfolio ID: ${portfolioId}).`;
    } else if (isManagerQuery) {
      queryTitle = `Project Leadership - ${projectName}`;
      primarySummary = `The Project Manager for "${projectName}" is ${pmName}.`;
    } else if (isTimelineQuery) {
      queryTitle = `Timeline & Schedule - ${projectName}`;
      primarySummary = `Project "${projectName}" is scheduled from ${formatDateStr(project?.startDate)} to ${formatDateStr(project?.endDate)}.`;
    }

    const profileKpis: FpKpiCard[] = [
      {
        id: 'kpi-portfolio',
        label: 'Portfolio Name',
        value: portfolioName,
        subtext: portfolioId !== 'N/A' ? `ID: ${portfolioId}` : 'Aligned Portfolio',
        status: 'positive',
      },
      {
        id: 'kpi-pm',
        label: 'Project Manager',
        value: pmName,
        subtext: project?.projectManagerId ? `ID: ${project.projectManagerId}` : 'Lead PM',
        status: 'neutral',
      },
      {
        id: 'kpi-health',
        label: 'Overall Health',
        value: overallHealth,
        subtext: `Pricing: ${pricingModel}`,
        status: overallHealth === 'Green' ? 'positive' : overallHealth === 'Amber' ? 'warning' : 'negative',
      },
      {
        id: 'kpi-timeline',
        label: 'Timeline',
        value: formatDateStr(project?.startDate),
        subtext: `Target End: ${formatDateStr(project?.endDate)}`,
        status: 'neutral',
      },
    ];

    const chartData = [
      { category: 'Stories & Tasks', count: activeStories.length },
      { category: 'Epics', count: activeEpics.length },
      { category: 'Sprints', count: activeSprints.length },
      { category: 'Team Members', count: employees.length },
      { category: 'RAID Items', count: activeRisks.length + activeIssues.length },
      { category: 'Milestones', count: paymentMilestones.length },
    ];

    const tableRows = [
      { attribute: 'Portfolio Name', value: portfolioName, category: 'Portfolio Alignment' },
      { attribute: 'Portfolio ID', value: portfolioId, category: 'Portfolio Alignment' },
      { attribute: 'Project Name', value: projectName, category: 'Project Identity' },
      { attribute: 'Project ID', value: projectId, category: 'Project Identity' },
      { attribute: 'Project Manager', value: pmName, category: 'Governance & Leadership' },
      { attribute: 'Delivery Health (RAG)', value: overallHealth, category: 'Governance & Leadership' },
      { attribute: 'Pricing Model', value: pricingModel, category: 'Financials & Valuation' },
      { attribute: 'Project Valuation', value: formattedProjectValue, category: 'Financials & Valuation' },
      { attribute: 'Start Date', value: formatDateStr(project?.startDate), category: 'Timeline & Schedule' },
      { attribute: 'End Date', value: formatDateStr(project?.endDate), category: 'Timeline & Schedule' },
      { attribute: 'Active Sprints', value: `${activeSprints.length} sprint(s)`, category: 'Workload & Delivery' },
      { attribute: 'Total Work Items', value: `${activeStories.length} story/task record(s)`, category: 'Workload & Delivery' },
      { attribute: 'Open RAID Items', value: `${activeRisks.length} risks, ${activeIssues.length} issues`, category: 'Risk & Quality' },
      { attribute: 'Project Summary', value: project?.summary || project?.description || 'No summary entered', category: 'Project Identity' },
    ];

    return {
      success: true,
      query: queryText,
      title: queryTitle,
      intent: 'project_profile_and_metadata',
      executiveSummary: [
        primarySummary,
        `Overall project delivery health is classified as ${overallHealth} under the ${pricingModel} commercial model.`,
        `Leadership: Managed by ${pmName}. Start date: ${formatDateStr(project?.startDate)}, Target completion: ${formatDateStr(project?.endDate)}.`,
        `Active workload contains ${activeStories.length} story/task record(s) across ${activeSprints.length} sprint(s) and ${employees.length} assigned team member(s).`,
      ],
      kpis: profileKpis,
      chart: {
        type: 'bar',
        title: 'Project Asset & Deliverable Inventory',
        description: 'Record distribution across project modules',
        dataKey: 'count',
        categoryKey: 'category',
        data: chartData,
        colors: ['#6366f1'],
      },
      table: {
        columns: [
          { key: 'attribute', label: 'Attribute / Property', type: 'text' },
          { key: 'value', label: 'Value / Setting', type: 'text' },
          { key: 'category', label: 'Category', type: 'badge' },
        ],
        rows: tableRows,
        defaultSortKey: 'category',
        defaultSortDir: 'asc',
      },
      audit: {
        ...baseAudit,
        sourceCollection: `projects/${projectId}, portfolios`,
        portfolioScope: `Project: ${projectName} (${projectId}) | Portfolio: ${portfolioName}`,
      },
      followUpSuggestions: [
        'Show current sprint progress, velocity, and delivery status',
        'Show stories and tasks grouped by status and priority',
        'List open bugs and defect severity breakdown',
        'List critical risks, blockers, and open issues',
        'Show team workload and planned vs logged hours',
      ],
    };
  }

  // --- 1. SPRINT & VELOCITY ---
  if (isSprintQuery) {
    const sprintMap = new Map<string, { sprint: any; stories: any[]; completed: number; total: number; points: number; completedPoints: number }>();

    activeSprints.forEach((sp: any) => {
      sprintMap.set(sp.id, {
        sprint: sp,
        stories: [],
        completed: 0,
        total: 0,
        points: 0,
        completedPoints: 0,
      });
    });

    let unassignedToSprint = 0;
    activeStories.forEach((st: any) => {
      const spId = st.sprintId;
      const pts = Number(st.storyPoints) || Number(st.estimate) || 1;
      const isDone = st.status === 'Done' || st.status === 'Completed' || st.status === 'Closed';

      if (spId && sprintMap.has(spId)) {
        const item = sprintMap.get(spId)!;
        item.stories.push(st);
        item.total++;
        item.points += pts;
        if (isDone) {
          item.completed++;
          item.completedPoints += pts;
        }
      } else {
        unassignedToSprint++;
      }
    });

    const rows = Array.from(sprintMap.values()).map(({ sprint, total, completed, points, completedPoints }) => {
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        id: sprint.id,
        sprintId: sprint.sprintId || sprint.id,
        title: sprint.title || sprint.name || 'Unnamed Sprint',
        status: sprint.status || 'Planned',
        totalStories: total,
        completedStories: completed,
        pendingStories: total - completed,
        totalPoints: points,
        completedPoints,
        progressPct: `${pct}%`,
        link: `/projects/${projectId}/development/kanban`,
      };
    });

    const chartData = rows.map((r) => ({
      name: r.title.length > 16 ? r.title.slice(0, 16) + '...' : r.title,
      fullName: r.title,
      Completed: r.completedStories,
      Remaining: r.pendingStories,
      Total: r.totalStories,
    }));

    const activeSprintItem = rows.find((r) => r.status.toLowerCase() === 'active') || rows[0];
    const totalSprints = rows.length;
    const completedSprintsCount = rows.filter((r) => r.status.toLowerCase() === 'completed').length;
    const totalStoryPoints = rows.reduce((acc, r) => acc + r.totalPoints, 0);

    const kpis: FpKpiCard[] = [
      {
        id: 'kpi-sprints-total',
        label: 'Total Sprints',
        value: totalSprints,
        subtext: `${completedSprintsCount} completed`,
        status: 'positive',
      },
      {
        id: 'kpi-active-sprint',
        label: 'Active Sprint',
        value: activeSprintItem ? activeSprintItem.title : 'None Active',
        subtext: activeSprintItem ? `Progress: ${activeSprintItem.progressPct}` : 'No active sprint',
        status: activeSprintItem ? 'positive' : 'warning',
      },
      {
        id: 'kpi-points',
        label: 'Total Story Points',
        value: totalStoryPoints,
        subtext: `${rows.reduce((acc, r) => acc + r.completedPoints, 0)} points delivered`,
        status: 'neutral',
      },
      {
        id: 'kpi-backlog',
        label: 'Unassigned Backlog',
        value: unassignedToSprint,
        subtext: unassignedToSprint > 0 ? 'Pending sprint allocation' : 'All stories sprint-mapped',
        status: unassignedToSprint > 0 ? 'warning' : 'positive',
      },
    ];

    return {
      success: true,
      query: queryText,
      title: `Sprint Delivery & Velocity Overview - ${projectName}`,
      intent: 'sprint_delivery',
      executiveSummary: [
        `Project "${projectName}" has ${totalSprints} tracked sprint(s) covering ${activeStories.length} active user stories and subtasks.`,
        activeSprintItem
          ? `Current active sprint "${activeSprintItem.title}" stands at ${activeSprintItem.progressPct} completion (${activeSprintItem.completedStories}/${activeSprintItem.totalStories} items delivered).`
          : 'There is currently no active sprint in flight.',
        unassignedToSprint > 0
          ? `${unassignedToSprint} story item(s) remain unassigned to any sprint in the product backlog.`
          : 'All active backlog stories are actively scheduled into development sprints.',
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Story Distribution Across Sprints',
        description: 'Completed vs Remaining stories per sprint',
        dataKey: 'Completed',
        categoryKey: 'name',
        secondaryKey: 'Remaining',
        data: chartData,
        colors: ['#10b981', '#f59e0b'],
      },
      table: {
        columns: [
          { key: 'title', label: 'Sprint', type: 'link' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'totalStories', label: 'Stories', type: 'number' },
          { key: 'completedStories', label: 'Completed', type: 'number' },
          { key: 'pendingStories', label: 'Remaining', type: 'number' },
          { key: 'totalPoints', label: 'Story Points', type: 'number' },
          { key: 'progressPct', label: 'Progress', type: 'badge' },
        ],
        rows,
        defaultSortKey: 'totalStories',
        defaultSortDir: 'desc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show stories and tasks grouped by status',
        'List open bugs and defect severity breakdown',
        'Show team workload and planned vs logged hours',
        'List critical risks, blockers and open issues',
      ],
    };
  }

  // --- 2. DEFECTS & QUALITY HEALTH ---
  if (isBugQuery) {
    const severityCount: Record<string, { total: number; open: number; closed: number }> = {
      Critical: { total: 0, open: 0, closed: 0 },
      High: { total: 0, open: 0, closed: 0 },
      Medium: { total: 0, open: 0, closed: 0 },
      Low: { total: 0, open: 0, closed: 0 },
    };

    const rows = activeBugs.map((b: any) => {
      const sev = b.severity || b.priority || 'Medium';
      const normSev = ['Critical', 'High', 'Medium', 'Low'].includes(sev) ? sev : 'Medium';
      const isClosed = b.status === 'Closed' || b.status === 'Done' || b.status === 'Verified';

      severityCount[normSev].total++;
      if (isClosed) {
        severityCount[normSev].closed++;
      } else {
        severityCount[normSev].open++;
      }

      return {
        id: b.id,
        storyId: b.storyId || b.id,
        title: b.title || 'Untitled Defect',
        severity: normSev,
        status: b.status || 'Open',
        priority: b.priority || 'Medium',
        assignee: b.assigneeName || b.assignedTo || 'Unassigned',
        createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A',
        link: `/projects/${projectId}/testing/defect-tracker`,
      };
    });

    const chartData = Object.entries(severityCount).map(([sev, data]) => ({
      name: sev,
      Open: data.open,
      Closed: data.closed,
      Total: data.total,
    }));

    const openBugsCount = rows.filter((r) => r.status !== 'Closed' && r.status !== 'Done' && r.status !== 'Verified').length;
    const criticalOpen = (severityCount['Critical']?.open || 0) + (severityCount['High']?.open || 0);

    const kpis: FpKpiCard[] = [
      {
        id: 'kpi-bugs-total',
        label: 'Total Defects Logged',
        value: activeBugs.length,
        subtext: `${activeBugs.length - openBugsCount} resolved`,
        status: 'neutral',
      },
      {
        id: 'kpi-bugs-open',
        label: 'Open Defects',
        value: openBugsCount,
        subtext: openBugsCount > 0 ? 'Active attention required' : 'Zero open defects',
        status: openBugsCount > 0 ? 'warning' : 'positive',
      },
      {
        id: 'kpi-bugs-critical',
        label: 'Critical / High Open',
        value: criticalOpen,
        subtext: criticalOpen > 0 ? 'Urgent triage needed' : 'Zero blockers',
        status: criticalOpen > 0 ? 'negative' : 'positive',
      },
      {
        id: 'kpi-testcases',
        label: 'Test Cases Defined',
        value: testCases.length,
        subtext: 'Project test suite size',
        status: 'positive',
      },
    ];

    return {
      success: true,
      query: queryText,
      title: `Defect & Quality Health Report - ${projectName}`,
      intent: 'defects_and_quality',
      executiveSummary: [
        `Identified ${activeBugs.length} total logged defect(s) in project "${projectName}".`,
        criticalOpen > 0
          ? `Attention: ${criticalOpen} Critical or High priority defect(s) are currently active and unresolved.`
          : 'Quality health is optimal: Zero Critical or High priority defects are currently open.',
        `Test repository contains ${testCases.length} test specification(s) validating project delivery.`,
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Defects by Severity & Resolution Status',
        description: 'Open vs Closed defects across severity levels',
        dataKey: 'Open',
        categoryKey: 'name',
        secondaryKey: 'Closed',
        data: chartData,
        colors: ['#ef4444', '#10b981'],
      },
      table: {
        columns: [
          { key: 'storyId', label: 'Bug ID', type: 'text' },
          { key: 'title', label: 'Summary', type: 'link' },
          { key: 'severity', label: 'Severity', type: 'badge' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'priority', label: 'Priority', type: 'badge' },
          { key: 'assignee', label: 'Assignee', type: 'text' },
          { key: 'createdAt', label: 'Logged Date', type: 'date' },
        ],
        rows,
        defaultSortKey: 'severity',
        defaultSortDir: 'asc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show current sprint progress and velocity',
        'List critical risks, blockers and open issues',
        'Show team workload and planned vs logged hours',
        'Show stories and tasks grouped by status',
      ],
    };
  }

  // --- 3. RAID GOVERNANCE (RISKS, ISSUES, ASSUMPTIONS, DEPENDENCIES) ---
  if (isRaidQuery) {
    const raidRows: any[] = [];

    activeRisks.forEach((r: any) => {
      raidRows.push({
        id: r.id,
        code: r.riskId || `RSK-${r.id.slice(0, 4)}`,
        type: 'Risk',
        title: r.title || r.description || 'Untitled Risk',
        severity: r.severity || r.impact || 'Medium',
        status: r.status || 'Identified',
        owner: r.owner || r.assignedTo || 'Unassigned',
        mitigation: r.mitigationPlan || r.responseStrategy || 'No mitigation plan',
        link: `/projects/${projectId}/risks`,
      });
    });

    activeIssues.forEach((i: any) => {
      raidRows.push({
        id: i.id,
        code: i.issueId || `ISS-${i.id.slice(0, 4)}`,
        type: 'Issue / Blocker',
        title: i.title || i.description || 'Untitled Issue',
        severity: i.priority || i.severity || 'High',
        status: i.status || 'Open',
        owner: i.owner || i.assignedTo || 'Unassigned',
        mitigation: i.actionPlan || i.resolution || 'Pending resolution',
        link: `/projects/${projectId}/issues`,
      });
    });

    dependencies.forEach((d: any) => {
      raidRows.push({
        id: d.id,
        code: d.dependencyId || `DEP-${d.id.slice(0, 4)}`,
        type: 'Dependency',
        title: d.title || d.description || 'Untitled Dependency',
        severity: d.criticality || 'Medium',
        status: d.status || 'Pending',
        owner: d.owner || 'Unassigned',
        mitigation: d.impact || 'External dependency',
        link: `/projects/${projectId}/dependencies`,
      });
    });

    assumptions.forEach((a: any) => {
      raidRows.push({
        id: a.id,
        code: a.assumptionId || `ASM-${a.id.slice(0, 4)}`,
        type: 'Assumption',
        title: a.title || a.description || 'Untitled Assumption',
        severity: 'Medium',
        status: a.status || 'Validating',
        owner: a.owner || 'Unassigned',
        mitigation: a.category || 'General',
        link: `/projects/${projectId}/assumptions`,
      });
    });

    const highRisksCount = activeRisks.filter((r: any) => {
      const s = String(r.severity || r.impact || '').toLowerCase();
      return s === 'critical' || s === 'high';
    }).length;

    const openIssuesCount = activeIssues.filter((i: any) => {
      const st = String(i.status || '').toLowerCase();
      return st !== 'closed' && st !== 'resolved';
    }).length;

    const chartData = [
      { name: 'Risks', count: activeRisks.length, critical: highRisksCount },
      { name: 'Issues / Blockers', count: activeIssues.length, critical: openIssuesCount },
      { name: 'Dependencies', count: dependencies.length, critical: dependencies.filter((d: any) => d.status === 'Critical').length },
      { name: 'Assumptions', count: assumptions.length, critical: 0 },
    ];

    const kpis: FpKpiCard[] = [
      {
        id: 'kpi-raid-total',
        label: 'Total RAID Items',
        value: raidRows.length,
        subtext: 'Project governance log',
        status: 'neutral',
      },
      {
        id: 'kpi-raid-high-risk',
        label: 'Critical / High Risks',
        value: highRisksCount,
        subtext: highRisksCount > 0 ? 'Active monitoring needed' : 'Zero critical risks',
        status: highRisksCount > 0 ? 'negative' : 'positive',
      },
      {
        id: 'kpi-raid-issues',
        label: 'Active Issues / Blockers',
        value: openIssuesCount,
        subtext: openIssuesCount > 0 ? 'Impediment escalation' : 'No blockers',
        status: openIssuesCount > 0 ? 'warning' : 'positive',
      },
      {
        id: 'kpi-raid-deps',
        label: 'Dependencies',
        value: dependencies.length,
        subtext: 'External & internal links',
        status: 'neutral',
      },
    ];

    return {
      success: true,
      query: queryText,
      title: `RAID Governance & Risk Matrix - ${projectName}`,
      intent: 'raid_governance',
      executiveSummary: [
        `Tracking ${raidRows.length} total governance item(s) across risks, issues, assumptions, and dependencies for "${projectName}".`,
        highRisksCount > 0
          ? `Identified ${highRisksCount} Critical or High severity risk(s) requiring executive attention.`
          : 'Risk exposure is controlled: Zero high-severity risks identified.',
        openIssuesCount > 0
          ? `${openIssuesCount} active issue(s) are impacting project delivery velocity.`
          : 'Zero active blocker issues recorded.',
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'RAID Breakdown by Category',
        description: 'Item count per governance pillar',
        dataKey: 'count',
        categoryKey: 'name',
        secondaryKey: 'critical',
        data: chartData,
        colors: ['#6366f1', '#ef4444'],
      },
      table: {
        columns: [
          { key: 'code', label: 'Item ID', type: 'text' },
          { key: 'type', label: 'Pillar', type: 'badge' },
          { key: 'title', label: 'Summary', type: 'link' },
          { key: 'severity', label: 'Severity / Impact', type: 'badge' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'owner', label: 'Owner', type: 'text' },
          { key: 'mitigation', label: 'Mitigation / Strategy', type: 'text' },
        ],
        rows: raidRows,
        defaultSortKey: 'severity',
        defaultSortDir: 'asc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show current sprint progress and velocity',
        'Show team workload and planned vs logged hours',
        'List open bugs and defect severity breakdown',
        'Show stories and tasks grouped by status',
      ],
    };
  }

  // --- 4. TEAM WORKLOAD, ALLOCATION & LOGGED HOURS ---
  if (isTeamQuery) {
    const memberMap = new Map<string, { name: string; role: string; taskCount: number; loggedHours: number; stories: any[] }>();

    employees.forEach((emp: any) => {
      const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.empId || emp.id;
      memberMap.set(emp.id, {
        name,
        role: emp.role || emp.accessLevel || 'Team Member',
        taskCount: 0,
        loggedHours: 0,
        stories: [],
      });
      if (emp.empId) {
        memberMap.set(emp.empId, memberMap.get(emp.id)!);
      }
    });

    let unassignedTasksCount = 0;
    activeStories.forEach((st: any) => {
      const assigneeId = st.assigneeId || st.assignedToId || st.assignedTo;
      if (assigneeId && memberMap.has(assigneeId)) {
        const entry = memberMap.get(assigneeId)!;
        entry.taskCount++;
        entry.stories.push(st);
      } else {
        unassignedTasksCount++;
      }
    });

    worklogs.forEach((wl: any) => {
      const empId = wl.employeeId || wl.userId;
      const hrs = Number(wl.totalHours) || Number(wl.hours) || Number(wl.duration) || 0;
      if (empId && memberMap.has(empId)) {
        memberMap.get(empId)!.loggedHours += hrs;
      }
    });

    // Deduplicate map entries by unique name
    const distinctMembers = Array.from(new Set(Array.from(memberMap.values())));

    const rows = distinctMembers.map((m) => ({
      name: m.name,
      role: m.role,
      taskCount: m.taskCount,
      loggedHours: Math.round(m.loggedHours * 10) / 10,
      link: `/projects/${projectId}/resources/project-resources`,
    }));

    const chartData = rows
      .sort((a, b) => b.taskCount - a.taskCount)
      .map((r) => ({
        name: r.name.length > 14 ? r.name.slice(0, 14) + '...' : r.name,
        fullName: r.name,
        Tasks: r.taskCount,
        Hours: r.loggedHours,
      }));

    const totalLoggedHours = rows.reduce((acc, r) => acc + r.loggedHours, 0);
    const topAssignee = rows.length > 0 ? rows[0] : null;

    const kpis: FpKpiCard[] = [
      {
        id: 'kpi-team-count',
        label: 'Team Size',
        value: distinctMembers.length,
        subtext: 'Assigned project resources',
        status: 'positive',
      },
      {
        id: 'kpi-top-workload',
        label: 'Top Workload',
        value: topAssignee ? topAssignee.name : 'N/A',
        subtext: topAssignee ? `${topAssignee.taskCount} task(s) assigned` : 'No tasks assigned',
        status: 'neutral',
      },
      {
        id: 'kpi-logged-hours',
        label: 'Logged Work Hours',
        value: `${totalLoggedHours}h`,
        subtext: 'Accumulated project worklog',
        status: 'positive',
      },
      {
        id: 'kpi-unassigned',
        label: 'Unassigned Tasks',
        value: unassignedTasksCount,
        subtext: unassignedTasksCount > 0 ? 'Pending resource assignment' : 'All tasks assigned',
        status: unassignedTasksCount > 0 ? 'warning' : 'positive',
      },
    ];

    return {
      success: true,
      query: queryText,
      title: `Team Workload & Resource Allocation - ${projectName}`,
      intent: 'team_workload',
      executiveSummary: [
        `Project "${projectName}" has ${distinctMembers.length} dedicated resource(s) actively deployed.`,
        topAssignee
          ? `Workload lead: ${topAssignee.name} holds ${topAssignee.taskCount} assigned work item(s).`
          : 'No tasks currently distributed to team members.',
        `Total logged execution time across all project worklogs is ${totalLoggedHours} hours.`,
        unassignedTasksCount > 0
          ? `${unassignedTasksCount} backlog item(s) are currently unassigned to any team member.`
          : 'Every work item is assigned to an active contributor.',
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Assigned Tasks & Logged Hours by Team Member',
        description: 'Workload volume and effort per contributor',
        dataKey: 'Tasks',
        categoryKey: 'name',
        secondaryKey: 'Hours',
        data: chartData,
        colors: ['#0ea5e9', '#8b5cf6'],
      },
      table: {
        columns: [
          { key: 'name', label: 'Team Member', type: 'link' },
          { key: 'role', label: 'Role', type: 'badge' },
          { key: 'taskCount', label: 'Assigned Tasks', type: 'number' },
          { key: 'loggedHours', label: 'Logged Hours (h)', type: 'number' },
        ],
        rows,
        defaultSortKey: 'taskCount',
        defaultSortDir: 'desc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show current sprint progress and velocity',
        'Show stories and tasks grouped by status',
        'List open bugs and defect severity breakdown',
        'List critical risks, blockers and open issues',
      ],
    };
  }

  // --- 5. EPICS & MILESTONES ---
  if (isEpicQuery) {
    const epicMap = new Map<string, { epic: any; total: number; done: number }>();

    activeEpics.forEach((e: any) => {
      epicMap.set(e.id, { epic: e, total: 0, done: 0 });
    });

    activeStories.forEach((st: any) => {
      const eId = st.epicId;
      const isDone = st.status === 'Done' || st.status === 'Completed' || st.status === 'Closed';
      if (eId && epicMap.has(eId)) {
        const item = epicMap.get(eId)!;
        item.total++;
        if (isDone) item.done++;
      }
    });

    const rows = Array.from(epicMap.values()).map(({ epic, total, done }) => {
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return {
        id: epic.id,
        title: epic.title || epic.name || 'Untitled Epic',
        totalStories: total,
        completedStories: done,
        remainingStories: total - done,
        progressPct: `${pct}%`,
        status: pct === 100 ? 'Completed' : pct > 0 ? 'In Progress' : 'Planned',
        link: `/projects/${projectId}/development/backlog`,
      };
    });

    const chartData = rows.map((r) => ({
      name: r.title.length > 18 ? r.title.slice(0, 18) + '...' : r.title,
      fullName: r.title,
      Delivered: r.completedStories,
      Remaining: r.remainingStories,
      Total: r.totalStories,
    }));

    const fullyDeliveredEpics = rows.filter((r) => r.status === 'Completed').length;

    const kpis: FpKpiCard[] = [
      {
        id: 'kpi-epics-total',
        label: 'Total Epics',
        value: activeEpics.length,
        subtext: 'Core project initiatives',
        status: 'positive',
      },
      {
        id: 'kpi-epics-delivered',
        label: 'Fully Delivered',
        value: fullyDeliveredEpics,
        subtext: `${activeEpics.length - fullyDeliveredEpics} in flight`,
        status: 'positive',
      },
      {
        id: 'kpi-releases-count',
        label: 'Project Releases',
        value: releases.length,
        subtext: 'Scheduled delivery releases',
        status: 'neutral',
      },
      {
        id: 'kpi-payment-milestones',
        label: 'Payment Milestones',
        value: paymentMilestones.length,
        subtext: 'Commercial milestones',
        status: 'neutral',
      },
    ];

    return {
      success: true,
      query: queryText,
      title: `Epics & Milestone Delivery Progress - ${projectName}`,
      intent: 'epics_and_milestones',
      executiveSummary: [
        `Tracking ${activeEpics.length} core epic(s) comprising ${activeStories.length} stories across "${projectName}".`,
        fullyDeliveredEpics > 0
          ? `${fullyDeliveredEpics} epic(s) are 100% completed.`
          : 'All epics are currently active or planned.',
        `Project timeline contains ${releases.length} target release(s) and ${paymentMilestones.length} billing milestone(s).`,
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Story Delivery Progress Across Epics',
        description: 'Delivered vs Remaining stories per epic',
        dataKey: 'Delivered',
        categoryKey: 'name',
        secondaryKey: 'Remaining',
        data: chartData,
        colors: ['#10b981', '#f59e0b'],
      },
      table: {
        columns: [
          { key: 'title', label: 'Epic Title', type: 'link' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'totalStories', label: 'Total Stories', type: 'number' },
          { key: 'completedStories', label: 'Delivered', type: 'number' },
          { key: 'remainingStories', label: 'Remaining', type: 'number' },
          { key: 'progressPct', label: 'Completion', type: 'badge' },
        ],
        rows,
        defaultSortKey: 'totalStories',
        defaultSortDir: 'desc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show current sprint progress and velocity',
        'Show stories and tasks grouped by status',
        'Show team workload and planned vs logged hours',
        'Project valuation, billing rate, and milestone payments',
      ],
    };
  }

  // --- 6. BUDGET, BILLING & FINANCIAL BURN ---
  if (isFinancialQuery) {
    const rows = paymentMilestones.map((pm: any) => ({
      id: pm.id,
      title: pm.title || pm.name || 'Milestone',
      amount: Number(pm.amount) || 0,
      status: pm.status || 'Pending',
      dueDate: pm.dueDate ? new Date(pm.dueDate).toLocaleDateString() : 'TBD',
      invoiceDate: pm.invoiceDate ? new Date(pm.invoiceDate).toLocaleDateString() : 'Not Invoiced',
      link: `/projects/${projectId}/pmo/${pricingModel === 'Fixed Bid' ? 'fb-payment-milestones' : 'tnm-payment-milestones'}`,
    }));

    const totalMilestoneValue = rows.reduce((acc, r) => acc + r.amount, 0);
    const paidValue = rows.filter((r) => r.status.toLowerCase() === 'paid').reduce((acc, r) => acc + r.amount, 0);
    const invoicedValue = rows.filter((r) => r.status.toLowerCase() === 'invoiced').reduce((acc, r) => acc + r.amount, 0);
    const pendingValue = totalMilestoneValue - paidValue - invoicedValue;

    const chartData = rows.map((r) => ({
      name: r.title.length > 16 ? r.title.slice(0, 16) + '...' : r.title,
      Amount: r.amount,
    }));

    const kpis: FpKpiCard[] = [
      {
        id: 'kpi-pricing-model',
        label: 'Pricing Model',
        value: pricingModel,
        subtext: 'Contract commercial structure',
        status: 'positive',
      },
      {
        id: 'kpi-total-milestone',
        label: 'Milestone Pipeline',
        value: `$${totalMilestoneValue.toLocaleString()}`,
        subtext: `${rows.length} commercial milestones`,
        status: 'positive',
      },
      {
        id: 'kpi-collected',
        label: 'Paid / Invoiced',
        value: `$${(paidValue + invoicedValue).toLocaleString()}`,
        subtext: `${paidValue > 0 ? `$${paidValue.toLocaleString()} collected` : 'Pending payment'}`,
        status: 'neutral',
      },
      {
        id: 'kpi-pending-bill',
        label: 'Remaining Value',
        value: `$${pendingValue.toLocaleString()}`,
        subtext: 'Unbilled milestone pipeline',
        status: 'neutral',
      },
    ];

    return {
      success: true,
      query: queryText,
      title: `Financial Valuation & Billing Milestones - ${projectName}`,
      intent: 'financial_valuation',
      executiveSummary: [
        `Project "${projectName}" operates under a ${pricingModel} commercial engagement.`,
        totalMilestoneValue > 0
          ? `Total milestone billing schedule accounts for $${totalMilestoneValue.toLocaleString()} across ${rows.length} milestone(s).`
          : 'No payment milestones currently recorded in project PMO schedule.',
        `Realized / invoiced progress stands at $${(paidValue + invoicedValue).toLocaleString()}.`,
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Payment Milestones Valuation ($)',
        description: 'Scheduled milestone amounts across delivery phases',
        dataKey: 'Amount',
        categoryKey: 'name',
        data: chartData,
        colors: ['#10b981'],
      },
      table: {
        columns: [
          { key: 'title', label: 'Milestone', type: 'link' },
          { key: 'amount', label: 'Amount ($)', type: 'currency' },
          { key: 'status', label: 'Billing Status', type: 'badge' },
          { key: 'dueDate', label: 'Due Date', type: 'date' },
          { key: 'invoiceDate', label: 'Invoiced Date', type: 'date' },
        ],
        rows,
        defaultSortKey: 'amount',
        defaultSortDir: 'desc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show current sprint progress and velocity',
        'Show team workload and planned vs logged hours',
        'Show stories and tasks grouped by status',
        'List critical risks, blockers and open issues',
      ],
    };
  }

  // --- 7. STORIES & BACKLOG WORK ITEMS BREAKDOWN ---
  if (isStoryQuery) {
    const statusCounts: Record<string, number> = {
      'To Do': 0,
      'In Progress': 0,
      'In Review': 0,
      Done: 0,
      Blocked: 0,
    };

    const rows = activeStories.map((st: any) => {
      const rawStatus = st.status || 'To Do';
      const normStatus =
        rawStatus === 'Done' || rawStatus === 'Completed' || rawStatus === 'Closed'
          ? 'Done'
          : rawStatus === 'In Progress' || rawStatus === 'In Dev'
          ? 'In Progress'
          : rawStatus === 'In Review' || rawStatus === 'Testing' || rawStatus === 'QA'
          ? 'In Review'
          : rawStatus === 'Blocked'
          ? 'Blocked'
          : 'To Do';

      statusCounts[normStatus] = (statusCounts[normStatus] || 0) + 1;

      return {
        id: st.id,
        storyId: st.storyId || st.id,
        title: st.title || 'Untitled Story',
        itemType: st.itemType || 'Story',
        status: normStatus,
        priority: st.priority || 'Medium',
        storyPoints: Number(st.storyPoints) || Number(st.estimate) || 1,
        assignee: st.assigneeName || st.assignedTo || 'Unassigned',
        link: `/projects/${projectId}/development/kanban`,
      };
    });

    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      count,
    }));

    const totalStoriesCount = activeStories.length;
    const completedCount = statusCounts['Done'] || 0;
    const inProgressCount = (statusCounts['In Progress'] || 0) + (statusCounts['In Review'] || 0);
    const blockedCount = statusCounts['Blocked'] || 0;
    const progressPercent = totalStoriesCount > 0 ? Math.round((completedCount / totalStoriesCount) * 100) : 0;

    const kpis: FpKpiCard[] = [
      {
        id: 'kpi-total-items',
        label: 'Total Work Items',
        value: totalStoriesCount,
        subtext: `${completedCount} completed (${progressPercent}%)`,
        status: 'positive',
      },
      {
        id: 'kpi-in-flight',
        label: 'In Progress / Review',
        value: inProgressCount,
        subtext: 'Active development pipeline',
        status: 'neutral',
      },
      {
        id: 'kpi-blocked',
        label: 'Blocked Items',
        value: blockedCount,
        subtext: blockedCount > 0 ? 'Requires unblocking' : 'Zero blockers',
        status: blockedCount > 0 ? 'negative' : 'positive',
      },
      {
        id: 'kpi-overall-rag',
        label: 'Overall Health',
        value: overallHealth,
        subtext: `Pricing: ${pricingModel}`,
        status: overallHealth === 'Green' ? 'positive' : overallHealth === 'Amber' ? 'warning' : 'negative',
      },
    ];

    return {
      success: true,
      query: queryText,
      title: `Work Items & Backlog Status - ${projectName}`,
      intent: 'stories_and_backlog',
      executiveSummary: [
        `Project "${projectName}" contains ${totalStoriesCount} active story and task record(s).`,
        `Overall completion rate is ${progressPercent}% (${completedCount} delivered, ${inProgressCount} in progress).`,
        blockedCount > 0
          ? `Warning: ${blockedCount} work item(s) are marked as Blocked.`
          : 'Zero items are currently blocked.',
        `Active project delivery health is classified as ${overallHealth}.`,
      ],
      kpis,
      chart: {
        type: 'pie',
        title: 'Work Items by Status',
        description: 'Distribution across workflow columns',
        dataKey: 'count',
        categoryKey: 'name',
        data: chartData,
        colors: ['#94a3b8', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'],
      },
      table: {
        columns: [
          { key: 'storyId', label: 'ID', type: 'text' },
          { key: 'title', label: 'Title', type: 'link' },
          { key: 'itemType', label: 'Type', type: 'badge' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'priority', label: 'Priority', type: 'badge' },
          { key: 'storyPoints', label: 'Points', type: 'number' },
          { key: 'assignee', label: 'Assignee', type: 'text' },
        ],
        rows,
        defaultSortKey: 'status',
        defaultSortDir: 'asc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show current sprint progress and velocity',
        'List open bugs and defect severity breakdown',
        'List critical risks, blockers and open issues',
        'Show team workload and planned vs logged hours',
      ],
    };
  }

  // --- 8. INDETERMINISTIC RESULTS (FALLBACK) ---
  return {
    success: true,
    query: queryText,
    title: 'Indeterministic Query',
    intent: 'unsupported_or_off_topic',
    executiveSummary: [
      `Could not determine a specific project intent for: "${queryText}".`,
      'The Project PromptBoard deterministic engine could not match your query to a supported project category (like sprints, bugs, RAID, team workload, or financials).',
      'Please try rephrasing your question using one of the supported query topics below.',
    ],
    kpis: [
      { id: 'kpi-0', label: 'Intent Match', value: 'Failed', status: 'negative', subtext: 'Query indeterministic' },
      { id: 'kpi-1', label: 'Active Stories', value: activeStories.length, status: 'positive', subtext: 'Available for querying' },
    ],
    chart: {
      type: 'none',
      title: 'No Visual Data',
      dataKey: 'count',
      categoryKey: 'category',
      data: [],
    },
    table: {
      columns: [
        { key: 'topic', label: 'Supported Project Subject' },
        { key: 'sampleQuery', label: 'Example Question' },
      ],
      rows: [
        { topic: 'Sprint Delivery', sampleQuery: 'Show current sprint progress and velocity' },
        { topic: 'Stories & Tasks', sampleQuery: 'Show stories and tasks grouped by status' },
        { topic: 'Defects & Quality', sampleQuery: 'List open bugs and defect severity breakdown' },
        { topic: 'RAID Governance', sampleQuery: 'List critical risks, blockers and open issues' },
        { topic: 'Team Workload', sampleQuery: 'Show team workload and planned vs logged hours' },
        { topic: 'Financials & Valuation', sampleQuery: 'Project valuation and milestone payments' },
      ],
    },
    audit: {
      ...baseAudit,
      recordsAnalyzed: 0,
      confidence: 'Fallback / Indeterministic',
    },
    followUpSuggestions: [
      'Show current sprint progress and velocity',
      'Show stories and tasks grouped by status',
      'List open bugs and defect severity breakdown',
      'List critical risks, blockers and open issues',
    ],
  };
}


export const executeWayFinderPmQuery = executeFpPmQuery;
export type WayFinderPmProjectData = FpPmProjectData;
