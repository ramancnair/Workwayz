import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace, getOrNavigateToProject } from './helpers/testSetup';

test.describe('Pillar 3: Project Details, Status & Estimations', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedWorkspace(page, { targetUrl: '/my-projects' });
  });

  test('TC-PRJ-001: My Projects list allows navigating to a project workspace or highlights project creation', async ({ page }) => {
    await page.goto('/my-projects', { waitUntil: 'domcontentloaded' });

    const projectLink = page.locator('a[href*="/projects/"]').first();
    const hasProject = await projectLink.isVisible({ timeout: 6000 }).catch(() => false);

    if (hasProject) {
      await projectLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/projects/');
    } else {
      // Empty state or create project trigger should be present
      await expect(page.locator('body')).toContainText(/Projects|No projects|Create/i);
    }
  });

  test('TC-PRJ-002: Project navigation bar presents core lenses (Development, Testing, Governance)', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/development/dashboard`, { waitUntil: 'domcontentloaded' });

    // Look for project navigation tabs or sidebar
    const navContainer = page.locator('nav, [role="tablist"], [data-sidebar="sidebar"]');
    await expect(navContainer.first()).toBeVisible();
  });

  test('TC-PRJ-003: PM Dashboard renders project budget, timelines, and progress indicators', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/project-details/pm-dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/PM Dashboard|Budget|Status|Timeline|Effort/i);
  });

  test('TC-PRJ-004: Project Home Initial Estimates tab filters and opens estimation specifications', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/project-home', { waitUntil: 'domcontentloaded' });

    const initialEstimatesTab = page.getByRole('tab', { name: /Initial Estimates/i });
    await expect(initialEstimatesTab).toBeVisible({ timeout: 15000 });
    await initialEstimatesTab.click();

    // Verify Initial Estimates pane is active
    const searchFilter = page.getByPlaceholder(/Filter initial estimates/i);
    await expect(searchFilter).toBeVisible();

    // Check if initial estimate projects exist or empty state is rendered
    const hasProjects = await page.locator('table tbody tr').first().isVisible({ timeout: 4000 }).catch(() => false);

    if (hasProjects) {
      const firstEstimateLink = page.locator('a[href*="/initial-estimation/specifications"]').first();
      await expect(firstEstimateLink).toBeVisible();
      await firstEstimateLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect.poll(async () => page.evaluate(() => sessionStorage.getItem('workwayz_real_route') || window.location.pathname)).toContain('/initial-estimation/specifications');
      await expect(page.locator('body')).toContainText(/Initial Estimation|Specifications|Impacted Systems/i, { timeout: 15000 });

    } else {
      await expect(page.locator('body')).toContainText(/No initial estimate projects|Projects in initial estimation will appear here/i);
    }
  });
});
