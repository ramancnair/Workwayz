import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace, getOrNavigateToProject } from './helpers/testSetup';

test.describe('Pillar 5: Quality Assurance & Testing Suite', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedWorkspace(page, { targetUrl: '/my-projects' });
  });

  test('TC-QA-001: Global Quality views display Estimations and Quality Defects matrices', async ({ page }) => {
    await page.goto('/quality/estimations', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Estimations|Quality|Story Points|Hours|Effort/i);

    await page.goto('/quality/defects', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Defects|Quality|Severity|Status/i);
  });

  test('TC-QA-002: Project Testing views support QA lifecycle if project exists', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/testing/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Testing|Dashboard|Test Cases|Pass|Fail/i);
  });
});
