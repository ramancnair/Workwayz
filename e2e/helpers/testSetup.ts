import { Page } from '@playwright/test';

export interface TestUserOptions {
  uid?: string;
  empId?: string;
  name?: string;
  email?: string;
  accessLevel?: 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';
  role?: string;
}

export interface SetupOptions {
  targetUrl?: string;
  user?: TestUserOptions;
}

export const DEFAULT_ADMIN_USER: TestUserOptions = {
  uid: 'admin-test-001',
  empId: 'E100001',
  name: 'Alex Vance (Administrator)',
  email: 'admin@workwayz.demo',
  accessLevel: 'Administrator',
  role: 'Administrator',
};

/**
 * Pre-seeds authenticated session credentials, cookies, and local storage
 * before page initialization to ensure deterministic, fast test execution.
 */
export async function setupAuthenticatedWorkspace(
  page: Page,
  options: SetupOptions = {}
): Promise<void> {
  const { targetUrl = '/my-projects', user = DEFAULT_ADMIN_USER } = options;

  const sessionPayload = {
    uid: user.uid || 'admin-test-001',
    empId: user.empId || 'E100001',
    name: user.name || 'Alex Vance (Administrator)',
    email: user.email || 'admin@workwayz.demo',
    accessLevel: user.accessLevel || 'Administrator',
    role: user.role || 'Administrator',
    issuedAt: Date.now(),
    needsPasswordReset: false,
    authProvider: 'local',
  };

  // Set auth cookie
  await page.context().addCookies([
    {
      name: 'workwayz_session_active',
      value: 'true',
      domain: 'localhost',
      path: '/',
    },
  ]);

  // Pre-seed localStorage before DOM evaluates
  await page.addInitScript((session) => {
    localStorage.setItem('workwayz_user', JSON.stringify(session));
    localStorage.setItem('workwayz_remember_me', 'true');
    localStorage.setItem('workwayz_db_provider', 'local');
    localStorage.setItem('workwayz_auth_provider', 'local');
    localStorage.setItem('pf_has_admin', 'true');
    localStorage.setItem('pf_admin_setup_done', 'true');
    sessionStorage.setItem('workwayz_session_active', 'true');
  }, sessionPayload);

  // Navigate to target URL
  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');

  // If Setup Wizard dialog unexpectedly appears, close or dismiss it
  try {
    const wizardHeading = page.locator('text=Workwayz Setup Wizard, text=Select Database Engine');
    if (await wizardHeading.isVisible({ timeout: 800 })) {
      const closeBtn = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  } catch {
    // Ignore if no wizard appeared
  }
}

/**
 * Ensures an active project ID is resolved for project-dependent tests.
 * Resolves from active UI link on /my-projects or defaults to the seeded test initiative.
 */
export async function getOrNavigateToProject(page: Page): Promise<string> {
  await page.goto('/my-projects', { waitUntil: 'domcontentloaded' });
  const projectLink = page.locator('a[href*="/projects/"]').first();
  const hasProject = await projectLink.isVisible({ timeout: 6000 }).catch(() => false);
  if (hasProject) {
    const href = await projectLink.getAttribute('href');
    const match = href?.match(/\/projects\/([^/]+)/);
    if (match) return match[1];
  }
  return 'P2600001';
}
