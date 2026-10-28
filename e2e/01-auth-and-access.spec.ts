import { test, expect } from '@playwright/test';
import { setupAuthenticatedWorkspace } from './helpers/testSetup';

test.describe('Pillar 1: Authentication & Access Control', () => {
  test('TC-AUTH-001: Public landing page displays ProjectFlow branding and navigation CTAs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Branding and header
    await expect(page.locator('body')).toContainText(/Workwayz|ProjectFlow/i);
    await expect(page.locator('body')).toContainText(/Log in|Sign In/i);

    // CTAs / inputs
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    const signupLink = page.locator('a[href="/signup"]').first();
    await expect(signupLink).toBeVisible();
  });

  test('TC-AUTH-002: Login screen renders email and password fields with submission trigger', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toContainText(/Log in|Sign In|Welcome back/i);
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('TC-AUTH-003: AuthGuard intercepts unauthenticated visits to protected routes and redirects to /login', async ({ page }) => {
    // Clear cookies & localStorage
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto('/my-projects');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('TC-AUTH-004: Injected administrator session bypasses login and displays My Projects', async ({ page }) => {
    await setupAuthenticatedWorkspace(page, {
      targetUrl: '/my-projects',
      user: {
        accessLevel: 'Administrator',
        name: 'Alex Vance (Administrator)',
        email: 'admin@projectflow.demo',
      },
    });

    await expect(page).toHaveURL(/(.*my-projects|\/$)/);
    await expect(page.locator('body')).toContainText(/My Projects/i);
  });

  test('TC-AUTH-005: Role-based access control restricts unauthorized roles from accessing Portfolio Settings', async ({ page }) => {
    await setupAuthenticatedWorkspace(page, {
      targetUrl: '/portfolio-settings/access-settings',
      user: {
        accessLevel: 'Team Member',
        name: 'Junior Member',
        email: 'member@projectflow.demo',
      },
    });

    // Should either show Access Denied or redirect away from access-settings
    await expect.poll(async () => {
      const hasAccessDenied = await page.locator('text=Access Denied').isVisible().catch(() => false);
      const isRedirected = !page.url().includes('/portfolio-settings/access-settings');
      return hasAccessDenied || isRedirected;
    }, {
      message: 'Expected unauthorized user to be redirected away or shown Access Denied screen',
      timeout: 15000,
    }).toBe(true);
  });

  test('TC-AUTH-006: Non-remembered session does not auto-login after browser restart', async ({ page }) => {
    // Stale session in localStorage but NO browser session cookie (browser was closed), remember me not checked
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.setItem('workwayz_user', JSON.stringify({
        uid: 'admin-test-001',
        empId: 'E100001',
        name: 'Alex Vance',
        email: 'admin@projectflow.demo',
        accessLevel: 'Administrator',
        issuedAt: Date.now() - 10 * 60 * 1000,
        rememberMe: false,
        authProvider: 'firebase',
      }));
    });

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.waitForTimeout(1500);
    expect(page.url()).not.toContain('/my-projects');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('workwayz_user'))).toBeNull();
  });

  test('TC-AUTH-007: Remember-me session survives browser restart and skips the login form', async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.setItem('workwayz_user', JSON.stringify({
        uid: 'admin-test-001',
        empId: 'E100001',
        name: 'Alex Vance',
        email: 'admin@projectflow.demo',
        accessLevel: 'Administrator',
        issuedAt: Date.now() - 10 * 60 * 1000,
        rememberMe: true,
        authProvider: 'firebase',
      }));
    });

    await page.goto('/login');
    await page.waitForURL('**/my-projects', { timeout: 15000 });
    expect(page.url()).toContain('/my-projects');
  });
});
