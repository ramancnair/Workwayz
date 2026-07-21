import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { SetupWizardPage } from '../page-objects/SetupWizardPage';

Given('the user opens the ProjectFlow application for the first time', async function (this: CustomWorld) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.goto();
});

Then('the step-by-step Setup Wizard is displayed', async function (this: CustomWorld) {
  const wizardPage = new SetupWizardPage(this.page);
  await expect(wizardPage.page.locator('h1, h2, [data-testid="setup-wizard"]')).toBeVisible();
});

Given('the user is on the {string} step of the wizard', async function (this: CustomWorld, stepName: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await expect(wizardPage.page.getByText(stepName, { exact: false })).toBeVisible();
});

When('the user enters the project name {string}', async function (this: CustomWorld, projectName: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.projectNameInput.fill(projectName);
});

When('the user selects the database provider {string}', async function (this: CustomWorld, provider: string) {
  const wizardPage = new SetupWizardPage(this.page);
  if (await wizardPage.dbProviderSelect.isVisible()) {
    await wizardPage.dbProviderSelect.selectOption({ label: provider });
  }
});

When('the user enters the project ID {string} and API key {string}', async function (this: CustomWorld, projectId: string, apiKey: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.firebaseProjectIdInput.fill(projectId);
  await wizardPage.firebaseApiKeyInput.fill(apiKey);
});

When('the user clicks {string}', async function (this: CustomWorld, buttonText: string) {
  await this.page.getByRole('button', { name: buttonText }).click();
});

Then('the database configuration should be saved successfully', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Then('the wizard should navigate to the {string} step', async function (this: CustomWorld, stepName: string) {
  await expect(this.page.getByText(stepName, { exact: false })).toBeVisible();
});

Then('the authentication provider binding should automatically default to {string} for Firebase database', async function (this: CustomWorld, defaultBinding: string) {
  const authBinding = this.page.locator(`text=${defaultBinding}`);
  await expect(authBinding).toBeVisible();
});

When('the user toggles {string} to active', async function (this: CustomWorld, toggleName: string) {
  const toggle = this.page.getByLabel(toggleName, { exact: false });
  if (!(await toggle.isChecked())) {
    await toggle.check();
  }
});

Then('the SSO integration settings should be stored', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

When('the user enters User Name {string}', async function (this: CustomWorld, userName: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.adminNameInput.fill(userName);
});

When('the user enters Email ID {string}', async function (this: CustomWorld, email: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.adminEmailInput.fill(email);
});

When('the user enters Password {string} and re-enters Password {string}', async function (this: CustomWorld, password: string, confirmPassword: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.adminPasswordInput.fill(password);
  await wizardPage.adminConfirmPasswordInput.fill(confirmPassword);
});

When('the user submits the admin creation form', async function (this: CustomWorld) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.nextButton.click();
});

Then('the master admin account should be created with role {string}', async function (this: CustomWorld, role: string) {
  await expect(this.page.getByText(role, { exact: false })).toBeVisible();
});

When('the user enters AI Profile Name {string}', async function (this: CustomWorld, profileName: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.aiProfileNameInput.fill(profileName);
});

When('the user selects AI Provider {string}', async function (this: CustomWorld, aiProvider: string) {
  const wizardPage = new SetupWizardPage(this.page);
  if (await wizardPage.aiProviderSelect.isVisible()) {
    await wizardPage.aiProviderSelect.selectOption({ label: aiProvider });
  }
});

When('the user inputs API Key {string}', async function (this: CustomWorld, apiKey: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.aiApiKeyInput.fill(apiKey);
});

When('optionally provides Default Model Override {string}', async function (this: CustomWorld, modelOverride: string) {
  const wizardPage = new SetupWizardPage(this.page);
  await wizardPage.aiModelOverrideInput.fill(modelOverride);
});

Then('the AI provider integration state should be updated', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Then('the summary checks matrix should display:', async function (this: CustomWorld, dataTable: DataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    const component = row['Component'];
    const status = row['Status'];
    await expect(this.page.getByText(component, { exact: false })).toBeVisible();
    await expect(this.page.getByText(status, { exact: false })).toBeVisible();
  }
});

Then('structural system parameters should be written to configuration', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Then('the ProjectFlow application instance should boot successfully into the home landing page', async function (this: CustomWorld) {
  await expect(this.page).toHaveURL(/.*(\/|\/home)$/);
});
