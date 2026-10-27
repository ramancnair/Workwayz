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
  test('TC-QA-003: Quality Hub Set A - Estimation Variance & Defect Containment with expandable cadence breakdown', async ({ page }) => {
    // 1. Estimation Variance & Drift
    await page.goto('/quality/estimations', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h2')).toContainText('Estimation Variance & Drift');
    await expect(page.locator('body')).toContainText('Estimation Variance & Conformance Matrix');
    await expect(page.locator('body')).toContainText('Initial Estimates');
    await expect(page.locator('body')).toContainText('Final Estimates');
    await expect(page.locator('body')).toContainText('Actual Efforts');

    // 2. Defect Containment & Leakage Funnel
    await page.goto('/quality/defects', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h2')).toContainText('Defect Containment & Leakage Funnel');
    await expect(page.locator('body')).toContainText('Portfolio Quality Containment Funnel');
    await expect(page.locator('body')).toContainText('Defect Removal (DRE)');

    // 3. Test expand/collapse toggle if project rows exist
    const chevronButtons = page.locator('button[title*="Expand Sprints & Releases"]');
    if (await chevronButtons.count() > 0) {
      await chevronButtons.first().click();
      await expect(page.locator('body')).toContainText(/Sprint & Release Containment Breakdown|Tracked Cadences/i);
    }
  });
  test('TC-QA-004: Quality Hub & Portfolio Dashboard feature Year filter selector', async ({ page }) => {
    // 1. Estimation Variance Year filter
    await page.goto('/quality/estimations', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('button:has-text("All Years")')).toBeVisible();

    // 2. Defect Containment Year filter
    await page.goto('/quality/defects', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('button:has-text("All Years")')).toBeVisible();

    // 3. Portfolio Dashboard Year filter
    await page.goto('/portfolio-dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('button:has-text("All Years")')).toBeVisible();
  });
});
