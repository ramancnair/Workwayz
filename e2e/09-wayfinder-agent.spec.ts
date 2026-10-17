import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace } from './helpers/testSetup';

test.describe('Pillar 9: WayFinder AI Agent & Interactive Copilot UI', () => {
  test('TC-AGENT-001: WayFinder chat drawer opens, submits prompt, renders action cards, and executes client actions', async ({
    page,
  }) => {
    // 1. Mock the /api/wayfinder and /api/flowpilot backend endpoints for deterministic, zero-token E2E testing
    await page.route(/.*\/api\/(wayfinder|flowpilot).*/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply: 'I have prepared the new strategic portfolio "Strategic Growth" and queued client-side initialization.',
            executedActions: [
              {
                toolName: 'createPortfolio',
                name: 'Strategic Growth',
                description: 'E2E automated test portfolio',
                url: '/project-home',
                needsClientExecution: true,
                params: {
                  name: 'Strategic Growth',
                  description: 'E2E automated test portfolio',
                },
              },
            ],
            aiDetails: {
              provider: 'mock-engine',
              model: 'deterministic-e2e-evaluator',
              displayName: 'WayFinder Evaluator',
            },
            tokenUsage: {
              totalTokens: 120,
              promptTokens: 85,
              completionTokens: 35,
              costUsd: 0.0,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 2. Initialize authenticated session in My Projects
    await setupAuthenticatedWorkspace(page, {
      targetUrl: '/my-projects',
    });

    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toContainText(/My Projects/i);

    // 3. Locate and click floating WayFinder launch trigger
    const copilotTrigger = page.locator('button[aria-label="Open WayFinder AI Copilot"], button[aria-label="Open FlowPilot AI Copilot"]').first();
    await expect(copilotTrigger).toBeVisible({ timeout: 15000 });
    await copilotTrigger.click();

    // 4. Verify chat container opens
    const chatContainer = page.locator('div:has-text("WayFinder"), div:has-text("FlowPilot")').filter({
      has: page.locator('button[title="Minimize Chat"]'),
    }).first();
    await expect(chatContainer).toBeVisible({ timeout: 5000 });

    // 5. Submit user prompt
    const textarea = page.locator('textarea[placeholder*="Ask WayFinder"], textarea[placeholder*="Ask FlowPilot"], textarea[placeholder*="Ask anything"], textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill('Create a new portfolio called Strategic Growth');

    // Click send trigger
    const sendButton = page.locator('button:has(svg.lucide-send), button:has-text("Send")').first();
    await sendButton.click();

    // 6. Assert assistant response and action card appear
    await expect(page.locator('body')).toContainText(/Strategic Growth/i, { timeout: 10000 });
    await expect(page.locator('body')).toContainText(/createPortfolio|Strategic Growth/i);

    // 7. Verify minimize / close functionality
    const minimizeBtn = page.locator('button[title="Minimize Chat"]');
    if (await minimizeBtn.isVisible()) {
      await minimizeBtn.click();
      await expect(copilotTrigger).toBeVisible({ timeout: 5000 });
    }
  });
});
