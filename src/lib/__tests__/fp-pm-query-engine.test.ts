import { describe, it, expect } from 'vitest';
import { executeFpPmQuery, type FpPmProjectData } from '../fp-pm-query-engine';

describe('executeFpPmQuery', () => {
  const mockProjectData: FpPmProjectData = {
    project: {
      id: 'P2600001',
      name: 'Autogen Project 1',
      portfolioId: 'PF001',
      projectManagerId: 'EMP001',
      overallStatus: 'Green',
      scopeStatus: 'Green',
      costStatus: 'Green',
      timeStatus: 'Green',
      pricingModel: 'Fixed Bid',
      projectValue: 150000,
      startDate: '2026-01-15T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      summary: 'Automated test banking platform overhaul',
    },
    portfolioName: 'Banking & Financial Solutions',
    employees: [
      { id: 'EMP001', empId: 'EMP001', firstName: 'Alice', lastName: 'Walker', email: 'alice@example.com' },
      { id: 'EMP002', empId: 'EMP002', firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' },
    ],
    allUsers: [
      { id: 'EMP001', empId: 'EMP001', firstName: 'Alice', lastName: 'Walker', email: 'alice@example.com' },
    ],
    stories: [
      { id: 'S1', storyId: 'US-01', title: 'User Login', status: 'Done', itemType: 'Requirement/Story', storyPoints: 5, assigneeName: 'Bob Smith' },
      { id: 'S2', storyId: 'US-02', title: 'Payment Processing', status: 'In Progress', itemType: 'Requirement/Story', storyPoints: 8, assigneeName: 'Alice Walker' },
      { id: 'S3', storyId: 'US-03', title: 'Audit Trail Export', status: 'Blocked', itemType: 'Requirement/Story', storyPoints: 3, assigneeName: 'Bob Smith' },
      { id: 'S4', storyId: 'BUG-01', title: 'Null pointer in session', status: 'In Progress', itemType: 'Bug', severity: 'Critical', storyPoints: 2, assigneeName: 'Alice Walker' },
    ],
    sprints: [
      { id: 'SP1', name: 'Sprint 1 - Foundations', status: 'Active', startDate: '2026-02-01', endDate: '2026-02-14' },
    ],
    epics: [
      { id: 'EP1', title: 'Core Banking Engine' },
    ],
    risks: [
      { id: 'R1', riskId: 'RSK-01', description: 'Third-party gateway latency', severity: 3, probability: 3 },
    ],
    issues: [
      { id: 'I1', issueId: 'ISS-01', title: 'API Gateway timeout', priority: 'High', status: 'Open' },
    ],
    assumptions: [],
    dependencies: [],
    testCases: [
      { id: 'TC1', testCaseId: 'TC-01', title: 'Verify Login Flow', status: 'Passed' },
    ],
    worklogs: [
      { employeeId: 'EMP001', hours: 40 },
    ],
    paymentMilestones: [
      { id: 'M1', title: 'Sprint 1 Acceptance', amount: 30000, status: 'Paid' },
    ],
    releases: [],
  };

  it('should answer "What is the portfolio name of this project" with portfolio metadata and zero hallucination', () => {
    const result = executeFpPmQuery('What is the portfolio name of this project', mockProjectData);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('project_profile_and_metadata');
    expect(result.title).toContain('Portfolio Alignment');
    expect(result.executiveSummary.some((s) => s.includes('Banking & Financial Solutions'))).toBe(true);
    expect(result.executiveSummary.some((s) => s.includes('PF001'))).toBe(true);

    const portfolioKpi = result.kpis?.find((k) => k.label === 'Portfolio Name');
    expect(portfolioKpi).toBeDefined();
    expect(portfolioKpi?.value).toBe('Banking & Financial Solutions');

    const pmKpi = result.kpis?.find((k) => k.label === 'Project Manager');
    expect(pmKpi).toBeDefined();
    expect(pmKpi?.value).toBe('Alice Walker');

    expect(result.audit.recordsAnalyzed).toBeGreaterThan(0);
    expect(result.audit.portfolioScope).toContain('Autogen Project 1');
    expect(result.audit.portfolioScope).toContain('Banking & Financial Solutions');
  });

  it('should answer queries about who is the project manager', () => {
    const result = executeFpPmQuery('Who is the project manager of this project?', mockProjectData);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('project_profile_and_metadata');
    expect(result.title).toContain('Project Leadership');
    expect(result.executiveSummary.some((s) => s.includes('Alice Walker'))).toBe(true);
  });

  it('should answer queries about project timeline and schedule', () => {
    const result = executeFpPmQuery('What is the timeline and start date of this project?', mockProjectData);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('project_profile_and_metadata');
    expect(result.title).toContain('Timeline & Schedule');
  });

  it('should correctly process sprint velocity queries', () => {
    const result = executeFpPmQuery('Show current sprint progress and velocity', mockProjectData);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('sprint_delivery');
    expect(result.title).toContain('Sprint Delivery & Velocity');
  });

  it('should correctly process defect breakdown queries', () => {
    const result = executeFpPmQuery('List open bugs and defect severity breakdown', mockProjectData);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('defects_and_quality');
    expect(result.title).toContain('Defect & Quality');
  });

  it('should correctly process RAID governance queries', () => {
    const result = executeFpPmQuery('List critical risks, blockers and open issues', mockProjectData);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('raid_governance');
    expect(result.title).toContain('RAID Governance');
  });

  it('should catch off-topic queries with guardrail response', () => {
    const result = executeFpPmQuery('What is the capital of France and current weather?', mockProjectData);

    expect(result.success).toBe(true);
    expect(result.intent).toBe('unsupported_or_off_topic');
    expect(result.title).toBe('Query Out of Project Scope');
  });
});
