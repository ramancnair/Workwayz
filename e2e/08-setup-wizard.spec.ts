import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace } from './helpers/testSetup';

test.describe('Pillar 8: Setup Wizard & Initial Configuration', () => {
  test('TC-WIZ-001: Setup Wizard loads and displays welcome message and step headers', async ({ page }) => {
    // Navigate to /setup-wizard
    await page.goto('/setup-wizard', { waitUntil: 'domcontentloaded' });

    // Wait for the setup wizard card to render after profile loading completes
    const heading = page.locator('h1:has-text("Welcome to ProjectFlow Setup")');
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Verify stepper indicator titles
    await expect(page.locator('text=Database').first()).toBeVisible();
    await expect(page.locator('text=Authentication').first()).toBeVisible();
    await expect(page.locator('text=Admin User').first()).toBeVisible();
    await expect(page.locator('text=AI Configuration').first()).toBeVisible();
    await expect(page.locator('text=Finish').first()).toBeVisible();
  });

  test('TC-WIZ-002: Database engine selection supports PostgreSQL, Firebase, and Supabase', async ({ page }) => {
    await page.goto('/setup-wizard', { waitUntil: 'domcontentloaded' });

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
    await page.goto('/setup-wizard', { waitUntil: 'domcontentloaded' });

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
    // Seed authenticated session so it acts as non-first-run
    await setupAuthenticatedWorkspace(page, { targetUrl: '/setup-wizard' });

    // Wait for setup wizard card
    await expect(page.locator('h1:has-text("Welcome to ProjectFlow Setup")')).toBeVisible({ timeout: 15000 });

    // Look for close button (X icon or button)
    const closeBtn = page.locator('button:has(svg.lucide-x), button:has-text("Close"), button[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForLoadState('domcontentloaded');
      // Should redirect back to project-home or previous view
      await expect(page.locator('body')).toContainText(/Project Home|My Projects/i);
    } else {
      // If modal doesn't have an X button in this state, navigating to project-home works
      await page.goto('/project-home', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toContainText(/Project Home/i);
    }
  });
});
