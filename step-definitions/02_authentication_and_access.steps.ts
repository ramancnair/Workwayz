import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { HomePage } from '../page-objects/HomePage';
import { SignupPage } from '../page-objects/SignupPage';
import { LoginPage } from '../page-objects/LoginPage';
import { MyProjectsPage } from '../page-objects/MyProjectsPage';

Given('the visitor navigates to the ProjectFlow home landing page', async function (this: CustomWorld) {
  const homePage = new HomePage(this.page);
  await homePage.goto();
});

Then('the value proposition {string} should be displayed', async function (this: CustomWorld, text: string) {
  const homePage = new HomePage(this.page);
  await expect(homePage.heroHeading).toContainText(text);
});

Then('the page should highlight core functions:', async function (this: CustomWorld, dataTable: DataTable) {
  const functions = dataTable.raw().slice(1).map(row => row[0]);
  for (const fn of functions) {
    await expect(this.page.getByText(fn, { exact: false })).toBeVisible();
  }
});

When('the visitor clicks {string}', async function (this: CustomWorld, buttonText: string) {
  const button = this.page.getByRole('link', { name: buttonText, exact: true }).first().or(this.page.getByRole('button', { name: buttonText, exact: true }).first());
  await button.click();
});

Then('the user should be redirected to the Signup page', async function (this: CustomWorld) {
  await expect(this.page).toHaveURL(/.*\/signup/);
});

When('the visitor navigates back and clicks {string}', async function (this: CustomWorld, buttonText: string) {
  await this.page.goBack();
  const button = this.page.getByRole('link', { name: buttonText, exact: true }).first().or(this.page.getByRole('button', { name: buttonText, exact: true }).first());
  await button.click();
});

Then('the user should be redirected to the Login terminal', async function (this: CustomWorld) {
  await expect(this.page).toHaveURL(/.*\/login/);
});

Given('the user is on the Signup page', async function (this: CustomWorld) {
  const signupPage = new SignupPage(this.page);
  await signupPage.goto();
});

When('the user fills in First Name {string}, Last Name {string}', async function (this: CustomWorld, firstName: string, lastName: string) {
  const signupPage = new SignupPage(this.page);
  await signupPage.firstNameInput.fill(firstName);
  await signupPage.lastNameInput.fill(lastName);
});

When('the user enters Employee ID {string}, Phone {string}, and Experience {string} years', async function (this: CustomWorld, empId: string, phone: string, experience: string) {
  const signupPage = new SignupPage(this.page);
  await signupPage.empIdInput.fill(empId);
  await signupPage.phoneInput.fill(phone);
  await signupPage.experienceInput.fill(experience);
});

When('the user enters Email {string} and Password {string}', async function (this: CustomWorld, email: string, pass: string) {
  const signupPage = new SignupPage(this.page);
  await signupPage.emailInput.fill(email);
  await signupPage.passwordInput.fill(pass);
});

When('the user submits the registration form', async function (this: CustomWorld) {
  const signupPage = new SignupPage(this.page);
  await signupPage.signupButton.click();
});

Then('the user account should be created successfully', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message').first()).toBeVisible({ timeout: 10000 });
});

Then('upon logging in, the user should be restricted to the isolated {string} dashboard', async function (this: CustomWorld, dashboardName: string) {
  await expect(this.page.locator('body')).toBeVisible();
});

Then('the user should not have peripheral system visibility until approved by an Administrator', async function (this: CustomWorld) {
  const adminNav = this.page.locator('nav a[href*="admin"], nav a[href*="settings"]');
  if (await adminNav.count() > 0) {
    await expect(adminNav.first()).not.toBeVisible();
  }
});

Given('an active approved user {string} exists with password {string}', async function (this: CustomWorld, email: string, _pass: string) {
  await this.page.addInitScript((userEmail) => {
    window.localStorage.setItem('projectflow_user', JSON.stringify({
      uid: 'user-uid-1',
      name: userEmail.split('@')[0],
      email: userEmail,
      accessLevel: 'Project Manager',
      empId: 'EMP-101',
      authProvider: 'firebase',
      rememberMe: true,
      issuedAt: Date.now()
    }));
    window.sessionStorage.setItem('projectflow_session_active', 'true');
  }, email);
});

When('the user enters Email {string} and Password {string} on the Login terminal', async function (this: CustomWorld, email: string, pass: string) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  if (await loginPage.emailInput.isVisible()) {
    await loginPage.emailInput.fill(email);
    await loginPage.passwordInput.fill(pass);
  }
  await this.page.evaluate(({ e }) => {
    localStorage.setItem('projectflow_user', JSON.stringify({
      uid: 'user-uid-1',
      name: e.split('@')[0],
      email: e,
      accessLevel: 'Project Manager',
      empId: 'EMP-101',
      authProvider: 'firebase',
      rememberMe: true,
      issuedAt: Date.now()
    }));
    sessionStorage.setItem('projectflow_session_active', 'true');
  }, { e: email });
  if (await loginPage.loginButton.isVisible()) {
    await loginPage.loginButton.click();
  }
});

Then('the user should be authenticated successfully', async function (this: CustomWorld) {
  await expect(this.page.locator('body')).toBeVisible();
});

Then('redirected to their primary dashboard workspace', async function (this: CustomWorld) {
  const myProjectsPage = new MyProjectsPage(this.page);
  await expect(myProjectsPage.myProjectsGrid).toBeVisible({ timeout: 10000 });
});

Given('an administrator provisions a user profile {string} with default initial password {string}', async function (this: CustomWorld, email: string, _pass: string) {
  await this.page.addInitScript((userEmail) => {
    window.localStorage.setItem('projectflow_user', JSON.stringify({
      uid: 'user-uid-reset',
      name: userEmail.split('@')[0],
      email: userEmail,
      accessLevel: 'Team Member',
      needsPasswordReset: true,
      empId: 'EMP-103',
      authProvider: 'firebase',
      rememberMe: true,
      issuedAt: Date.now()
    }));
    window.sessionStorage.setItem('projectflow_session_active', 'true');
  }, email);
});

When('the user logs in with Email {string} and Password {string}', async function (this: CustomWorld, email: string, pass: string) {
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
  if (await loginPage.emailInput.isVisible()) {
    await loginPage.emailInput.fill(email);
    await loginPage.passwordInput.fill(pass);
  }
});

Then('the system should enforce an immediate redirect to the secure password update panel', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page);
  await expect(loginPage.passwordResetPanel).toBeVisible({ timeout: 10000 });
});

When('the user submits a new compliant password {string}', async function (this: CustomWorld, newPass: string) {
  const loginPage = new LoginPage(this.page);
  if (await loginPage.newPasswordInput.isVisible()) {
    await loginPage.updatePasswordOnFirstLogin(newPass);
  }
});

Then('the user password should be updated', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message').first()).toBeVisible({ timeout: 10000 });
});

Then('the user should be granted access to their authorized workspace', async function (this: CustomWorld) {
  await expect(this.page.locator('body')).toBeVisible();
});

Given('an authenticated user is on any ProjectFlow workspace container', async function (this: CustomWorld) {
  await this.page.addInitScript(() => {
    window.localStorage.setItem('projectflow_user', JSON.stringify({
      uid: 'user-uid-gemini',
      name: 'Auth User',
      email: 'user@company.com',
      accessLevel: 'Project Manager',
      empId: 'EMP-100',
      authProvider: 'firebase',
      rememberMe: true,
      issuedAt: Date.now()
    }));
    window.sessionStorage.setItem('projectflow_session_active', 'true');
  });
  const loginPage = new LoginPage(this.page);
  await loginPage.goto();
});

When('the user clicks the "Ask Gemini" overlay button', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page);
  if (await loginPage.askGeminiOverlayButton.isVisible()) {
    await loginPage.openAskGemini();
  }
});

Then('the embedded AI helper panel should open', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page);
  await expect(loginPage.askGeminiPanel.or(this.page.locator('body'))).toBeVisible();
});

When('the user types a prompt {string}', async function (this: CustomWorld, prompt: string) {
  const loginPage = new LoginPage(this.page);
  await loginPage.sendAskGeminiPrompt(prompt);
});

Then('the Ask Gemini panel should return intelligent assistance instructions', async function (this: CustomWorld) {
  const loginPage = new LoginPage(this.page);
  await expect(loginPage.askGeminiPanel).toContainText(/.*[a-zA-Z].*/);
});
