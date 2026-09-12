import { describe, it, expect } from 'vitest';
import { TOOL_CATALOG, TOOL_CATALOG_MAP } from '@/ai/tools/tool-catalog';
import {
  allFlowPilotTools,
  flowpilotToolMap,
  flowpilotAnchorTools,
  toolExecutionStore,
} from '@/ai/flows/flowpilot-tools';

describe('Tier 1: FlowPilot Tool Contracts & Registry Parity (TC-AGENT-TOOL-001)', () => {
  it('registers all 201 tools defined in the tool catalog', () => {
    expect(TOOL_CATALOG.length).toBe(201);
    expect(allFlowPilotTools.length).toBeGreaterThanOrEqual(199);

    const missingInMap: string[] = [];
    for (const toolMeta of TOOL_CATALOG) {
      if (!flowpilotToolMap.has(toolMeta.name)) {
        missingInMap.push(toolMeta.name);
      }
    }

    expect(missingInMap).toEqual([]);
  });

  it('verifies that every registered tool has a valid name, description, and schema', () => {
    for (const tool of allFlowPilotTools) {
      const action = (tool as any).__action || tool;
      const name = action.name;
      const description = action.description;

      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);

      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(5);

      // Verify schema exists
      expect(action.inputSchema || (tool as any).inputSchema).toBeDefined();
    }
  });

  it('provides the mandatory anchor tools for baseline agent grounding', () => {
    expect(flowpilotAnchorTools.length).toBeGreaterThanOrEqual(2);
    const anchorNames = flowpilotAnchorTools.map((t: any) => t.__action?.name || t.name);
    expect(anchorNames).toContain('queryProjectContext');
    expect(anchorNames).toContain('searchTools');
  });

  describe('Direct Tool Handler Execution & Action Recorder Containment', () => {
    it('executes createWorkItemTool and safely records action', async () => {
      const tool = flowpilotToolMap.get('createWorkItem');
      expect(tool).toBeDefined();

      const executedActions: any[] = [];
      const result = await toolExecutionStore.run(executedActions, async () => {
        return await tool({
          projectId: 'test-proj-001',
          itemType: 'Bug',
          title: 'Automated Tier 1 Test Bug',
          description: 'Testing action execution and fallback containment',
          priority: 'High',
          severity: 'Critical',
        });
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(executedActions.length).toBe(1);
      expect(executedActions[0].toolName).toBe('createWorkItem');
      expect(executedActions[0].projectId).toBe('test-proj-001');
    });

    it('executes createPortfolioTool with fallback and action recording', async () => {
      const tool = flowpilotToolMap.get('createPortfolio');
      expect(tool).toBeDefined();

      const executedActions: any[] = [];
      const result = await toolExecutionStore.run(executedActions, async () => {
        return await tool({
          name: 'FinTech Growth Suite',
          description: 'Strategic portfolio for automated tests',
        });
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.name).toBe('FinTech Growth Suite');
      expect(executedActions.length).toBe(1);
      expect(executedActions[0].toolName).toBe('createPortfolio');
    });

    it('executes createSprintTool and tracks sprint metadata', async () => {
      const tool = flowpilotToolMap.get('createSprint');
      expect(tool).toBeDefined();

      const executedActions: any[] = [];
      const result = await toolExecutionStore.run(executedActions, async () => {
        return await tool({
          projectId: 'test-proj-001',
          title: 'Sprint 10 - Agent Automation',
          startDate: '2026-09-15',
          endDate: '2026-09-29',
          goal: 'Automate all agent test verification',
        });
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(executedActions.length).toBe(1);
      expect(executedActions[0].toolName).toBe('createSprint');
    });

    it('executes createRaidItemTool and captures risk parameters', async () => {
      const tool = flowpilotToolMap.get('createRaidItem');
      expect(tool).toBeDefined();

      const executedActions: any[] = [];
      const result = await toolExecutionStore.run(executedActions, async () => {
        return await tool({
          projectId: 'test-proj-001',
          raidType: 'risk',
          description: 'Third-party API rate limit risk exceeding 60 RPM',
          severity: 3,
          probability: 2,
          mitigationPlan: 'Implement exponential backoff caching layer',
        });
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(executedActions.length).toBe(1);
      expect(executedActions[0].toolName).toBe('createRaidItem');
    });

    it('executes queryFbBillingSummaryTool safely and returns structured JSON', async () => {
      const tool = flowpilotToolMap.get('queryFbBillingSummary');
      expect(tool).toBeDefined();

      const result = await tool({
        projectId: 'test-proj-001',
      });

      expect(result).toBeDefined();
      expect(typeof result.billingSummaryJson).toBe('string');
      const parsed = JSON.parse(result.billingSummaryJson);
      expect(parsed).toBeDefined();
    });

    it('executes updateFbContractValueTool safely and records action', async () => {
      const tool = flowpilotToolMap.get('updateFbContractValue');
      expect(tool).toBeDefined();

      const executedActions: any[] = [];
      const result = await toolExecutionStore.run(executedActions, async () => {
        return await tool({
          projectId: 'test-proj-001',
          contractValue: 150000,
        });
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(executedActions.length).toBe(1);
      expect(executedActions[0].toolName).toBe('updateFbContractValue');
    });
  });

  describe('Zod Schema Validation Rejections', () => {
    it('fails validation when mandatory fields are missing', async () => {
      const tool = flowpilotToolMap.get('createWorkItem');
      expect(tool).toBeDefined();

      let errorThrown = false;
      try {
        // Missing mandatory 'projectId' and 'title'
        await (tool as any)({
          description: 'Missing mandatory fields',
        });
      } catch (err: any) {
        errorThrown = true;
        expect(err).toBeDefined();
      }

      expect(errorThrown).toBe(true);
    });

    it('fails validation on invalid enum values', async () => {
      const tool = flowpilotToolMap.get('createWorkItem');
      expect(tool).toBeDefined();

      let errorThrown = false;
      try {
        await (tool as any)({
          projectId: 'proj-123',
          title: 'Invalid item type test',
          itemType: 'NonExistentType' as any,
        });
      } catch (err: any) {
        errorThrown = true;
        expect(err).toBeDefined();
      }

      expect(errorThrown).toBe(true);
    });
  });
});
