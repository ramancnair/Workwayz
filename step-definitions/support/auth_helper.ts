import { Page } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

export const DEFAULT_ADMIN_EMAIL = 'admin@projectflow.com';
export const DEFAULT_ADMIN_PASS = 'P@ssw0rd';

export async function seedAuthUser(
  page: Page,
  accessLevel: string = 'Administrator',
  name: string = 'Admin User',
  email: string = DEFAULT_ADMIN_EMAIL,
  empId: string = 'EMP-101'
) {
  await page.addInitScript(
    ({ level, userName, userEmail, employeeId }) => {
      window.localStorage.setItem(
        'projectflow_user',
        JSON.stringify({
          uid: 'admin-user-uid-101',
          empId: employeeId,
          email: userEmail,
          name: userName,
          accessLevel: level,
          issuedAt: Date.now(),
          authProvider: 'firebase',
          rememberMe: true,
        })
      );
      window.sessionStorage.setItem('projectflow_session_active', 'true');
    },
    { level: accessLevel, userName: name, userEmail: email, employeeId: empId }
  );
}

export async function loginWithCreds(
  page: Page,
  email: string = DEFAULT_ADMIN_EMAIL,
  pass: string = DEFAULT_ADMIN_PASS
) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  if (await loginPage.emailInput.isVisible()) {
    await loginPage.login(email, pass);
  }
}
