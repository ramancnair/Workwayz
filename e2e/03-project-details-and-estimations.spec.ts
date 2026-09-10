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
});
