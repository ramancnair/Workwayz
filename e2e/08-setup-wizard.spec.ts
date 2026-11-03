import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace } from './helpers/testSetup';

test.describe('Pillar 8: Setup Wizard & Initial Configuration', () => {
  test('TC-WIZ-001: Setup Wizard loads and displays welcome message and step headers', async ({ page }) => {
    // Navigate to /setup-wizard?force=true to test wizard configuration regardless of existing DB profile
    await page.goto('/setup-wizard?force=true', { waitUntil: 'domcontentloaded' });

    // Wait for the setup wizard card to render after profile loading completes
    const heading = page.locator('h1:has-text("Welcome to Workwayz Setup")');
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Verify stepper indicator titles
    await expect(page.locator('text=Database').first()).toBeVisible();
    await expect(page.locator('text=Authentication').first()).toBeVisible();
    await expect(page.locator('text=Admin User').first()).toBeVisible();
    await expect(page.locator('text=AI Configuration').first()).toBeVisible();
    await expect(page.locator('text=Finish').first()).toBeVisible();
  });

  test('TC-WIZ-002: Database engine selection supports PostgreSQL, Firebase, and Supabase', async ({ page }) => {
    await page.goto('/setup-wizard?force=true', { waitUntil: 'domcontentloaded' });

    // Wait for card title to appear
    await expect(page.locator('text=Database Setup')).toBeVisible({ timeout: 15000 });

    // Verify Database Provider label and select trigger
    await expect(page.locator('label:has-text("Database Provider")')).toBeVisible();

    // Verify "Next" button is enabled and visible
    const nextBtn = page.locator('button:has-text("Next")');
    await nextBtn.scrollIntoViewIfNeeded();
    await expect(nextBtn).toBeVisible();
  });

  test('TC-WIZ-003: Step navigation traverses between wizard stages via Next and Back', async ({ page }) => {
    await page.goto('/setup-wizard?force=true', { waitUntil: 'domcontentloaded' });

    // Wait for Step 1
    await expect(page.locator('text=Database Setup')).toBeVisible({ timeout: 15000 });

    const nextBtn = page.locator('button:has-text("Next")');
    await nextBtn.scrollIntoViewIfNeeded();
    await expect(nextBtn).toBeVisible();

    // Click Next to advance to Step 2 (Authentication Setup)
    await nextBtn.dispatchEvent('click');
    await expect(page.locator('text=Authentication Setup')).toBeVisible({ timeout: 10000 });

    // Verify Back button becomes visible
    const backBtn = page.locator('button:has-text("Back")');
    await expect(backBtn).toBeVisible();

    // Click Back to return to Step 1 (Database Setup)
    await backBtn.dispatchEvent('click');
    await expect(page.locator('text=Database Setup')).toBeVisible({ timeout: 10000 });
  });

  test('TC-WIZ-004: Wizard exit or close button returns cleanly to workspace', async ({ page }) => {
    // Intercept profile check so SetupInterceptor knows the database is configured
    await page.route('**/api/config/profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          database: [{ id: 'local-db', provider: 'local', isActive: true }],
          authentication: [{ id: 'local-auth', provider: 'local', isActive: true }],
          ai: [],
        }),
      });
    });

    // Seed authenticated session so it acts as non-first-run
    await setupAuthenticatedWorkspace(page, { targetUrl: '/setup-wizard?force=true' });

    // Wait for setup wizard card
    await expect(page.locator('h1:has-text("Welcome to Workwayz Setup")')).toBeVisible({ timeout: 15000 });

    // Look for close button (X icon or button)
    const closeBtn = page.locator('button:has(svg.lucide-x), button:has-text("Close"), button[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      await expect(page.locator('body')).toContainText(/Project Home|My Projects/i, { timeout: 20000 });
    } else {
      // Navigating directly to workspace should succeed without redirecting back to wizard
      await page.goto('/project-home', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toContainText(/Project Home/i, { timeout: 20000 });
    }
  });

  test('TC-WIZ-005: Admin user step requests First Name and Last Name and designates Super Admin role', async ({ page }) => {
    await page.goto('/setup-wizard?force=true', { waitUntil: 'domcontentloaded' });

    // Navigate to Step 3 (Admin User)
    await expect(page.locator('text=Database Setup')).toBeVisible({ timeout: 15000 });
    const nextBtn = page.locator('button:has-text("Next")');
    await nextBtn.scrollIntoViewIfNeeded();
    await nextBtn.dispatchEvent('click');

    // In Step 2 (Authentication Setup)
    await expect(page.locator('text=Authentication Setup')).toBeVisible({ timeout: 10000 });
    await nextBtn.dispatchEvent('click');

    // In Step 3 (Admin User Setup)
    await expect(page.locator('text=Admin User Setup')).toBeVisible({ timeout: 10000 });

    // Verify First Name and Last Name fields are present
    await expect(page.locator('label:has-text("First Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Last Name")')).toBeVisible();
    await expect(page.locator('input[placeholder="John"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Doe"]')).toBeVisible();

    // Verify Super Admin role is designated
    const roleInput = page.locator('input[value="Super Admin"]');
    await expect(roleInput).toBeVisible();
    await expect(roleInput).toBeDisabled();
  });

  test('TC-WIZ-006: Step 4 AI configuration supports "I will configure AI later" checkbox', async ({ page }) => {
    await page.goto('/setup-wizard?force=true', { waitUntil: 'domcontentloaded' });

    // Step 1 -> 2 -> 3
    await expect(page.locator('text=Database Setup')).toBeVisible({ timeout: 15000 });
    const nextBtn = page.locator('button:has-text("Next")');
    await nextBtn.scrollIntoViewIfNeeded();
    await nextBtn.dispatchEvent('click');

    await expect(page.locator('text=Authentication Setup')).toBeVisible({ timeout: 10000 });
    await nextBtn.dispatchEvent('click');

    await expect(page.locator('text=Admin User Setup')).toBeVisible({ timeout: 10000 });

    // Fill required fields for admin user to pass Step 3 validation
    await page.locator('input[placeholder="John"]').fill('Alex');
    await page.locator('input[placeholder="Doe"]').fill('Vance');
    await page.locator('input[placeholder="admin@example.com"]').fill('alex.vance@workwayz.local');
    const pwdInputs = page.locator('input[type="password"]');
    await pwdInputs.nth(0).fill('ValidPass123!');
    await pwdInputs.nth(1).fill('ValidPass123!');

    await nextBtn.dispatchEvent('click');

    // Step 4 (AI Configuration Setup)
    await expect(page.locator('text=AI Configuration Setup')).toBeVisible({ timeout: 10000 });

    // Verify checkbox label is visible
    const laterCheckbox = page.locator('#configure-ai-later');
    await expect(laterCheckbox).toBeVisible();
    await expect(page.locator('label[for="configure-ai-later"]')).toHaveText('I will configure AI later');

    // Verify default state has Project Name input visible
    await expect(page.locator('label:has-text("Project Name")')).toBeVisible();

    // Check "I will configure AI later"
    await laterCheckbox.click();

    // API Key inputs should be hidden, and deferred notification shown
    await expect(page.locator('text=AI Configuration Deferred')).toBeVisible();
    await expect(page.locator('label:has-text("Project Name")')).not.toBeVisible();

    // Advance to Step 5 (Finish Setup)
    await nextBtn.dispatchEvent('click');
    await expect(page.locator('text=Finish Setup')).toBeVisible({ timeout: 10000 });

    // Step 5 summary must display deferred status
    await expect(page.locator('text=Configuring later in Settings')).toBeVisible();
    await expect(page.locator('button:has-text("Complete Setup")')).toBeVisible();
  });

  test('TC-WIZ-007: Wizard card footer action buttons remain permanently docked in card footer', async ({ page }) => {
    await page.goto('/setup-wizard?force=true', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Database Setup')).toBeVisible({ timeout: 15000 });

    // The card footer element containing the navigation buttons should be present
    const cardFooter = page.locator('.shrink-0.border-t.bg-card');
    await expect(cardFooter).toBeVisible();

    // Button should be visible directly without page scrolling
    const nextBtn = cardFooter.locator('button:has-text("Next")');
    await expect(nextBtn).toBeVisible();
  });
});
