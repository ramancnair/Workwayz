import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace, getOrNavigateToProject } from './helpers/testSetup';

test.describe('Pillar 7: Resources, Releases & Administration', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedWorkspace(page, { targetUrl: '/my-projects' });
  });

  test('TC-RES-001: Project Resources view renders allocation tables if project exists', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/resources/project-resources`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Resources|Allocation|Role|Member/i);
  });

  test('TC-REL-001: Release Planning renders release timelines and sprint alignment switch', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/releases/project-releases`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Release|Milestones|Target Date|Status/i);
    await expect(page.getByLabel(/Show Sprints/i)).toBeVisible();
    await page.getByLabel(/Show Sprints/i).click();
  });

  test('TC-RES-002: Global Worklog view is accessible under My Projects with active project selection', async ({ page }) => {
    await page.goto('/worklog', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Worklog/i);
    await expect(page.locator('body')).toContainText(/Hours required for this week|Weekly Total Logged/i);
  });

  test('TC-RES-004: Leave Calendar and Leave Summary views render under consolidated Resources tab', async ({ page }) => {
    const projectId = await getOrNavigateToProject(page);
    await page.goto(`/projects/${projectId}/resources/leave-calendar`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Leave Calendar/i);
    await expect(page.locator('body')).toContainText(/View team availability for the month/i);

    await page.goto(`/projects/${projectId}/holidays/leave-summary`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Leave Summary/i);
    await expect(page.locator('body')).toContainText(/Resource Leave Breakdown|Paid Leaves/i);
  });

  test('TC-ADM-001: User Profile and Messages views render personal details and single-column message list', async ({ page }) => {
    await page.goto('/my-account', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Account|Profile|Email|Password|Settings/i);

    await page.goto('/messages', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/New Message|Inbox|Sent|Starred|Trash/i);
    await expect(page.getByPlaceholder('Search messages...')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Select a message to read');
  });
});
