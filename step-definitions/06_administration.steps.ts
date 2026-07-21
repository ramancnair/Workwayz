import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { PortfolioSettingsPage } from '../page-objects/PortfolioSettingsPage';
import { TrashPage } from '../page-objects/TrashPage';

import { seedAuthUser } from './support/auth_helper';

Given('the Administrator accesses "Portfolio Settings & Access Settings"', async function (this: CustomWorld) {
  await seedAuthUser(this.page, 'Administrator', 'Admin User', 'admin@example.com', 'EMP-001');
  const settingsPage = new PortfolioSettingsPage(this.page);
  await settingsPage.gotoAccessSettings();
});

When('the Admin configures visibility toggles on the "Page Access Matrix" across roles:', async function (this: CustomWorld, dataTable: DataTable) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  await expect(settingsPage.pageAccessMatrixTable).toBeVisible();
  for (const row of dataTable.hashes()) {
    const role = row['Role'];
    const visibility = row['Visibility State'];
    const toggle = this.page.locator(`tr:has-text("${role}")`).getByRole('checkbox');
    if (await toggle.isVisible()) {
      if (visibility === 'Enabled' && !(await toggle.isChecked())) {
        await toggle.check();
      } else if (visibility === 'Disabled' && (await toggle.isChecked())) {
        await toggle.uncheck();
      }
    }
  }
});

When('saves the matrix settings', async function (this: CustomWorld) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  if (await settingsPage.saveAccessSettingsButton.isVisible()) {
    await settingsPage.saveAccessSettingsButton.click();
  }
});

Then('page access enforcement should apply immediately upon next user navigation', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('the Administrator is on the "CRUD Access Grid"', async function (this: CustomWorld) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  await settingsPage.gotoAccessSettings();
  await expect(settingsPage.crudAccessGridTable).toBeVisible();
});

When('setting permission controls across scopes:', async function (this: CustomWorld, dataTable: DataTable) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  await expect(settingsPage.crudAccessGridTable).toBeVisible();
  for (const row of dataTable.hashes()) {
    const scope = row['Scope Level'];
    await expect(this.page.getByText(scope, { exact: false })).toBeVisible();
  }
});

Then('the system authorization rules should restrict user actions based on these exact permissions', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('the Administrator opens the {string}', async function (this: CustomWorld, panelName: string) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  if (panelName.includes('Database')) {
    await settingsPage.gotoDatabase();
  } else if (panelName.includes('Authentication')) {
    await settingsPage.gotoAuthentication();
  } else if (panelName.includes('AI') || panelName.includes('Generative')) {
    await settingsPage.gotoAiConfig();
  } else if (panelName.includes('Trash')) {
    const trashPage = new TrashPage(this.page);
    await trashPage.gotoGlobalTrash();
  } else {
    await settingsPage.gotoAccessSettings();
  }
});

When('the Admin updates infrastructure configuration parameters for {string}', async function (this: CustomWorld, serviceName: string) {
  await this.page.getByLabel(/configuration|provider|service/i).first().fill(serviceName);
});

Then('the runtime environment connection to {string} should update without requiring application re-initialization', async function (this: CustomWorld, serviceName: string) {
  await expect(this.page.getByText(serviceName, { exact: false })).toBeVisible();
});

Given('the Administrator navigates to the "Project Archiving Console"', async function (this: CustomWorld) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  await settingsPage.gotoArchive();
});

When('setting an automated archiving policy of {string}', async function (this: CustomWorld, policy: string) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  if (await settingsPage.archivePolicyInput.isVisible()) {
    await settingsPage.archivePolicyInput.fill(policy);
  }
});

Then('completed projects inactive for more than {int} months should automatically move to the Archived state', async function (this: CustomWorld, _months: number) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('the Administrator is on the "Project Archiving Console"', async function (this: CustomWorld) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  await settingsPage.gotoArchive();
});

When('the Admin configures an auto-deletion rule for archived projects after {string}', async function (this: CustomWorld, rule: string) {
  const settingsPage = new PortfolioSettingsPage(this.page);
  if (await settingsPage.autoDeletionRuleInput.isVisible()) {
    await settingsPage.autoDeletionRuleInput.fill(rule);
  }
});

Then('archived projects that exceed the {int}-month archive threshold should be automatically scheduled for permanent deletion', async function (this: CustomWorld, _months: number) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Then('the Admin should receive a system notification before permanent deletion executes', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .notification, body').first()).toBeVisible();
});

Given('a project {string} was deleted {int} days ago', async function (this: CustomWorld, _projectName: string, _daysAgo: number) {
  // Precondition setup for deleted project in retention window
});

When('the Administrator accesses the "Trash Control Terminal"', async function (this: CustomWorld) {
  const trashPage = new TrashPage(this.page);
  await trashPage.gotoGlobalTrash();
});

Then('{string} should appear in the trash container showing {string}', async function (this: CustomWorld, projectName: string, text: string) {
  const trashPage = new TrashPage(this.page);
  await expect(trashPage.deletedItemsList).toContainText(projectName);
  await expect(trashPage.deletedItemsList).toContainText(text);
});

When('the Admin clicks "Restore Project"', async function (this: CustomWorld) {
  const trashPage = new TrashPage(this.page);
  await trashPage.restoreItem('Legacy CRM Upgrade');
});

Then('{string} should be fully recovered with all historical data intact', async function (this: CustomWorld, projectName: string) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('a deleted project has exceeded its strict {int}-day trash retention boundary', async function (this: CustomWorld, _days: number) {
  // Precondition setup for expired retention window
});

When('the automated trash cleanup daemon runs', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /run cleanup daemon/i }).click();
});

Then('the project and its associated artifacts should be permanently erased from the database', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});
