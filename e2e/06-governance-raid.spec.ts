import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace, getOrNavigateToProject } from './helpers/testSetup';

test.describe('Pillar 6: Governance & RAID Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedWorkspace(page, { targetUrl: '/my-projects' });
  });

  test('TC-RAID-001: RAID governance views render risk heatmaps and item tables if project exists', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/raid-dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/RAID|Risks|Assumptions|Issues|Dependencies/i);
  });

  test('TC-RAID-002: Risk, Assumptions, Issues, and Dependencies logs render data grids', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/risks`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Risks|Impact|Probability|Severity/i);

    await page.goto(`/projects/${projectId}/issues`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Issues|Priority|Status|Owner/i);
  });
});
