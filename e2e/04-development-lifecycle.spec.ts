import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace, getOrNavigateToProject } from './helpers/testSetup';

test.describe('Pillar 4: Development Lifecycle (Backlog, Grooming, Kanban, Tasks)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedWorkspace(page, { targetUrl: '/my-projects' });
  });

  test('TC-DEV-001: Inspect or navigate to Development Dashboard', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/development/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Development|Dashboard|Velocity|Sprints|Stories/i);
  });

  test('TC-DEV-002: Product Backlog displays work items and backlog views', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/development/backlog`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Backlog|Stories|Epics|Sprints/i);
  });

  test('TC-DEV-004: Kanban Board displays columns and task lanes', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/development/kanban`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Kanban|To Do|In Progress|Done|Stories/i);
  });
});
