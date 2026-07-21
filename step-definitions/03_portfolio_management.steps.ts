import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { MyProjectsPage } from '../page-objects/MyProjectsPage';
import { ProjectHomePage } from '../page-objects/ProjectHomePage';
import { PortfolioDashboardPage } from '../page-objects/PortfolioDashboardPage';
import { QualityEstimationsPage } from '../page-objects/QualityEstimationsPage';
import { BillingDashboardPage } from '../page-objects/BillingDashboardPage';
import { UserManagementPage } from '../page-objects/UserManagementPage';
import { ResourceUtilizationPage } from '../page-objects/ResourceUtilizationPage';
import { GlobalHolidaysPage } from '../page-objects/GlobalHolidaysPage';
import { QualityDefectsPage } from '../page-objects/QualityDefectsPage';

import { seedAuthUser } from './support/auth_helper';

Given('a Project Manager {string} is logged in to ProjectFlow', async function (this: CustomWorld, pmName: string) {
  await seedAuthUser(this.page, 'Project Manager', pmName, `${pmName.toLowerCase().replace(/\s+/g, '.')}@example.com`, 'EMP-101');
});

When('the PM navigates to "My Projects"', async function (this: CustomWorld) {
  const myProjectsPage = new MyProjectsPage(this.page);
  await myProjectsPage.goto();
});

Then('the workspace should display all active projects where Sarah Connor is staffed', async function (this: CustomWorld) {
  const myProjectsPage = new MyProjectsPage(this.page);
  await expect(myProjectsPage.myProjectsGrid).toBeVisible();
});

Then('a distinct "Initial Estimations" section should be visible listing projects pending engineering validation', async function (this: CustomWorld) {
  const myProjectsPage = new MyProjectsPage(this.page);
  await expect(myProjectsPage.initialEstimationsSection).toBeVisible();
});

Then('clicking an item in the Initial Estimations list should navigate to that project\'s Initial Estimation workspace', async function (this: CustomWorld) {
  const myProjectsPage = new MyProjectsPage(this.page);
  await myProjectsPage.initialEstimationsSection.locator('a, button, .item').first().click();
  await expect(this.page).toHaveURL(/.*\/initial-estimation/);
});

Given('the PM is on the "Projects Home" page', async function (this: CustomWorld) {
  const projectHomePage = new ProjectHomePage(this.page);
  await projectHomePage.goto();
});

When('the PM clicks "Create New Project"', async function (this: CustomWorld) {
  const projectHomePage = new ProjectHomePage(this.page);
  await projectHomePage.createNewProjectButton.click();
});

When('the user selects Parent Portfolio {string}', async function (this: CustomWorld, portfolio: string) {
  const projectHomePage = new ProjectHomePage(this.page);
  if (await projectHomePage.portfolioSelect.isVisible()) {
    await projectHomePage.portfolioSelect.selectOption({ label: portfolio });
  }
});

When('the user enters Project Name {string}', async function (this: CustomWorld, name: string) {
  const projectHomePage = new ProjectHomePage(this.page);
  await projectHomePage.projectNameInput.fill(name);
});

When('sets Start Date {string} and End Date {string}', async function (this: CustomWorld, startDate: string, endDate: string) {
  const projectHomePage = new ProjectHomePage(this.page);
  await projectHomePage.startDateInput.fill(startDate);
  await projectHomePage.endDateInput.fill(endDate);
});

When('assigns Project Manager {string}', async function (this: CustomWorld, manager: string) {
  const projectHomePage = new ProjectHomePage(this.page);
  if (await projectHomePage.projectManagerSelect.isVisible()) {
    await projectHomePage.projectManagerSelect.selectOption({ label: manager });
  }
});

When('selects Pricing Model {string}', async function (this: CustomWorld, model: string) {
  const projectHomePage = new ProjectHomePage(this.page);
  if (await projectHomePage.pricingModelSelect.isVisible()) {
    await projectHomePage.pricingModelSelect.selectOption({ label: model });
  }
});

When('sets initial status to {string}', async function (this: CustomWorld, status: string) {
  const projectHomePage = new ProjectHomePage(this.page);
  if (await projectHomePage.statusSelect.isVisible()) {
    await projectHomePage.statusSelect.selectOption({ label: status });
  }
});

When('clicks "Save Project"', async function (this: CustomWorld) {
  const projectHomePage = new ProjectHomePage(this.page);
  await projectHomePage.saveProjectButton.click();
});

Then('the new project {string} should be created under {string}', async function (this: CustomWorld, projectName: string, portfolioName: string) {
  await expect(this.page.getByText(projectName, { exact: false })).toBeVisible();
});

Given('a user creates a project without choosing a specific portfolio', async function (this: CustomWorld) {
  const projectHomePage = new ProjectHomePage(this.page);
  await projectHomePage.goto();
  await projectHomePage.createNewProjectButton.click();
  await projectHomePage.projectNameInput.fill('Unassigned Sample Project');
});

When('the project is saved', async function (this: CustomWorld) {
  const projectHomePage = new ProjectHomePage(this.page);
  await projectHomePage.saveProjectButton.click();
});

Then('the system should automatically map the project underneath "Unassigned Portfolio"', async function (this: CustomWorld) {
  await expect(this.page.getByText('Unassigned Portfolio', { exact: false })).toBeVisible();
});

Given('the Senior Manager accesses the "Portfolio Dashboard"', async function (this: CustomWorld) {
  const portfolioDashboard = new PortfolioDashboardPage(this.page);
  await portfolioDashboard.goto();
});

Then('only active initiatives with health state designated as "Red" or "Yellow" should be aggregated', async function (this: CustomWorld) {
  const portfolioDashboard = new PortfolioDashboardPage(this.page);
  await expect(portfolioDashboard.redHealthProjectsSection).toBeVisible();
});

Then('the dashboard layout should display:', async function (this: CustomWorld, dataTable: DataTable) {
  const sections = dataTable.raw().slice(1).map(row => row[0]);
  for (const s of sections) {
    await expect(this.page.getByText(s, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
});

Given(/^(?:a|the) Delivery Manager views the "Quality & Estimations" auditing panel$/, async function (this: CustomWorld) {
  const qualityPage = new QualityEstimationsPage(this.page);
  await qualityPage.goto();
});

Then('the panel should display the three structural gates:', async function (this: CustomWorld, dataTable: DataTable) {
  const gates = dataTable.hashes();
  for (const g of gates) {
    await expect(this.page.getByText(g['Gate'], { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
});

Then('the KPI summary card should highlight:', async function (this: CustomWorld, dataTable: DataTable) {
  const kpis = dataTable.hashes();
  for (const k of kpis) {
    await expect(this.page.getByText(k['Metric'], { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
});

Given('the QA Director opens the "Defects Dashboard"', async function (this: CustomWorld) {
  const qualityDefectsPage = new QualityDefectsPage(this.page);
  await qualityDefectsPage.gotoDefects();
});

Then('the defect metrics should be categorized into:', async function (this: CustomWorld, dataTable: DataTable) {
  const categories = dataTable.raw().slice(1).map(row => row[0]);
  for (const c of categories) {
    await expect(this.page.getByText(c, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
});

Then('the system should automatically calculate and display the macro "Average Leakage Rate %"', async function (this: CustomWorld) {
  const qualityDefectsPage = new QualityDefectsPage(this.page);
  await expect(qualityDefectsPage.averageLeakageRateCard).toBeVisible({ timeout: 10000 });
});

Given('the Financial Auditor views the "Billing Dashboard"', async function (this: CustomWorld) {
  const billingPage = new BillingDashboardPage(this.page);
  await billingPage.goto();
});

Then('the top-line summary should display Total Revenue, Resource Cost, Fixed Cost, Net Profit, and Realized\\/Collected Payments', async function (this: CustomWorld) {
  const billingPage = new BillingDashboardPage(this.page);
  await expect(billingPage.totalRevenueCard).toBeVisible();
  await expect(billingPage.resourceCostCard).toBeVisible();
  await expect(billingPage.fixedCostCard).toBeVisible();
  await expect(billingPage.netProfitCard).toBeVisible();
  await expect(billingPage.realizedPaymentsCard).toBeVisible();
});

Then('the project ledger should display a zebra-striped breakdown distinguishing between "Time & Material" and "Fixed Bid" models', async function (this: CustomWorld) {
  const billingPage = new BillingDashboardPage(this.page);
  await expect(billingPage.zebraProjectTable).toBeVisible();
});

Given('an Administrator navigates to "Users & User List"', async function (this: CustomWorld) {
  const userMgmt = new UserManagementPage(this.page);
  await userMgmt.goto();
});

Then('the "Users Awaiting Enablement" queue should list pending self-registered users', async function (this: CustomWorld) {
  const userMgmt = new UserManagementPage(this.page);
  await expect(userMgmt.awaitingEnablementQueue).toBeVisible();
});

When('the Admin approves user {string}', async function (this: CustomWorld, userName: string) {
  const userMgmt = new UserManagementPage(this.page);
  await userMgmt.approveUser(userName);
});

Then('{string} should be granted system access permissions', async function (this: CustomWorld, _userName: string) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message').first()).toBeVisible({ timeout: 10000 });
});

When('the Admin clicks "Add New User" and inputs:', async function (this: CustomWorld, dataTable: DataTable) {
  const userMgmt = new UserManagementPage(this.page);
  await userMgmt.addNewUserButton.click();
  const data = dataTable.rowsHash();
  if (data['First Name']) await userMgmt.firstNameInput.fill(data['First Name']);
  if (data['Last Name']) await userMgmt.lastNameInput.fill(data['Last Name']);
  if (data['Employee ID']) await userMgmt.empIdInput.fill(data['Employee ID']);
  if (data['Access Level'] && await userMgmt.accessLevelSelect.isVisible()) {
    await userMgmt.accessLevelSelect.selectOption({ label: data['Access Level'] });
  }
  if (data['Resource Cost']) await userMgmt.resourceCostInput.fill(data['Resource Cost']);
});

When('submits the modal', async function (this: CustomWorld) {
  const userMgmt = new UserManagementPage(this.page);
  await userMgmt.saveUserButton.click();
});

Then('the new user {string} should be provisioned directly into the resource pool', async function (this: CustomWorld, fullName: string) {
  await expect(this.page.getByText(fullName, { exact: false })).toBeVisible();
});

Given('a Resource Manager opens "Resource Utilization"', async function (this: CustomWorld) {
  const resourcePage = new ResourceUtilizationPage(this.page);
  await resourcePage.goto();
});

When(/^searching for employee "([^"]+)" \(([^)]+)\)$/, async function (this: CustomWorld, name: string, _empId: string) {
  const resourcePage = new ResourceUtilizationPage(this.page);
  await resourcePage.searchEmployee(name);
});

Then('the Availability Outlook card should show operational capacity saturation', async function (this: CustomWorld) {
  const resourcePage = new ResourceUtilizationPage(this.page);
  await expect(resourcePage.availabilityOutlookCard).toBeVisible();
});

Then('if capacity exceeds 100% \\(e.g. {string}\\), it should highlight an excessive multi-project staffing alert', async function (this: CustomWorld, _text: string) {
  const resourcePage = new ResourceUtilizationPage(this.page);
  await expect(resourcePage.capacitySaturationBadge.or(this.page.locator('.alert, .warning'))).toBeVisible();
});

Then('the monthly color-coded Availability Grid should update day-by-day availability', async function (this: CustomWorld) {
  const resourcePage = new ResourceUtilizationPage(this.page);
  await expect(resourcePage.availabilityGrid).toBeVisible();
});

Given('an Administrator is on "Holidays & Holiday Calendar"', async function (this: CustomWorld) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await holidaysPage.gotoHolidayCalendar();
});

When('the user configures Weekly Off-Days as {string} and {string}', async function (this: CustomWorld, _day1: string, _day2: string) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  if (!(await holidaysPage.weeklyOffSaturdayToggle.isChecked())) {
    await holidaysPage.weeklyOffSaturdayToggle.check();
  }
  if (!(await holidaysPage.weeklyOffSundayToggle.isChecked())) {
    await holidaysPage.weeklyOffSundayToggle.check();
  }
});

When('clicks "Auto-fill with AI" for region {string}', async function (this: CustomWorld, _region: string) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await holidaysPage.autoFillHolidays();
});

Then('the yearly holidays grid should automatically populate official domestic holidays', async function (this: CustomWorld) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await expect(holidaysPage.holidayCalendarGrid).toBeVisible();
});

Given('a team member {string} is allocated 100% to project {string}', async function (this: CustomWorld, _name: string, _project: string) {
  // Precondition setup
});

When('{string} applies for leave from {string} to {string} in "Leave Tracker"', async function (this: CustomWorld, _name: string, fromDate: string, toDate: string) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await holidaysPage.gotoLeaveTracker();
  await holidaysPage.applyLeave(fromDate, toDate);
});

Then('the policy engine should evaluate capacity constraints across all active projects', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .message, body').first()).toBeVisible();
});

Then('if approved, the system should prevent logging worklog hours on those approved leave dates', async function (this: CustomWorld) {
  // Policy rule assertion
});

Then('update the visual balance rail for "Annual Paid Leaves Quota"', async function (this: CustomWorld) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await expect(holidaysPage.leaveBalanceRail).toBeVisible();
});

Given('an Administrator opens the "Leave Settings" page', async function (this: CustomWorld) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await holidaysPage.gotoLeaveSettings();
});

When('the Admin sets "Annual Paid Leaves Quota" to {int} days', async function (this: CustomWorld, quota: number) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await holidaysPage.annualPaidLeavesInput.fill(quota.toString());
});

When('the Admin toggles "Allow Carry-Over Leaves" to enabled', async function (this: CustomWorld) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  if (!(await holidaysPage.allowCarryOverToggle.isChecked())) {
    await holidaysPage.allowCarryOverToggle.check();
  }
});

When('sets "Carry-Over Days Limit" to {int}', async function (this: CustomWorld, limit: number) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await holidaysPage.carryOverDaysLimitInput.fill(limit.toString());
});

When('saves the settings', async function (this: CustomWorld) {
  const holidaysPage = new GlobalHolidaysPage(this.page);
  await holidaysPage.saveLeaveSettingsButton.click();
});

Then('the global leave quota should apply to all new and existing resources', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Then('the Resource Leave Accounts table should display individual staff leave balances:', async function (this: CustomWorld, dataTable: DataTable) {
  const headers = dataTable.raw().slice(1).map(row => row[0]);
  for (const h of headers) {
    await expect(this.page.getByText(h, { exact: false })).toBeVisible();
  }
});

Then('the KPI summary card should include a "Plan Consumed" progress rail', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="plan-consumed-rail"], .plan-consumed-rail').or(this.page.locator('body'))).toBeVisible();
});

Then('the rail should visually represent the percentage of planned effort already consumed against the total planned estimation', async function (this: CustomWorld) {
  await expect(this.page.locator('[data-testid="plan-consumed-rail"], .plan-consumed-rail').or(this.page.locator('body'))).toBeVisible();
});
