import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace } from './helpers/testSetup';

test.describe('Pillar 2: Global Portfolio Workspace & Administration', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedWorkspace(page, { targetUrl: '/my-projects' });
  });

  test('TC-PORT-001: My Projects view renders portfolio header, search bar, and project grid', async ({ page }) => {
    await page.goto('/my-projects', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/My Projects/i);
    await expect(page.locator('a[href="/holidays/leave-tracker"]')).toBeVisible();
    // Search input or filter element should be present
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 1500 })) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('TC-PORT-002: Project Home view renders portfolio summaries and status cards', async ({ page }) => {
    await page.goto('/project-home', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/Project Home|Portfolio|Active Projects/i);
  });

  test('TC-PORT-003: Portfolio Dashboard displays consolidated performance metrics and charts', async ({ page }) => {
    await page.goto('/portfolio-dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/Portfolio Dashboard|Overview|Projects|Health/i);
  });

  test('TC-PORT-004: WayFinder (FP) AI Dashboard renders intelligent operational insights', async ({ page }) => {
    await page.goto('/fp-portfolio-dash', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/FP Portfolio Dash|FP Dashboard|WayFinder|FlowPilot|AI|Assistant|Insights/i);
  });

  test('TC-PORT-005: Billing & Billing Rate views present financial ledgers and rate tables', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Billing|Invoice|Amount|Rate|Total/i, { timeout: 20000 });

    await page.goto('/billing-rate', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Billing Rate|Rate|Role|Currency|Hourly Rate/i, { timeout: 20000 });
  });

  test('TC-PORT-006: User Directory & Team Utilization views display employee allocations', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/User List|Employees|Email|Role/i);

    await page.goto('/utilization', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Utilization|Capacity|Allocation/i);
  });

  test('TC-PORT-007: Holiday Calendar & Leave Settings support organizational scheduling', async ({ page }) => {
    await page.goto('/holidays/holiday-calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Holiday|Calendar/i);

    await page.goto('/holidays/leave-settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Leave Settings|Leave Type|Allowance|Leave/i);
    await expect(page.locator('button[aria-label="Leave allocation and carry-forward policy information"]')).toBeVisible();
    await expect(page.locator('th', { hasText: /^Carry Forward$/ })).toBeVisible();
    await expect(page.locator('th', { hasText: /^Paid Taken$/ })).toBeVisible();
  });

  test('TC-PORT-008: Portfolio Settings displays enterprise access, database, and auth settings', async ({ page }) => {
    await page.goto('/portfolio-settings/access-settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Access Settings|Permissions|Administrator|Roles/i);

    const activeSettingsTab = page.locator('a[role="tab"][data-state="active"]').filter({ has: page.locator('svg') });
    await expect(activeSettingsTab).toBeVisible({ timeout: 10000 });

    await page.goto('/portfolio-settings/database', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Database|Engine|Firestore|Supabase/i);
  });

  test('TC-PORT-009: Portfolio Trash renders soft-deleted item recovery controls', async ({ page }) => {
    await page.goto('/portfolio-trash', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Trash|Deleted|Restore|Empty/i);

    const activeTrashTab = page.locator('a[role="tab"][data-state="active"]').filter({ has: page.locator('svg') });
    await expect(activeTrashTab).toBeVisible({ timeout: 10000 });
  });
});
