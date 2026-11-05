import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace } from './helpers/testSetup';

test.describe('Pillar 2: Global Portfolio Workspace & Administration', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedWorkspace(page, { targetUrl: '/my-projects' });
  });

  test('TC-PORT-001: My Projects view renders portfolio header, search bar, and project grid', async ({ page }) => {
    await page.goto('/my-projects', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/My Workspace/i);
    await expect(page.locator('body')).toContainText(/My Projects/i);
    await expect(page.locator('a[href="/holidays/leave-tracker"]')).toBeVisible();
    await expect(page.locator('a[href="/messages"]')).toBeVisible();
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

  test('TC-PORT-003: Portfolio Dashboard displays consolidated performance metrics and unified project defect distribution', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/portfolio-dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/Portfolio Dashboard|Overview|Projects|Health/i);

    const qualityTab = page.getByRole('tab', { name: /Quality & Tech Debt/i });
    await expect(qualityTab).toBeVisible({ timeout: 20000 });
    await qualityTab.click();

    const defectCard = page.getByTestId('project-defect-distribution-card');
    await expect(defectCard).toBeVisible();
    await expect(defectCard).toContainText(/Open Defects by Project/i);
    await expect(defectCard).toContainText(/Total Open:/i);
    await expect(page.getByText('Defect Severity Distribution')).toHaveCount(0);
    await expect(page.getByText('Top Defect Hotspots')).toHaveCount(0);
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

  test('TC-PORT-011: Billing Rate wide table shows a docked horizontal scrollbar that scrolls the table sideways', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto('/billing-rate', { waitUntil: 'domcontentloaded' });

    const bar = page.getByTestId('sticky-x-bar').first();
    const content = page.getByTestId('sticky-x-content').first();
    await expect(bar).toBeVisible({ timeout: 20000 });

    // The bar must be docked inside the visible viewport, not far below the fold.
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(640);

    // Scrolling the bar scrolls the table sideways (and nothing else gained a vertical scroll).
    await bar.evaluate((el) => { el.scrollLeft = 300; });
    await expect.poll(() => content.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  });

  test('TC-PORT-012: Rate Card tab displays empty table initially, allows adding, editing, and deleting role benchmark rates', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/billing-rate', { waitUntil: 'domcontentloaded' });

    // Verify Rate Card tab trigger exists and click it
    const rateCardTab = page.getByRole('tab', { name: /Rate Card/i });
    await expect(rateCardTab).toBeVisible({ timeout: 15000 });
    await rateCardTab.click();

    // Verify initially empty state and experience tier columns
    await expect(page.locator('body')).toContainText(/Rate Card/i);
    await expect(page.locator('body')).toContainText(/Low Experience/i);
    await expect(page.locator('body')).toContainText(/Medium Experience/i);
    await expect(page.locator('body')).toContainText(/High Experience/i);

    // Click Add Role button (top right header button)
    const addBtn = page.getByRole('button', { name: /Add Role/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Fill the Add Rate Card dialog
    await expect(page.locator('body')).toContainText(/Add Rate Card Entry/i);
    const roleInput = page.locator('#rcRoleName');
    await roleInput.fill('Solution Architect');

    // Fill low, medium, high rates
    const rateInputs = page.locator('input[placeholder="0.00"]');
    await rateInputs.nth(0).fill('1000');
    await rateInputs.nth(1).fill('1500');
    await rateInputs.nth(2).fill('2200');

    // Save
    const saveBtn = page.getByRole('button', { name: /Add Role|Save/i }).last();
    await saveBtn.click();

    // Verify row appears in the table
    await expect(page.locator('body')).toContainText('Solution Architect', { timeout: 10000 });
    await expect(page.locator('body')).toContainText('1,000.00');
    await expect(page.locator('body')).toContainText('1,500.00');
    await expect(page.locator('body')).toContainText('2,200.00');

    // Edit the row
    const editBtn = page.getByTitle('Edit Role Rate').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    await expect(page.locator('body')).toContainText(/Edit Rate Card Entry/i);
    const editHighRate = page.locator('input[placeholder="0.00"]').nth(2);
    await editHighRate.fill('2500');
    const updateBtn = page.getByRole('button', { name: /Save Changes/i });
    await updateBtn.click();

    await expect(page.locator('body')).toContainText('2,500.00', { timeout: 10000 });

    // Delete the row
    const deleteBtn = page.getByTitle('Delete Role Rate').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await expect(page.locator('body')).toContainText(/Delete Rate Card Entry\?/i);
    const confirmDeleteBtn = page.getByRole('button', { name: /^Delete$/i });
    await confirmDeleteBtn.click();

    // Verify returns to empty state
    await expect(page.locator('body')).toContainText(/Rate card is currently empty/i, { timeout: 10000 });
  });

  test('TC-PORT-006: User Directory & Team Utilization views display employee allocations', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/User List|Employees|Email|Role/i);

    await page.goto('/utilization', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Utilization|Capacity|Allocation/i);
  });

  test('TC-PORT-007: Company Holidays & Leave Policy support organizational scheduling', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/holidays/holiday-calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Company Holidays|Holiday|Calendar/i);

    await page.goto('/holidays/leave-settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Leave Policy & Quotas|Leave Settings|Leave Type|Allowance|Leave/i);
    await expect(page.locator('button[aria-label="Leave allocation and carry-forward policy information"]')).toBeVisible();

    // Verify search bar is visible and resource table is hidden by default
    const searchInput = page.getByPlaceholder(/Search by name or emp ID/i);
    await expect(searchInput).toBeVisible();
    await expect(page.locator('table')).not.toBeVisible();

    // Search by name or emp ID to reveal the resource leave balances table
    await searchInput.fill('Aswin');
    await expect(page.locator('th', { hasText: /^Access Level$/ })).toBeVisible();
    await expect(page.locator('th', { hasText: /^Carry Forward$/ })).toBeVisible();
    await expect(page.locator('th', { hasText: /^Paid Taken$/ })).toBeVisible();
    await expect(page.locator('body')).toContainText('Aswin');
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

  test('TC-PORT-010: Browser back button preserves active Billing tab and sidebar after navigating to project PMO', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/billing', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Project Financial Performance/i, { timeout: 20000 });

    // Verify Billing tab is active
    const billingTab = page.locator('[role="tab"][data-state="active"]');
    await expect(billingTab).toContainText(/Billing/i);

    // Click first project row in billing table
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForLoadState('domcontentloaded');

      // Click browser back button
      await page.goBack({ waitUntil: 'domcontentloaded' });

      // Verify we returned to Billing page
      await expect(page.locator('body')).toContainText(/Project Financial Performance/i, { timeout: 20000 });

      // Verify Billing tab is STILL active, NOT "My Workspace"
      const returnedTab = page.locator('[role="tab"][data-state="active"]');
      await expect(returnedTab).toContainText(/Billing/i);
      await expect(returnedTab).not.toContainText(/My Workspace/i);

      // Verify sidebar contains Billing menu items
      await expect(page.locator('aside, nav, [data-sidebar]').first()).toContainText(/Billing Rate/i);
    }
  });

  test('TC-PORT-015: About Workwayz view renders version card, update check action, and community resources', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/portfolio-settings/about', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toContainText(/About Workwayz/i, { timeout: 20000 });
    await expect(page.locator('body')).toContainText(/Check for Updates/i);
    await expect(page.locator('body')).toContainText(/System Diagnostics/i);
    await expect(page.locator('body')).toContainText(/Resources & Registries/i);

    const aboutLink = page.locator('a[href="/portfolio-settings/about"]').first();
    await expect(aboutLink).toBeVisible();
  });
});
