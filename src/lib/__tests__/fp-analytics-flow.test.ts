import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect } from 'vitest';
import { runFpAnalyticsQuery, classifyAiError } from '@/ai/flows/fp-analytics-flow';

describe('classifyAiError', () => {
  it('identifies 503 No capacity available error clearly', () => {
    const err = new Error('Error: UNAVAILABLE (code 503): No capacity available for model gemini-3.8-flash-high on the server');
    const res = classifyAiError(err, 'gemini-3.8-flash-high');

    expect(res.errorCategory).toBe('high_demand');
    expect(res.title).toBe('AI Service No Capacity (HTTP 503)');
    expect(res.description).toContain('No capacity available for model gemini-3.8-flash-high on the server');
  });

  it('identifies 429 Quota Exceeded error clearly', () => {
    const err = new Error('RESOURCE_EXHAUSTED: [429 Too Many Requests] You exceeded your current quota, limit: 20');
    const res = classifyAiError(err, 'gemini-2.5-flash');

    expect(res.errorCategory).toBe('quota_exceeded');
    expect(res.title).toBe('AI Quota Exceeded (HTTP 429)');
    expect(res.description).toContain('quota for "gemini-2.5-flash" has been reached');
  });
});

describe('runFpAnalyticsQuery', () => {
  it('throws an error if the query string is empty', async () => {
    await expect(
      runFpAnalyticsQuery({ query: '', scope: 'portfolio' })
    ).rejects.toThrow('Please enter a search query or question.');
  });

  it('runs project analytics on live snapshot and produces structured output', async () => {
    const result = await runFpAnalyticsQuery({
      query: 'Show delayed stories not in Done',
      scope: 'project',
      projectId: 'P2600001',
      projectDataSnapshot: {
        project: { id: 'P2600001', name: 'Alpha Banking', overallStatus: 'Green' },
        sprints: [{ id: 'SP-1', title: 'Sprint 1', status: 'Current' }],
        stories: [
          { storyId: 'ST-1', title: 'Login API', status: 'Done', plannedDate: '2026-08-01', storyPoints: 5 },
          { storyId: 'ST-2', title: 'Card Processing', status: 'In Progress', plannedDate: '2026-08-10', storyPoints: 8 },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.kpis.length).toBe(4);
    expect(result.chart).toBeDefined();
    expect(result.table).toBeDefined();
    expect(result.executiveSummary.length).toBeGreaterThan(0);
  }, 30000);

  it('runs portfolio analytics on live snapshot and produces structured output', async () => {
    const result = await runFpAnalyticsQuery({
      query: 'Show projects grouped by PM',
      scope: 'portfolio',
      portfolioId: 'all',
      portfolioDataSnapshot: {
        portfolios: [{ id: 'PF001', name: 'Core Banking' }],
        projects: [
          { id: 'P2600001', name: 'Alpha', projectManager: 'Alice Walker', overallStatus: 'Green', pricingModel: 'Fixed Bid' },
          { id: 'P2600002', name: 'Beta', projectManager: 'Bob Smith', overallStatus: 'Amber', pricingModel: 'T&M' },
        ],
        employees: [
          { id: 'EMP-1', name: 'Alice Walker' },
          { id: 'EMP-2', name: 'Bob Smith' },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.title).toBeDefined();
    expect(result.kpis.length).toBe(4);
    expect(result.chart.type).toBe('bar');
    expect(result.table.rows.length).toBeGreaterThan(0);
  }, 30000);
});
