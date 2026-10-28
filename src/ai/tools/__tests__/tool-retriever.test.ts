import { describe, it, expect } from 'vitest';
import {
  retrieveCandidateTools,
  buildContextualRetrievalQuery,
} from '@/ai/tools/tool-retriever';

describe('Tier 2: WayFinder Tool Retrieval & Discovery Benchmark (TC-AGENT-RETR-001)', () => {
  describe('Contextual Query Builder', () => {
    it('constructs basic query from user message', () => {
      const query = buildContextualRetrievalQuery({
        lastUserMessage: 'Create Sprint 1 for our project',
        currentProjectName: 'Mobile Banking',
      });

      expect(query).toContain('Create Sprint 1');
      expect(query).toContain('Mobile Banking');
    });

    it('enriches query with domain entities from conversation history for co-reference resolution', () => {
      const query = buildContextualRetrievalQuery({
        lastUserMessage: 'Move it to In Progress and increase estimation',
        recentMessages: [
          { role: 'user', content: 'What is the status of BUG-101?' },
          { role: 'model', content: 'BUG-101 is currently in To Do with high defect priority.' },
        ],
        currentProjectName: 'Workwayz Core',
      });

      expect(query).toContain('Move it to In Progress');
      expect(query).toMatch(/BUG-101/i);
    });
  });

  describe('Candidate Tool Selection Accuracy & Recall', () => {
    it('retrieves createSprint for sprint planning queries', async () => {
      const result = await retrieveCandidateTools({
        lastUserMessage: 'Create a new sprint starting next Monday for 2 weeks',
        maxResults: 14,
      });

      expect(result.candidateToolNames).toBeDefined();
      expect(result.candidateToolNames.length).toBeLessThanOrEqual(14);
      expect(result.candidateToolNames).toContain('createSprint');
    });

    it('retrieves createWorkItem for bug and user story requests', async () => {
      const result = await retrieveCandidateTools({
        lastUserMessage: 'Create a new user story or bug for the backlog',
        maxResults: 14,
      });

      expect(result.candidateToolNames).toContain('createWorkItem');
    });

    it('retrieves updateWorkItem for kanban item status updates', async () => {
      const result = await retrieveCandidateTools({
        lastUserMessage: 'Move story to In Progress on Kanban board',
        maxResults: 14,
      });

      expect(result.candidateToolNames).toContain('updateWorkItem');
    });

    it('retrieves createRaidItem and risk tools for risk logging prompts', async () => {
      const result = await retrieveCandidateTools({
        lastUserMessage: 'Log a high severity risk about cloud API latency and rate limits',
        maxResults: 14,
      });

      const matchedRiskTool =
        result.candidateToolNames.includes('createRaidItem') ||
        result.candidateToolNames.includes('queryProjectRisks');
      expect(matchedRiskTool).toBe(true);
    });

    it('retrieves billing and milestone tools for financial queries', async () => {
      const result = await retrieveCandidateTools({
        lastUserMessage: 'Show fixed bid billing overview and milestone invoices',
        maxResults: 14,
      });

      const matchedBilling = result.candidateToolNames.some(
        (name) =>
          name.includes('Billing') ||
          name.includes('billing') ||
          name.includes('Milestone') ||
          name.includes('milestone')
      );
      expect(matchedBilling).toBe(true);
    });

    it('retrieves QA testing tools for test plan and test case queries', async () => {
      const result = await retrieveCandidateTools({
        lastUserMessage: 'Generate automated test cases and create a test plan for authentication',
        maxResults: 14,
      });

      const matchedQA = result.candidateToolNames.some(
        (name) => name.includes('TestCase') || name.includes('TestPlan') || name.includes('test')
      );
      expect(matchedQA).toBe(true);
    });

    it('respects the maxResults boundary and returns valid scores', async () => {
      const result = await retrieveCandidateTools({
        lastUserMessage: 'Show project dashboard metrics',
        maxResults: 8,
      });

      expect(result.candidateToolNames.length).toBeLessThanOrEqual(8);
      expect(result.retrievalMode).toMatch(/hybrid|bm25-local/);
      expect(Object.keys(result.scores).length).toBeGreaterThan(0);
    });
  });
});
