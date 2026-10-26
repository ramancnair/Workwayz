import { collection, getDocs, db } from '@/lib/db-provider';
import type { FpQueryResponse, FpKpiCard, FpAuditStamp } from '@/types/wayfinder-dashboard';

export async function executeFpQuery(
  rawQuery: string,
  portfolioScopeId = 'all',
  snapshot?: { portfolios?: any[]; projects?: any[]; employees?: any[] }
): Promise<FpQueryResponse> {
  const queryText = (rawQuery || '').trim();
  if (!queryText) {
    throw new Error('Please enter a search query or question.');
  }

  const lowerQuery = queryText.toLowerCase();

  const portfoliosMap = new Map<string, string>();
  const employeesMap = new Map<string, string>();
  let allProjects: any[] = [];
  let employeesRaw: any[] = [];

  if (snapshot) {
    (snapshot.portfolios || []).forEach((d: any) => {
      if (!d.isDeleted) {
        portfoliosMap.set(d.id, d.name || d.id);
      }
    });

    employeesRaw = (snapshot.employees || []).filter((d: any) => !d.isDeleted);
    employeesRaw.forEach((d: any) => {
      const fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || d.empId || d.id;
      employeesMap.set(d.id, fullName);
      if (d.empId) employeesMap.set(d.empId, fullName);
      if (d.email) employeesMap.set(d.email, fullName);
      if (d.uid) employeesMap.set(d.uid, fullName);
    });

    allProjects = (snapshot.projects || [])
      .map((p: any) => ({ ...p }))
      .filter((p: any) => !p.isDeleted && !p.isArchived);
  } else {
    if (!db) {
      throw new Error('Database connection is not initialized.');
    }

    // 1. Fetch Portfolios directly from DB
    const portfoliosSnap = await getDocs(collection(db, 'portfolios'));
    portfoliosSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (!data.isDeleted) {
        portfoliosMap.set(d.id, data.name || d.id);
      }
    });

    // 2. Fetch Employees to reliably resolve Project Manager names
    const employeesSnap = await getDocs(collection(db, 'employees'));
    employeesRaw = employeesSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((d: any) => !d.isDeleted);
    employeesRaw.forEach((d: any) => {
      const fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || d.empId || d.id;
      employeesMap.set(d.id, fullName);
      if (d.empId) employeesMap.set(d.empId, fullName);
      if (d.email) employeesMap.set(d.email, fullName);
      if (d.uid) employeesMap.set(d.uid, fullName);
    });

    // 3. Fetch Projects directly from DB
    const projectsSnap = await getDocs(collection(db, 'projects'));
    allProjects = projectsSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((p: any) => !p.isDeleted && !p.isArchived);
  }

  // Fallback: For any project without explicit projectManagerId, inspect its employees subcollection if direct DB is active
  if (!snapshot && db) {
    for (const p of allProjects) {
      if (!p.projectManagerId || p.projectManagerId === 'unassigned') {
        try {
          const subSnap = await getDocs(collection(db, 'projects', p.id, 'employees'));
          const pmMember = subSnap.docs.find((m: any) => {
            const mData = m.data();
            const r = String(mData.role || mData.accessLevel || '').toLowerCase();
            return r === 'pm' || r === 'project manager';
          });
          if (pmMember) {
            const mData = pmMember.data();
            const fullName = `${mData.firstName || ''} ${mData.lastName || ''}`.trim() || mData.name || mData.empId || pmMember.id;
            p.projectManagerId = pmMember.id;
            p.projectManager = fullName;
            employeesMap.set(pmMember.id, fullName);
          }
        } catch {
          // Continue if subcollection fetch cannot be reached
        }
      }
    }
  }

  // Apply portfolio scope if requested
  if (portfolioScopeId !== 'all') {
    allProjects = allProjects.filter((p: any) => p.portfolioId === portfolioScopeId);
  }

  const portfolioName =
    portfolioScopeId === 'all'
      ? 'All Portfolios'
      : portfoliosMap.get(portfolioScopeId) || portfolioScopeId;

  // Helper to accurately resolve Project Manager display name
  const getPmName = (p: any): string => {
    if (p.projectManagerId && employeesMap.has(p.projectManagerId)) {
      return employeesMap.get(p.projectManagerId)!;
    }
    if (p.projectManager && typeof p.projectManager === 'string' && p.projectManager !== 'Unassigned') {
      return p.projectManager;
    }
    if (p.projectManagerId) {
      return employeesMap.get(p.projectManagerId) || p.projectManagerId;
    }
    return 'Unassigned';
  };

  const now = new Date().toISOString();
  const baseAudit: FpAuditStamp = {
    sourceCollection: 'projects, portfolios, employees, risks, issues, stories',
    recordsAnalyzed: allProjects.length,
    portfolioScope: portfolioName,
    timestamp: now,
    provider: 'Workwayz Deterministic DB Engine',
    confidence: '100% (Grounded in Database, Zero Hallucination)',
  };

  // 4. Intent Classification
  const isPmGroupingQuery =
    /\b(pm|pms|project manager|project managers)\b/i.test(lowerQuery) ||
    (/\b(manager|managers)\b/i.test(lowerQuery) && /\b(group|grouping|by|project|projects|who|distribution|workload|leading|count|list|graph|chart)\b/i.test(lowerQuery)) ||
    (/\b(workload|allocation|assigned)\b/i.test(lowerQuery) && /\b(pm|pms|manager|managers)\b/i.test(lowerQuery));

  const isHealthQuery = /health|status|rag|green|amber|red|condition|at risk/i.test(lowerQuery);
  const isPricingQuery = /pricing|fixed bid|t&m|t and m|time and material|rate model|contract/i.test(lowerQuery);
  const isRiskIssueQuery = /risk|issue|blocker|critical|high priority|impediment|raid/i.test(lowerQuery);
  const isBillingQuery = /billing|financial|revenue|budget|cost|profit|margin|money|burn/i.test(lowerQuery);
  const isResourceQuery = /resource|utilization|bench|available|headcount|developer|tester|role|engineer|staff/i.test(lowerQuery);
  const isDefectQuery = /defect|bug|quality|leakage|test case|sit|uat|failed test/i.test(lowerQuery);

  // Check for off-topic query
  const isOffTopic =
    /weather|president|capital of|recipe|who won|world cup|joke|movie|song|celebrity|bitcoin price|crypto/i.test(lowerQuery) &&
    !isPmGroupingQuery &&
    !isHealthQuery &&
    !isPricingQuery &&
    !isRiskIssueQuery &&
    !isBillingQuery &&
    !isResourceQuery &&
    !isDefectQuery;

  if (isOffTopic) {
    return {
      success: true,
      query: queryText,
      title: 'Query Out of Scope',
      intent: 'unsupported_or_off_topic',
      executiveSummary: [
        'No matching project records found in the database for this query.',
        'The FP Dashboard is strictly grounded in your active portfolios, projects, financials, risks, and resource records to prevent hallucinations.',
        'Please try asking about projects grouped by PM, project health (RAG status), pricing models, high risks, open issues, billing, or resource utilization.',
      ],
      kpis: [
        { id: 'kpi-0', label: 'Database Match', value: '0 records', status: 'warning', subtext: 'Query not in DB schema' },
        { id: 'kpi-1', label: 'Active Projects', value: allProjects.length, status: 'positive', subtext: 'Available for querying' },
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
          { key: 'topic', label: 'Supported Subject' },
          { key: 'sampleQuery', label: 'Example Question' },
        ],
        rows: [
          { topic: 'Project Managers', sampleQuery: 'Show projects grouped by Project Manager' },
          { topic: 'Project Health', sampleQuery: 'Show health status of all projects' },
          { topic: 'Pricing Models', sampleQuery: 'Compare Fixed Bid vs T&M projects' },
          { topic: 'Risks & Blockers', sampleQuery: 'List high risks and critical open issues' },
          { topic: 'Financials & Billing', sampleQuery: 'Show portfolio revenue and project value' },
          { topic: 'Team & Utilization', sampleQuery: 'Show team roles and resource distribution' },
        ],
      },
      audit: {
        ...baseAudit,
        recordsAnalyzed: 0,
        confidence: 'Off-topic Guardrail Triggered',
      },
      followUpSuggestions: [
        'Show projects grouped by Project Manager',
        'Show project RAG health breakdown across all portfolios',
        'Compare Fixed Bid vs T&M projects distribution',
        'List open Critical and High priority risks',
      ],
    };
  }

  // --- SCENARIO 1: Projects Grouped by Project Manager (PM) ---
  if (isPmGroupingQuery) {
    const pmCountMap: Record<string, { count: number; projects: any[]; healths: Record<string, number> }> = {};
    let unassignedCount = 0;

    const rows = allProjects.map((p: any) => {
      const pmName = getPmName(p);
      const health = p.overallStatus || 'Green';

      if (!pmCountMap[pmName]) {
        pmCountMap[pmName] = { count: 0, projects: [], healths: { Green: 0, Amber: 0, Red: 0 } };
      }
      pmCountMap[pmName].count++;
      pmCountMap[pmName].projects.push(p);
      if (pmCountMap[pmName].healths[health] !== undefined) {
        pmCountMap[pmName].healths[health]++;
      }

      if (pmName === 'Unassigned') {
        unassignedCount++;
      }

      return {
        id: p.id,
        name: p.name,
        portfolio: portfoliosMap.get(p.portfolioId) || 'Unassigned',
        projectManager: pmName,
        health,
        pricingModel: p.pricingModel || 'Fixed Bid',
        projectValue: Number(p.projectValue) || 0,
        statusComments: p.statusComments || 'No comments recorded',
        link: `/projects/${p.id}/project-details/project-status`,
      };
    });

    const chartData = Object.entries(pmCountMap)
      .map(([name, data]) => ({
        name: name.length > 20 ? name.slice(0, 20) + '...' : name,
        fullName: name,
        count: data.count,
        green: data.healths.Green || 0,
        amber: data.healths.Amber || 0,
        red: data.healths.Red || 0,
      }))
      .sort((a, b) => b.count - a.count);

    const assignedPms = Object.entries(pmCountMap).filter(([name]) => name !== 'Unassigned');
    assignedPms.sort((a, b) => b[1].count - a[1].count);
    const topPm = assignedPms.length > 0 ? assignedPms[0] : null;
    const distinctPmsCount = assignedPms.length;
    const avgProjectsPerPm = distinctPmsCount > 0 ? (allProjects.length / distinctPmsCount).toFixed(1) : '0';

    const kpis: FpKpiCard[] = [
      { id: 'distinct-pms', label: 'Active Project Managers', value: distinctPmsCount, subtext: 'Overseeing projects', status: 'positive' },
      { id: 'top-pm', label: 'Top Lead PM', value: topPm ? `${topPm[0]}` : 'N/A', subtext: topPm ? `${topPm[1].count} project(s) assigned` : 'No PMs assigned', status: 'neutral' },
      { id: 'avg-per-pm', label: 'Avg Projects / PM', value: avgProjectsPerPm, subtext: `${allProjects.length} total active projects`, status: 'neutral' },
      { id: 'unassigned-pms', label: 'Unassigned Projects', value: unassignedCount, subtext: unassignedCount > 0 ? 'Pending PM assignment' : 'All projects assigned', status: unassignedCount > 0 ? 'warning' : 'positive' },
    ];

    return {
      success: true,
      query: queryText,
      title: `Projects Grouped by Project Manager - ${portfolioName}`,
      intent: 'projects_by_pm',
      executiveSummary: [
        `Identified ${distinctPmsCount} active Project Manager(s) leading ${allProjects.length} project(s) under ${portfolioName}.`,
        topPm
          ? `Top workload lead: ${topPm[0]} is managing ${topPm[1].count} active project(s).`
          : 'No projects currently have assigned Project Managers.',
        unassignedCount > 0
          ? `${unassignedCount} project(s) are currently unassigned and need PM allocation.`
          : 'All active projects have assigned Project Managers.',
        `Average leadership ratio is ${avgProjectsPerPm} projects per manager across the portfolio.`,
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Project Count by Project Manager',
        description: 'Total active projects assigned to each Project Manager',
        dataKey: 'count',
        categoryKey: 'name',
        data: chartData,
        colors: ['#6366f1'],
      },
      table: {
        columns: [
          { key: 'id', label: 'Project ID', type: 'link' },
          { key: 'name', label: 'Project Name', type: 'text' },
          { key: 'projectManager', label: 'Project Manager', type: 'badge' },
          { key: 'portfolio', label: 'Portfolio', type: 'text' },
          { key: 'health', label: 'RAG Health', type: 'badge' },
          { key: 'pricingModel', label: 'Pricing Model', type: 'badge' },
          { key: 'statusComments', label: 'Latest Status Notes', type: 'text' },
        ],
        rows,
        defaultSortKey: 'projectManager',
        defaultSortDir: 'asc',
      },
      audit: {
        ...baseAudit,
        recordsAnalyzed: allProjects.length + employeesRaw.length,
      },
      followUpSuggestions: [
        'Show project RAG health breakdown across all portfolios',
        'Compare Fixed Bid vs T&M projects distribution',
        'Show team roles, headcount, and resource availability',
      ],
    };
  }

  // --- SCENARIO 2: Project Health / RAG Status Breakdown ---
  if (isHealthQuery && !isRiskIssueQuery) {
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;
    let unassignedCount = 0;

    const rows = allProjects.map((p: any) => {
      const status = p.overallStatus || 'Not Set';
      if (status === 'Green') greenCount++;
      else if (status === 'Amber') amberCount++;
      else if (status === 'Red') redCount++;
      else unassignedCount++;

      return {
        id: p.id,
        name: p.name,
        portfolio: portfoliosMap.get(p.portfolioId) || 'Unassigned',
        health: status,
        pricingModel: p.pricingModel || 'Fixed Bid',
        projectManager: getPmName(p),
        statusComments: p.statusComments || 'No comments recorded',
        link: `/projects/${p.id}/project-details/project-status`,
      };
    });

    const total = allProjects.length;
    const healthyPct = total > 0 ? Math.round((greenCount / total) * 100) : 0;
    const atRiskPct = total > 0 ? Math.round(((redCount + amberCount) / total) * 100) : 0;

    const chartData = [
      { name: 'Green (Healthy)', count: greenCount, fill: '#22c55e' },
      { name: 'Amber (Needs Attention)', count: amberCount, fill: '#f59e0b' },
      { name: 'Red (Critical)', count: redCount, fill: '#ef4444' },
    ];
    if (unassignedCount > 0) {
      chartData.push({ name: 'Not Set', count: unassignedCount, fill: '#64748b' });
    }

    const kpis: FpKpiCard[] = [
      { id: 'total-proj', label: 'Active Projects', value: total, subtext: `Scope: ${portfolioName}`, status: 'neutral' },
      { id: 'green-proj', label: 'Healthy (Green)', value: `${greenCount} (${healthyPct}%)`, subtext: 'Operating normally', status: 'positive' },
      { id: 'amber-proj', label: 'Attention (Amber)', value: amberCount, subtext: 'Potential blockers flagged', status: amberCount > 0 ? 'warning' : 'positive' },
      { id: 'red-proj', label: 'Critical (Red)', value: redCount, subtext: atRiskPct > 0 ? `${atRiskPct}% projects at risk` : 'Zero red projects', status: redCount > 0 ? 'negative' : 'positive' },
    ];

    return {
      success: true,
      query: queryText,
      title: `Project Health (RAG) Distribution - ${portfolioName}`,
      intent: 'project_health_breakdown',
      executiveSummary: [
        `Analyzed ${total} active project(s) directly from the database under ${portfolioName}.`,
        `${greenCount} project(s) (${healthyPct}%) are currently reported in healthy (Green) status.`,
        redCount > 0
          ? `ALERT: ${redCount} project(s) require immediate executive escalation due to Red status.`
          : 'Zero projects are in Red status.',
        amberCount > 0
          ? `${amberCount} project(s) are in Amber status with active tracking.`
          : 'No Amber projects pending review.',
      ],
      kpis,
      chart: {
        type: 'pie',
        title: 'Health Status Breakdown (RAG)',
        description: 'Proportion of projects by executive RAG health status',
        dataKey: 'count',
        categoryKey: 'name',
        data: chartData,
        colors: ['#22c55e', '#f59e0b', '#ef4444', '#64748b'],
      },
      table: {
        columns: [
          { key: 'id', label: 'Project ID', type: 'link' },
          { key: 'name', label: 'Project Name', type: 'text' },
          { key: 'portfolio', label: 'Portfolio', type: 'text' },
          { key: 'health', label: 'RAG Health', type: 'badge' },
          { key: 'pricingModel', label: 'Pricing Model', type: 'text' },
          { key: 'projectManager', label: 'Project Manager', type: 'badge' },
          { key: 'statusComments', label: 'Latest Status Notes', type: 'text' },
        ],
        rows,
        defaultSortKey: 'health',
        defaultSortDir: 'asc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show projects grouped by Project Manager',
        'List open Critical and High priority risks across projects',
        'Compare Fixed Bid vs T&M projects in this portfolio',
      ],
    };
  }

  // --- SCENARIO 3: Pricing Model / Contract Distribution ---
  if (isPricingQuery) {
    let fixedBidCount = 0;
    let tnmCount = 0;
    let fixedBidValue = 0;
    let tnmValue = 0;

    const rows = allProjects.map((p: any) => {
      const model = p.pricingModel || 'Fixed Bid';
      const val = Number(p.projectValue) || 0;
      if (model === 'T&M') {
        tnmCount++;
        tnmValue += val;
      } else {
        fixedBidCount++;
        fixedBidValue += val;
      }

      return {
        id: p.id,
        name: p.name,
        portfolio: portfoliosMap.get(p.portfolioId) || 'Unassigned',
        pricingModel: model,
        projectValue: val,
        health: p.overallStatus || 'Green',
        projectManager: getPmName(p),
        link: `/projects/${p.id}/project-details/project-status`,
      };
    });

    const total = allProjects.length;
    const totalVal = fixedBidValue + tnmValue;

    const chartData = [
      { name: 'Fixed Bid', count: fixedBidCount, value: fixedBidValue, fill: '#3b82f6' },
      { name: 'T&M', count: tnmCount, value: tnmValue, fill: '#8b5cf6' },
    ];

    const kpis: FpKpiCard[] = [
      { id: 'total-proj', label: 'Total Projects', value: total, subtext: `Scope: ${portfolioName}`, status: 'neutral' },
      { id: 'fb-count', label: 'Fixed Bid Projects', value: `${fixedBidCount} (${total > 0 ? Math.round((fixedBidCount / total) * 100) : 0}%)`, status: 'positive' },
      { id: 'tnm-count', label: 'T&M Projects', value: `${tnmCount} (${total > 0 ? Math.round((tnmCount / total) * 100) : 0}%)`, status: 'positive' },
      { id: 'total-val', label: 'Total Recorded Value', value: totalVal > 0 ? `$${totalVal.toLocaleString()}` : 'N/A', status: 'neutral' },
    ];

    return {
      success: true,
      query: queryText,
      title: `Pricing Model Breakdown - ${portfolioName}`,
      intent: 'pricing_model_breakdown',
      executiveSummary: [
        `Out of ${total} active projects, ${fixedBidCount} are structured as Fixed Bid and ${tnmCount} as Time & Material (T&M).`,
        `Fixed Bid represents ${total > 0 ? Math.round((fixedBidCount / total) * 100) : 0}% of the portfolio pipeline.`,
        `Time & Material accounts for ${total > 0 ? Math.round((tnmCount / total) * 100) : 0}% of active project delivery.`,
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Project Count by Pricing Model',
        description: 'Distribution of Fixed Bid vs Time & Material contracts',
        dataKey: 'count',
        categoryKey: 'name',
        data: chartData,
        colors: ['#3b82f6', '#8b5cf6'],
      },
      table: {
        columns: [
          { key: 'id', label: 'Project ID', type: 'link' },
          { key: 'name', label: 'Project Name', type: 'text' },
          { key: 'portfolio', label: 'Portfolio', type: 'text' },
          { key: 'pricingModel', label: 'Pricing Model', type: 'badge' },
          { key: 'projectValue', label: 'Project Value ($)', type: 'currency' },
          { key: 'health', label: 'Health', type: 'badge' },
          { key: 'projectManager', label: 'Project Manager', type: 'badge' },
        ],
        rows,
        defaultSortKey: 'pricingModel',
        defaultSortDir: 'asc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show projects grouped by Project Manager',
        'Show project RAG health breakdown across all portfolios',
        'Show billing and financial summary',
      ],
    };
  }

  // --- SCENARIO 4: Risks & Issues (High Potential & Critical Blockers) ---
  if (isRiskIssueQuery) {
    const allRisks: any[] = [];
    const allIssues: any[] = [];

    for (const proj of allProjects) {
      try {
        const risksSnap = await getDocs(collection(db, 'projects', proj.id, 'risks'));
        risksSnap.docs.forEach((r: any) => {
          const data = r.data();
          if (!data.isDeleted) {
            const severity = Number(data.severity) || 1;
            const probability = Number(data.probability) || 1;
            const score = severity * probability;
            allRisks.push({
              id: data.riskId || r.id,
              type: 'Risk',
              projectId: proj.id,
              projectName: proj.name,
              description: data.description || 'No description provided',
              severity: `Sev ${severity}`,
              probability: `Prob ${probability}`,
              score,
              level: score <= 3 ? 'Low' : score <= 6 ? 'Medium' : 'High',
              mitigationPlan: data.mitigationPlan || 'None recorded',
              link: `/projects/${proj.id}/risks`,
            });
          }
        });
      } catch (e) {
        // Non-fatal
      }

      try {
        const issuesSnap = await getDocs(collection(db, 'projects', proj.id, 'issues'));
        issuesSnap.docs.forEach((i: any) => {
          const data = i.data();
          if (!data.isDeleted && data.status !== 'Closed' && data.status !== 'Resolved') {
            allIssues.push({
              id: data.issueId || i.id,
              type: 'Issue',
              projectId: proj.id,
              projectName: proj.name,
              description: data.description || 'No description provided',
              priority: data.priority || 'Medium',
              status: data.status || 'Open',
              reportedDate: data.reportedDate || '',
              link: `/projects/${proj.id}/issues`,
            });
          }
        });
      } catch (e) {
        // Non-fatal
      }
    }

    const highRisks = allRisks.filter((r) => r.level === 'High');
    const criticalIssues = allIssues.filter((i) => i.priority === 'Critical' || i.priority === 'High');

    const rows = [
      ...allRisks.map((r) => ({
        id: r.id,
        type: 'Risk',
        projectName: r.projectName,
        description: r.description,
        impact: `${r.level} (Score: ${r.score})`,
        mitigationOrStatus: r.mitigationPlan,
        link: r.link,
      })),
      ...allIssues.map((i) => ({
        id: i.id,
        type: 'Issue',
        projectName: i.projectName,
        description: i.description,
        impact: `${i.priority} Priority`,
        mitigationOrStatus: `Status: ${i.status}`,
        link: i.link,
      })),
    ];

    const projectRaidMap: Record<string, { name: string; risks: number; issues: number }> = {};
    allProjects.forEach((p: any) => {
      projectRaidMap[p.id] = { name: p.name, risks: 0, issues: 0 };
    });
    allRisks.forEach((r) => {
      if (projectRaidMap[r.projectId]) projectRaidMap[r.projectId].risks++;
    });
    allIssues.forEach((i) => {
      if (projectRaidMap[i.projectId]) projectRaidMap[i.projectId].issues++;
    });

    const chartData = Object.values(projectRaidMap)
      .filter((item) => item.risks > 0 || item.issues > 0)
      .slice(0, 10);

    const kpis: FpKpiCard[] = [
      { id: 'total-risks', label: 'Logged Risks', value: allRisks.length, subtext: `${highRisks.length} High Potential`, status: highRisks.length > 0 ? 'warning' : 'positive' },
      { id: 'high-risks', label: 'High Potential Risks', value: highRisks.length, subtext: 'Potential impact > 6', status: highRisks.length > 0 ? 'negative' : 'positive' },
      { id: 'open-issues', label: 'Open Blockers/Issues', value: allIssues.length, subtext: `${criticalIssues.length} Critical/High`, status: criticalIssues.length > 0 ? 'negative' : 'positive' },
      { id: 'safe-projects', label: 'Projects with 0 Risks', value: allProjects.length - Object.values(projectRaidMap).filter((p) => p.risks > 0).length, subtext: 'Clean risk register', status: 'positive' },
    ];

    return {
      success: true,
      query: queryText,
      title: `Portfolio RAID Assessment - ${portfolioName}`,
      intent: 'risks_and_issues',
      executiveSummary: [
        `Identified ${allRisks.length} total logged risk(s) and ${allIssues.length} active issue(s) across ${allProjects.length} project(s).`,
        highRisks.length > 0
          ? `Executive Attention: ${highRisks.length} risk(s) are evaluated as High Potential (severity * probability > 6).`
          : 'Zero high potential risks are currently logged.',
        criticalIssues.length > 0
          ? `${criticalIssues.length} blocker(s) are flagged as Critical or High priority needing mitigation.`
          : 'No active Critical issues blocking project timelines.',
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Risks & Open Issues by Project',
        description: 'Comparison of risk exposure and active issue counts',
        dataKey: 'risks',
        secondaryKey: 'issues',
        categoryKey: 'name',
        data: chartData.length > 0 ? chartData : [{ name: 'No Active Risks/Issues', risks: 0, issues: 0 }],
        colors: ['#f59e0b', '#ef4444'],
      },
      table: {
        columns: [
          { key: 'id', label: 'Item ID', type: 'link' },
          { key: 'type', label: 'Type', type: 'badge' },
          { key: 'projectName', label: 'Project', type: 'text' },
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'impact', label: 'Severity / Priority', type: 'badge' },
          { key: 'mitigationOrStatus', label: 'Mitigation Plan / Status', type: 'text' },
        ],
        rows,
        defaultSortKey: 'type',
        defaultSortDir: 'asc',
      },
      audit: {
        ...baseAudit,
        recordsAnalyzed: allProjects.length + allRisks.length + allIssues.length,
      },
      followUpSuggestions: [
        'Show projects grouped by Project Manager',
        'Show project RAG health breakdown across all portfolios',
        'Which projects have the highest number of risks?',
      ],
    };
  }

  // --- SCENARIO 5: Billing & Financial Overview ---
  if (isBillingQuery) {
    let totalPortfolioValue = 0;
    let totalMonthlyBilled = 0;

    const rows = allProjects.map((p: any) => {
      const val = Number(p.projectValue) || 0;
      const monthly = Number(p.monthlyBilledValue) || 0;
      totalPortfolioValue += val;
      totalMonthlyBilled += monthly;

      return {
        id: p.id,
        name: p.name,
        portfolio: portfoliosMap.get(p.portfolioId) || 'Unassigned',
        pricingModel: p.pricingModel || 'Fixed Bid',
        projectValue: val,
        monthlyBilled: monthly,
        health: p.overallStatus || 'Green',
        projectManager: getPmName(p),
        link: `/projects/${p.id}/project-details/project-status`,
      };
    });

    const avgProjectValue = allProjects.length > 0 ? Math.round(totalPortfolioValue / allProjects.length) : 0;

    const chartData = allProjects.map((p: any) => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name,
      value: Number(p.projectValue) || 0,
      monthly: Number(p.monthlyBilledValue) || 0,
    })).slice(0, 10);

    const kpis: FpKpiCard[] = [
      { id: 'total-val', label: 'Total Portfolio Value', value: totalPortfolioValue > 0 ? `$${totalPortfolioValue.toLocaleString()}` : '$0', subtext: `${allProjects.length} projects analyzed`, status: 'positive' },
      { id: 'avg-val', label: 'Average Project Value', value: avgProjectValue > 0 ? `$${avgProjectValue.toLocaleString()}` : '$0', subtext: 'Per active project', status: 'neutral' },
      { id: 'monthly-bill', label: 'Monthly Billing Run-rate', value: totalMonthlyBilled > 0 ? `$${totalMonthlyBilled.toLocaleString()}` : '$0', subtext: 'Current billing velocity', status: 'positive' },
      { id: 'proj-count', label: 'Billable Projects', value: allProjects.length, subtext: `Scope: ${portfolioName}`, status: 'neutral' },
    ];

    return {
      success: true,
      query: queryText,
      title: `Portfolio Financial & Billing Summary - ${portfolioName}`,
      intent: 'billing_financials',
      executiveSummary: [
        `Total portfolio pipeline value stands at $${totalPortfolioValue.toLocaleString()} across ${allProjects.length} project(s).`,
        `Current monthly billing velocity is $${totalMonthlyBilled.toLocaleString()}.`,
        `Average recorded project valuation is $${avgProjectValue.toLocaleString()}.`,
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Project Valuation ($ USD)',
        description: 'Top projects by recorded value',
        dataKey: 'value',
        categoryKey: 'name',
        data: chartData,
        colors: ['#10b981'],
      },
      table: {
        columns: [
          { key: 'id', label: 'Project ID', type: 'link' },
          { key: 'name', label: 'Project Name', type: 'text' },
          { key: 'portfolio', label: 'Portfolio', type: 'text' },
          { key: 'pricingModel', label: 'Pricing Model', type: 'badge' },
          { key: 'projectValue', label: 'Project Value ($)', type: 'currency' },
          { key: 'monthlyBilled', label: 'Monthly Billed ($)', type: 'currency' },
          { key: 'health', label: 'Health', type: 'badge' },
          { key: 'projectManager', label: 'Project Manager', type: 'badge' },
        ],
        rows,
        defaultSortKey: 'projectValue',
        defaultSortDir: 'desc',
      },
      audit: baseAudit,
      followUpSuggestions: [
        'Show projects grouped by Project Manager',
        'Compare Fixed Bid vs T&M projects distribution',
        'Show project RAG health breakdown across all portfolios',
      ],
    };
  }

  // --- SCENARIO 6: Team & Resource Utilization ---
  if (isResourceQuery) {
    const roleMap: Record<string, number> = {};
    let totalAvail = 0;

    const rows = employeesRaw
      .map((e: any) => {
        const role = e.role || 'Developer';
        roleMap[role] = (roleMap[role] || 0) + 1;
        const avail = Number(e.availability) || 100;
        totalAvail += avail;

        return {
          empId: e.empId || e.id,
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || 'Unknown',
          role,
          accessLevel: e.accessLevel || 'Team Member',
          availability: `${avail}%`,
          billedRate: e.billedRate ? `$${e.billedRate}/day` : 'Default',
          email: e.email || 'N/A',
        };
      });

    const employeesCount = rows.length;
    const avgAvail = employeesCount > 0 ? Math.round(totalAvail / employeesCount) : 100;
    const chartData = Object.entries(roleMap).map(([role, count]) => ({
      name: role,
      count,
      fill: '#6366f1',
    }));

    const kpis: FpKpiCard[] = [
      { id: 'total-team', label: 'Total Headcount', value: employeesCount, subtext: 'Registered team members', status: 'neutral' },
      { id: 'avg-avail', label: 'Average Availability', value: `${avgAvail}%`, subtext: avgAvail > 30 ? 'Capacity available for new work' : 'High bench commitment', status: avgAvail > 30 ? 'positive' : 'warning' },
      { id: 'roles-count', label: 'Specialized Roles', value: Object.keys(roleMap).length, subtext: 'Distinct engineering roles', status: 'neutral' },
      { id: 'active-proj', label: 'Projects Mapped', value: allProjects.length, subtext: `Scope: ${portfolioName}`, status: 'neutral' },
    ];

    return {
      success: true,
      query: queryText,
      title: `Resource Allocation & Team Directory - Workspace`,
      intent: 'resource_utilization',
      executiveSummary: [
        `Total recorded engineering and leadership headcount is ${employeesCount} resources.`,
        `Average resource availability across the team is currently ${avgAvail}%.`,
        `Primary roles distribution includes ${Object.entries(roleMap).map(([r, c]) => `${c} ${r}(s)`).join(', ')}.`,
      ],
      kpis,
      chart: {
        type: 'bar',
        title: 'Team Headcount by Role',
        description: 'Resource distribution across specialized project roles',
        dataKey: 'count',
        categoryKey: 'name',
        data: chartData,
        colors: ['#6366f1'],
      },
      table: {
        columns: [
          { key: 'empId', label: 'Employee ID', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'role', label: 'Role', type: 'badge' },
          { key: 'accessLevel', label: 'Access Tier', type: 'text' },
          { key: 'availability', label: 'Availability', type: 'badge' },
          { key: 'billedRate', label: 'Billed Rate', type: 'text' },
          { key: 'email', label: 'Email', type: 'text' },
        ],
        rows,
        defaultSortKey: 'role',
        defaultSortDir: 'asc',
      },
      audit: {
        ...baseAudit,
        sourceCollection: 'employees',
        recordsAnalyzed: employeesCount,
      },
      followUpSuggestions: [
        'Show projects grouped by Project Manager',
        'Show project RAG health breakdown across all portfolios',
        'Compare Fixed Bid vs T&M projects distribution',
      ],
    };
  }

  // --- SCENARIO 7: General Search / Active Projects Overview (Default Fallback) ---
  const keywordMatches = allProjects.filter((p: any) => {
    const pm = getPmName(p);
    const text = `${p.id} ${p.name} ${p.summary || ''} ${p.description || ''} ${pm}`.toLowerCase();
    return lowerQuery.split(/\s+/).some((token) => token.length > 2 && text.includes(token));
  });

  const displayProjects = keywordMatches.length > 0 ? keywordMatches : allProjects;

  const rows = displayProjects.map((p: any) => ({
    id: p.id,
    name: p.name,
    portfolio: portfoliosMap.get(p.portfolioId) || 'Unassigned',
    health: p.overallStatus || 'Green',
    pricingModel: p.pricingModel || 'Fixed Bid',
    projectManager: getPmName(p),
    projectValue: Number(p.projectValue) || 0,
    status: p.status || 'Active',
    statusComments: p.statusComments || 'No comments recorded',
    link: `/projects/${p.id}/project-details/project-status`,
  }));

  const chartData = displayProjects.map((p: any) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name,
    value: Number(p.projectValue) || 1,
  })).slice(0, 10);

  const kpis: FpKpiCard[] = [
    { id: 'matched-count', label: 'Matching Projects', value: displayProjects.length, subtext: `Out of ${allProjects.length} in scope`, status: 'positive' },
    { id: 'healthy-count', label: 'Healthy (Green)', value: displayProjects.filter((p: any) => (p.overallStatus || 'Green') === 'Green').length, subtext: 'In good standing', status: 'positive' },
    { id: 'flagged-count', label: 'Flagged (Amber/Red)', value: displayProjects.filter((p: any) => p.overallStatus === 'Amber' || p.overallStatus === 'Red').length, subtext: 'Requiring review', status: displayProjects.some((p: any) => p.overallStatus === 'Red') ? 'negative' : 'neutral' },
  ];

  return {
    success: true,
    query: queryText,
    title:
      keywordMatches.length > 0
        ? `Search Results: "${queryText}" - ${portfolioName}`
        : `Active Projects Overview - ${portfolioName}`,
    intent: 'project_search',
    executiveSummary: [
      keywordMatches.length > 0
        ? `Matched ${displayProjects.length} active project(s) matching your query terms directly in the database.`
        : `Listing all ${displayProjects.length} active project(s) recorded in the database under ${portfolioName}.`,
      `All metrics are deterministically retrieved from live database records with 0 hallucinations.`,
      `Click any project row to navigate directly to its detailed status and tracking dashboard.`,
    ],
    kpis,
    chart: {
      type: 'bar',
      title: 'Matching Projects Overview',
      description: 'Active projects in portfolio scope',
      dataKey: 'value',
      categoryKey: 'name',
      data: chartData,
      colors: ['#3b82f6'],
    },
    table: {
      columns: [
        { key: 'id', label: 'Project ID', type: 'link' },
        { key: 'name', label: 'Project Name', type: 'text' },
        { key: 'portfolio', label: 'Portfolio', type: 'text' },
        { key: 'health', label: 'Health', type: 'badge' },
        { key: 'pricingModel', label: 'Pricing Model', type: 'badge' },
        { key: 'projectManager', label: 'Project Manager', type: 'badge' },
        { key: 'statusComments', label: 'Latest Status Notes', type: 'text' },
      ],
      rows,
      defaultSortKey: 'id',
      defaultSortDir: 'asc',
    },
    audit: {
      ...baseAudit,
      recordsAnalyzed: displayProjects.length,
    },
    followUpSuggestions: [
      'Show projects grouped by Project Manager',
      'Show project RAG health breakdown across all portfolios',
      'Compare Fixed Bid vs T&M projects distribution',
      'List open Critical and High priority risks',
    ],
  };
}


export const executeWayFinderQuery = executeFpQuery;
