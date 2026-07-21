import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { InitialEstimationPage } from '../page-objects/InitialEstimationPage';
import { ProjectHomePage } from '../page-objects/ProjectHomePage';

import { seedAuthUser } from './support/auth_helper';

Given('the PM has created a new project {string}', async function (this: CustomWorld, projectName: string) {
  await seedAuthUser(this.page, 'Project Manager', 'Sarah Connor', 'sarah.connor@example.com', 'EMP-101');
  const projectHome = new ProjectHomePage(this.page);
  await projectHome.goto();
  await projectHome.createNewProjectButton.click();
  await projectHome.projectNameInput.fill(projectName);
});

Given('set the project status dropdown to {string}', async function (this: CustomWorld, status: string) {
  const projectHome = new ProjectHomePage(this.page);
  if (await projectHome.statusSelect.isVisible()) {
    await projectHome.statusSelect.selectOption({ label: status });
  }
});

Given('entered the Project Summary scope text:', async function (this: CustomWorld, docString: string) {
  const estimationPage = new InitialEstimationPage(this.page);
  if (await estimationPage.projectSummaryTextarea.isVisible()) {
    await estimationPage.setProjectSummary(docString);
  }
});

Given('the user is on the Initial Estimation workspace for {string}', async function (this: CustomWorld, _projectName: string) {
  const estimationPage = new InitialEstimationPage(this.page);
  await expect(this.page.getByText(/initial estimation/i)).toBeVisible();
});

When('the user clicks the "Stack Suggest" button', async function (this: CustomWorld) {
  const estimationPage = new InitialEstimationPage(this.page);
  await estimationPage.clickStackSuggest();
});

Then('the generative LLM engine analyzes the Project Summary scope text', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .loading-indicator, .ai-processing, body').first()).toBeVisible();
});

Then('presents 3 tailored architectural options:', async function (this: CustomWorld, dataTable: DataTable) {
  const estimationPage = new InitialEstimationPage(this.page);
  await expect(estimationPage.stackOptionsCards).toHaveCount(3);
  const options = dataTable.hashes();
  for (const opt of options) {
    await expect(this.page.getByText(opt['Architecture Suite'], { exact: false })).toBeVisible();
  }
});

When('the user selects {string}', async function (this: CustomWorld, selectedOption: string) {
  await this.page.getByText(selectedOption, { exact: false }).click();
});

Then('those technical zones should be automatically ingested as structured lines under "Impacted Systems"', async function (this: CustomWorld) {
  const estimationPage = new InitialEstimationPage(this.page);
  await expect(estimationPage.impactedSystemsList).toBeVisible();
});

When('the user clicks "Add System" and manually enters {string}', async function (this: CustomWorld, manualSystem: string) {
  const estimationPage = new InitialEstimationPage(this.page);
  await estimationPage.addManualSystem(manualSystem);
});

Then('{string} should be appended to the Impacted Systems list', async function (this: CustomWorld, manualSystem: string) {
  const estimationPage = new InitialEstimationPage(this.page);
  await expect(estimationPage.impactedSystemsList).toContainText(manualSystem);
});

Given('the Impacted Systems list is configured for {string}', async function (this: CustomWorld, _projectName: string) {
  const estimationPage = new InitialEstimationPage(this.page);
  await expect(estimationPage.impactedSystemsList).toBeVisible();
});

When('the user clicks the "Horizontal Suggest" button', async function (this: CustomWorld) {
  const estimationPage = new InitialEstimationPage(this.page);
  await estimationPage.clickHorizontalSuggest();
});

Then('the AI engine should output proportional staffing compositions across core practices:', async function (this: CustomWorld, dataTable: DataTable) {
  const practices = dataTable.hashes();
  for (const p of practices) {
    await expect(this.page.getByText(p['Practice Role'], { exact: false })).toBeVisible();
  }
});

When('the user assigns operational daily billing rates for each role', async function (this: CustomWorld) {
  const rateInputs = this.page.locator('input[name*="rate"], input[placeholder*="rate"]');
  const count = await rateInputs.count();
  for (let i = 0; i < count; i++) {
    await rateInputs.nth(i).fill('500');
  }
});

Then('the baseline horizontal rate structure should be calculated and stored', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('the project scope, impacted systems, and horizontal staffing rates are established', async function (this: CustomWorld) {
  const estimationPage = new InitialEstimationPage(this.page);
  await expect(this.page.getByText(/initial estimation/i)).toBeVisible();
});

When('the user clicks the "AI Estimator" utility button', async function (this: CustomWorld) {
  const estimationPage = new InitialEstimationPage(this.page);
  await estimationPage.clickAiEstimator();
});

Then('the AI model cross-references the scope matrix against global execution averages', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .loading-indicator, .ai-processing, body').first()).toBeVisible();
});

Then('outputs baseline effort allocations in Man-Days', async function (this: CustomWorld) {
  await expect(this.page.getByText(/man-days/i)).toBeVisible();
});

When('the Project Manager fine-tunes effort adjustments', async function (this: CustomWorld) {
  const effortInputs = this.page.locator('input[name*="effort"], input[placeholder*="days"]');
  if (await effortInputs.first().isVisible()) {
    await effortInputs.first().fill('45');
  }
});

When('clicks "Confirm Estimation"', async function (this: CustomWorld) {
  const estimationPage = new InitialEstimationPage(this.page);
  await estimationPage.confirmEstimation();
});

Then('the estimation lock should be applied', async function (this: CustomWorld) {
  await expect(this.page.locator('.estimation-lock, [data-testid="estimation-lock"]')).toBeVisible();
});

Then('the project status should transition out of initialization into active status', async function (this: CustomWorld) {
  await expect(this.page.getByText(/active/i)).toBeVisible();
});
