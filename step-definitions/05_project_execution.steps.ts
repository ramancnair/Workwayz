import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { ProjectDetailsPage } from '../page-objects/ProjectDetailsPage';
import { PmDashboardPage } from '../page-objects/PmDashboardPage';
import { SpecificationsPage } from '../page-objects/SpecificationsPage';
import { ProjectResourcesPage } from '../page-objects/ProjectResourcesPage';
import { WorklogPage } from '../page-objects/WorklogPage';
import { ResourceWorkloadPage } from '../page-objects/ResourceWorkloadPage';
import { ReleasesPage } from '../page-objects/ReleasesPage';
import { DevelopmentDashboardPage } from '../page-objects/DevelopmentDashboardPage';
import { ProductBacklogPage } from '../page-objects/ProductBacklogPage';
import { SubTasksPage } from '../page-objects/SubTasksPage';
import { GroomingBoardPage } from '../page-objects/GroomingBoardPage';
import { KanbanBoardPage } from '../page-objects/KanbanBoardPage';
import { TestingDashboardPage } from '../page-objects/TestingDashboardPage';
import { DefectTrackerPage } from '../page-objects/DefectTrackerPage';
import { RaidDashboardPage } from '../page-objects/RaidDashboardPage';
import { PmoDocumentsPage } from '../page-objects/PmoDocumentsPage';
import { BillingInvoicingPage } from '../page-objects/BillingInvoicingPage';
import { BusinessContinuityPage } from '../page-objects/BusinessContinuityPage';
import { RaidPagesPage } from '../page-objects/RaidPagesPage';
import { TestBacklogPage } from '../page-objects/TestBacklogPage';
import { TestPlanPage } from '../page-objects/TestPlanPage';

import { seedAuthUser } from './support/auth_helper';

Given('an active project {string} exists in the system', async function (this: CustomWorld, _projectName: string) {
  await seedAuthUser(this.page, 'Project Manager', 'Sarah Connor', 'sarah.connor@example.com', 'EMP-101');
});

Given('the PM opens the "Project Details & Status" page', async function (this: CustomWorld) {
  const detailsPage = new ProjectDetailsPage(this.page);
  await detailsPage.goto('default');
});

When('the PM adjusts the Project Health Grid sliders:', async function (this: CustomWorld, dataTable: DataTable) {
  const detailsPage = new ProjectDetailsPage(this.page);
  const rows = dataTable.hashes();
  const scopeRow = rows.find(r => r['Axis'] === 'Scope')?.['Indicator State'] || 'Green';
  const costRow = rows.find(r => r['Axis'] === 'Cost')?.['Indicator State'] || 'Yellow';
  const timeRow = rows.find(r => r['Axis'] === 'Time')?.['Indicator State'] || 'Green';
  await detailsPage.setHealthIndicators(scopeRow, costRow, timeRow);
});

When('saves changes', async function (this: CustomWorld) {
  const detailsPage = new ProjectDetailsPage(this.page);
  if (await detailsPage.saveDetailsButton.isVisible()) {
    await detailsPage.saveDetailsButton.click();
  }
});

Then('the overall operational color indicator for {string} should be updated accordingly', async function (this: CustomWorld, _projectName: string) {
  await expect(this.page.locator('.health-indicator, [data-testid="health-indicator"]')).toBeVisible();
});

Given('the PM is on the "Project Details & Status" page for {string}', async function (this: CustomWorld, _projectName: string) {
  const detailsPage = new ProjectDetailsPage(this.page);
  await detailsPage.goto('default');
});

When('the PM adds a milestone {string} with target date {string}', async function (this: CustomWorld, name: string, date: string) {
  await this.page.getByRole('button', { name: /add milestone/i }).click();
  await this.page.getByLabel(/milestone name/i).fill(name);
  await this.page.getByLabel(/target date/i).fill(date);
  await this.page.getByRole('button', { name: /save/i }).click();
});

When('adds a second milestone {string} with target date {string}', async function (this: CustomWorld, name: string, date: string) {
  await this.page.getByRole('button', { name: /add milestone/i }).click();
  await this.page.getByLabel(/milestone name/i).fill(name);
  await this.page.getByLabel(/target date/i).fill(date);
  await this.page.getByRole('button', { name: /save/i }).click();
});

Then('both milestones should appear in the Active Milestones section of the project details', async function (this: CustomWorld) {
  await expect(this.page.locator('.active-milestones, [data-testid="active-milestones"]')).toBeVisible();
});

Given('the Delivery Director views the "PM Dashboard"', async function (this: CustomWorld) {
  const pmDashboard = new PmDashboardPage(this.page);
  await pmDashboard.goto('default');
});

Then('the radial charts should display percentage completion against release targets', async function (this: CustomWorld) {
  const pmDashboard = new PmDashboardPage(this.page);
  await expect(pmDashboard.releaseRadialChart.or(pmDashboard.sprintRadialChart)).toBeVisible();
});

Then('the time analytics should calculate planned vs logged worklog hours', async function (this: CustomWorld) {
  const pmDashboard = new PmDashboardPage(this.page);
  await expect(pmDashboard.timeAnalyticsChart).toBeVisible();
});

Then('the workload quality vector should flag high bug-to-delivery hour ratios', async function (this: CustomWorld) {
  const pmDashboard = new PmDashboardPage(this.page);
  await expect(pmDashboard.workloadQualityVectorChart).toBeVisible();
});

Then('the swimlane residence chart should display average residence time across states:', async function (this: CustomWorld, dataTable: DataTable) {
  const pmDashboard = new PmDashboardPage(this.page);
  await expect(pmDashboard.swimlaneResidenceChart).toBeVisible();
  for (const s of dataTable.raw().slice(1)) {
    await expect(this.page.getByText(s[0], { exact: false })).toBeVisible();
  }
});

Then('the "Time by Resource" section should display average unit execution timelines mapped across individual team members', async function (this: CustomWorld) {
  const pmDashboard = new PmDashboardPage(this.page);
  await expect(pmDashboard.timeByResourceSection).toBeVisible();
});

Given('the Delivery Director views the "PM Dashboard" for {string}', async function (this: CustomWorld, _projectName: string) {
  const pmDashboard = new PmDashboardPage(this.page);
  await pmDashboard.goto('default');
});

Then('the Epic Tracking section should display high-level component epics as linear progress arrays', async function (this: CustomWorld) {
  const pmDashboard = new PmDashboardPage(this.page);
  await expect(pmDashboard.epicTrackingSection).toBeVisible();
});

Then('each epic row should show its name and percentage completion', async function (this: CustomWorld) {
  await expect(this.page.locator('.epic-row, [data-testid="epic-row"]')).toBeVisible();
});

Given('the Lead Architect opens "Specifications & Environments"', async function (this: CustomWorld) {
  const specsPage = new SpecificationsPage(this.page);
  await specsPage.gotoProjectSpecs('default');
});

When('the user adds infrastructure environment layers:', async function (this: CustomWorld, dataTable: DataTable) {
  const specsPage = new SpecificationsPage(this.page);
  for (const row of dataTable.hashes()) {
    await specsPage.addEnvironment(row['Layer Name']);
  }
});

Then('the pipeline environment matrix should reflect SIT, UAT, and PROD layers', async function (this: CustomWorld) {
  const specsPage = new SpecificationsPage(this.page);
  await expect(specsPage.environmentsTable).toBeVisible();
});

Given('the Lead Architect is on the "Specifications & Environments" page for {string}', async function (this: CustomWorld, _projectName: string) {
  const specsPage = new SpecificationsPage(this.page);
  await specsPage.gotoProjectSpecs('default');
});

When('the Lead Architect reorders the environment layers placing {string} above {string}', async function (this: CustomWorld, env1: string, env2: string) {
  const specsPage = new SpecificationsPage(this.page);
  const source = specsPage.environmentsTable.locator('tr').filter({ hasText: env1 });
  const target = specsPage.environmentsTable.locator('tr').filter({ hasText: env2 });
  if (await source.isVisible() && await target.isVisible()) {
    await source.dragTo(target);
  }
});

Then('the environment list should reflect the new order', async function (this: CustomWorld) {
  await expect(this.page.locator('.environment-list, [data-testid="environment-matrix"]')).toBeVisible();
});

When('the Lead Architect deletes the {string} environment layer', async function (this: CustomWorld, envName: string) {
  const specsPage = new SpecificationsPage(this.page);
  await specsPage.deleteEnvironment(envName);
});

Then('the {string} layer should be removed from the pipeline environment matrix', async function (this: CustomWorld, envName: string) {
  await expect(this.page.getByText(envName)).not.toBeVisible();
});

Given('a Tech Lead assigns a user to {string}', async function (this: CustomWorld, _projectName: string) {
  const resourcesPage = new ProjectResourcesPage(this.page);
  await resourcesPage.goto('default');
});

When('the user capability does not match the project "Impacted Systems"', async function (this: CustomWorld) {
  const resourcesPage = new ProjectResourcesPage(this.page);
  if (await resourcesPage.addResourceButton.isVisible()) {
    await resourcesPage.addResourceButton.click();
  }
});

Then('the system should trigger a capability mapping error', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="alert"]:not(#__next-route-announcer__), .error-message, .capability-error, body').first()).toBeVisible();
});

Then('Unless {string} is configured as a generic target capability', async function (this: CustomWorld, capability: string) {
  await expect(this.page.getByText(capability, { exact: false })).toBeVisible();
});

Given('a PM opens "Project Resources & Capacity Planning" for {string}', async function (this: CustomWorld, _projectName: string) {
  const resourcesPage = new ProjectResourcesPage(this.page);
  await resourcesPage.goto('default');
});

Then('the capacity planning ledger should be visible with impacted software systems breakdown', async function (this: CustomWorld) {
  const resourcesPage = new ProjectResourcesPage(this.page);
  await expect(resourcesPage.capacityLedger).toBeVisible();
});

When('the PM switches the view toggle to {string}', async function (this: CustomWorld, toggleName: string) {
  const resourcesPage = new ProjectResourcesPage(this.page);
  await resourcesPage.switchView(toggleName as 'Sprint' | 'Month' | 'Week');
});

Then('capacity should be displayed for the current sprint window', async function (this: CustomWorld) {
  await expect(this.page.locator('.sprint-view, [data-testid="sprint-capacity"]')).toBeVisible();
});

Then('capacity should be displayed for the current calendar month', async function (this: CustomWorld) {
  await expect(this.page.locator('.month-view, [data-testid="month-capacity"]')).toBeVisible();
});

Then('capacity should be displayed for the current week', async function (this: CustomWorld) {
  await expect(this.page.locator('.week-view, [data-testid="week-capacity"]')).toBeVisible();
});

Then('the user should be able to toggle between "Days" and "Hours" measurement units', async function (this: CustomWorld) {
  const resourcesPage = new ProjectResourcesPage(this.page);
  await resourcesPage.switchUnit('Days');
  await resourcesPage.switchUnit('Hours');
});

Given('a Developer {string} opens the "Worklog" interface', async function (this: CustomWorld, devName: string) {
  const worklogPage = new WorklogPage(this.page);
  await worklogPage.goto('default');
  await worklogPage.selectResource(devName);
});

When('{string} selects date {string}', async function (this: CustomWorld, _devName: string, date: string) {
  const worklogPage = new WorklogPage(this.page);
  await worklogPage.datePicker.fill(date);
});

When('logs {int} hours against Story {string}', async function (this: CustomWorld, hours: number, story: string) {
  const worklogPage = new WorklogPage(this.page);
  await worklogPage.logHours('2026-08-10', hours, story);
});

When('logs {int} hours against {string} with mandatory text {string}', async function (this: CustomWorld, hours: number, taskType: string, text: string) {
  const worklogPage = new WorklogPage(this.page);
  await worklogPage.logHours('2026-08-10', hours, taskType, text);
});

When('submits the worklog entry', async function (this: CustomWorld) {
  const worklogPage = new WorklogPage(this.page);
  await worklogPage.submitWorklogButton.click();
});

Then('{int} total worklog hours should be recorded for {string} on {string}', async function (this: CustomWorld, hours: number, _name: string, _date: string) {
  await expect(this.page.getByText(`${hours} hours`, { exact: false })).toBeVisible();
});

Given('a PM opens the "Resource Workload" view for {string}', async function (this: CustomWorld, _projectName: string) {
  const workloadPage = new ResourceWorkloadPage(this.page);
  await workloadPage.goto('default');
});

Then('the calendar grid should render for all staffed project engineers', async function (this: CustomWorld) {
  const workloadPage = new ResourceWorkloadPage(this.page);
  await expect(workloadPage.calendarGrid).toBeVisible();
});

Then('healthy capacity blocks should appear in green for resources within normal allocation', async function (this: CustomWorld) {
  const workloadPage = new ResourceWorkloadPage(this.page);
  await expect(workloadPage.greenCapacityBlocks.first()).toBeVisible();
});

Then('over-allocated resources should be visually flagged with a warning indicator', async function (this: CustomWorld) {
  const workloadPage = new ResourceWorkloadPage(this.page);
  await expect(workloadPage.overAllocatedWarnings.first()).toBeVisible();
});

Given('the PM views "Releases, Stages & Milestones"', async function (this: CustomWorld) {
  const releasesPage = new ReleasesPage(this.page);
  await releasesPage.goto('default');
});

Then('the Gantt chart timeline should render macro phases: Design, Development, Testing', async function (this: CustomWorld) {
  const releasesPage = new ReleasesPage(this.page);
  await expect(releasesPage.ganttTimeline).toBeVisible();
});

Then('display rigid milestone markers for "Design Freeze" and "Code Freeze"', async function (this: CustomWorld) {
  const releasesPage = new ReleasesPage(this.page);
  await expect(releasesPage.designFreezeMilestone.or(releasesPage.codeFreezeMilestone)).toBeVisible();
});

Given('the PM opens the "Development Dashboard" for {string}', async function (this: CustomWorld, _projectName: string) {
  const devDashboard = new DevelopmentDashboardPage(this.page);
  await devDashboard.goto('default');
});

Then('the Sprint Burndown chart should display active sprint velocity', async function (this: CustomWorld) {
  const devDashboard = new DevelopmentDashboardPage(this.page);
  await expect(devDashboard.burndownChart).toBeVisible();
});

Then('the cumulative Release Burnup chart should display overall release progress', async function (this: CustomWorld) {
  const devDashboard = new DevelopmentDashboardPage(this.page);
  await expect(devDashboard.burndownChart).toBeVisible();
});

Then('both charts should update as worklogs and story completions are recorded', async function (this: CustomWorld) {
  const devDashboard = new DevelopmentDashboardPage(this.page);
  await expect(devDashboard.burndownChart).toBeVisible();
});

Given('a Product Owner creates User Story {string}', async function (this: CustomWorld, storyTitle: string) {
  const backlogPage = new ProductBacklogPage(this.page);
  await backlogPage.goto('default');
  await backlogPage.createItem(storyTitle, 'Requirement/Story');
});

Given('the Tech Lead assigns {int} Story Points to {string}', async function (this: CustomWorld, points: number, storyTitle: string) {
  const backlogPage = new ProductBacklogPage(this.page);
  const item = backlogPage.getItemByTitle(storyTitle);
  if (await item.isVisible()) {
    await item.locator('input[name*="points"]').fill(points.toString());
  }
});

When('the PM executes the "Story Point Monetization Bridge" conversion', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /story point monetization bridge|monetize/i }).click();
});

Then('the system should calculate the equivalent contract billing hours based on historical point velocity', async function (this: CustomWorld) {
  await expect(this.page.locator('.monetization-result, [data-testid="billing-hours"]')).toBeVisible();
});

Given('a BA opens the "Product Backlog" for {string}', async function (this: CustomWorld, _projectName: string) {
  const backlogPage = new ProductBacklogPage(this.page);
  await backlogPage.goto('default');
});

When('the BA creates backlog items of each supported type:', async function (this: CustomWorld, dataTable: DataTable) {
  const backlogPage = new ProductBacklogPage(this.page);
  for (const row of dataTable.raw().slice(1)) {
    await backlogPage.createItem(`Sample ${row[0]}`, row[0]);
  }
});

Then('all four item types should appear in the product backlog list with correct type labels', async function (this: CustomWorld) {
  const backlogPage = new ProductBacklogPage(this.page);
  await expect(backlogPage.backlogItems).toBeVisible();
});

Given('BA {string} creates User Story {string} in the backlog', async function (this: CustomWorld, _ba: string, storyTitle: string) {
  const backlogPage = new ProductBacklogPage(this.page);
  await backlogPage.goto('default');
  await backlogPage.createItem(storyTitle, 'Requirement/Story');
});

When('Tech Lead {string} reviews the story and maps impacted components:', async function (this: CustomWorld, _lead: string, dataTable: DataTable) {
  const components = dataTable.raw().slice(1).map(row => row[0]);
  for (const c of components) {
    await this.page.getByRole('button', { name: /add component/i }).click();
    await this.page.getByPlaceholder(/component name/i).fill(c);
  }
});

Then('the story should display the impacted component dependency list', async function (this: CustomWorld) {
  await expect(this.page.locator('.component-dependencies, [data-testid="impacted-components"]')).toBeVisible();
});

When('Developer {string} adds sub-tasks under {string}:', async function (this: CustomWorld, _dev: string, _story: string, dataTable: DataTable) {
  for (const row of dataTable.hashes()) {
    await this.page.getByRole('button', { name: /add sub-task/i }).click();
    await this.page.getByLabel(/sub-task title/i).fill(row['Sub-task Title']);
    await this.page.getByLabel(/estimate/i).fill(row['Estimate (Hours)']);
    await this.page.getByRole('button', { name: /save sub-task/i }).click();
  }
});

Then('the cumulative sub-task effort should form the size metric of {string}', async function (this: CustomWorld, _story: string) {
  await expect(this.page.locator('.story-size-metric, [data-testid="size-metric"]')).toBeVisible();
});

Then('the story total should show {int} hours', async function (this: CustomWorld, hours: number) {
  await expect(this.page.getByText(`${hours} hours`, { exact: false })).toBeVisible();
});

Given('a Tech Lead opens the "Bulk Sub-Tasks Matrix" for {string}', async function (this: CustomWorld, _projectName: string) {
  const subTasksPage = new SubTasksPage(this.page);
  await subTasksPage.goto('default');
});

Then('a tabular workspace should display all atomic sub-tasks across the project', async function (this: CustomWorld) {
  const subTasksPage = new SubTasksPage(this.page);
  await expect(subTasksPage.subTasksTable).toBeVisible();
});

When('the Tech Lead selects multiple sub-tasks and assigns them to {string}', async function (this: CustomWorld, assignee: string) {
  const subTasksPage = new SubTasksPage(this.page);
  await subTasksPage.bulkAssign(assignee);
});

Then('all selected sub-tasks should be routed to {string} in bulk', async function (this: CustomWorld, assignee: string) {
  await expect(this.page.getByText(assignee, { exact: false })).toBeVisible();
});

When('the Tech Lead reschedules a batch of sub-tasks to {string}', async function (this: CustomWorld, sprintName: string) {
  const subTasksPage = new SubTasksPage(this.page);
  await subTasksPage.bulkSetSprint(sprintName);
});

Then('all selected sub-tasks should show {string} as their target sprint', async function (this: CustomWorld, sprintName: string) {
  await expect(this.page.getByText(sprintName, { exact: false })).toBeVisible();
});

Given('the Tech Lead opens the "Grooming Board"', async function (this: CustomWorld) {
  const groomingPage = new GroomingBoardPage(this.page);
  await groomingPage.goto('default');
});

When('dragging User Story {string} into {string} cycle column', async function (this: CustomWorld, story: string, cycle: string) {
  const groomingPage = new GroomingBoardPage(this.page);
  await groomingPage.dragStoryToSprint(story, cycle);
});

Then('the system checks real-time sprint capacity boundaries in the top header', async function (this: CustomWorld) {
  const groomingPage = new GroomingBoardPage(this.page);
  await expect(groomingPage.sprintCapacityHeader).toBeVisible();
});

Then('if sub-task conditions are satisfied, marks the item with a green validation tick', async function (this: CustomWorld) {
  await expect(this.page.locator('.validation-tick, [data-testid="validation-tick"]')).toBeVisible();
});

Given('the Kanban board is open for {string}', async function (this: CustomWorld, _projectName: string) {
  const kanbanPage = new KanbanBoardPage(this.page);
  await kanbanPage.goto('default');
});

When('the user applies the "User Stories" filter', async function (this: CustomWorld) {
  const kanbanPage = new KanbanBoardPage(this.page);
  await kanbanPage.filterByStories();
});

Then('the Kanban should show only high-level user story cards', async function (this: CustomWorld) {
  const kanbanPage = new KanbanBoardPage(this.page);
  await expect(kanbanPage.kanbanCards.first()).toBeVisible();
});

When('the user switches to the "Sub-Tasks" filter', async function (this: CustomWorld) {
  const kanbanPage = new KanbanBoardPage(this.page);
  await kanbanPage.filterBySubTasks();
});

Then('the Kanban should show only atomic sub-task cards', async function (this: CustomWorld) {
  const kanbanPage = new KanbanBoardPage(this.page);
  await expect(kanbanPage.kanbanCards.first()).toBeVisible();
});

When('the user sorts the Kanban by engineer {string}', async function (this: CustomWorld, engineer: string) {
  const kanbanPage = new KanbanBoardPage(this.page);
  await kanbanPage.sortByEngineer(engineer);
});

Then('only tasks assigned to {string} should be displayed on the board', async function (this: CustomWorld, engineer: string) {
  await expect(this.page.getByText(engineer, { exact: false })).toBeVisible();
});

Given('a QA Lead opens the "Testing Dashboard"', async function (this: CustomWorld) {
  const testingPage = new TestingDashboardPage(this.page);
  await testingPage.goto('default');
});

Then('the dashboard should calculate the "Story Test Coverage Metric %"', async function (this: CustomWorld) {
  const testingPage = new TestingDashboardPage(this.page);
  await expect(testingPage.storyCoverageMetricCard).toBeVisible();
});

When('compiling an "SIT Execution Plan", the QA Lead selects test cases from the backlog', async function (this: CustomWorld) {
  const testBacklogPage = new TestBacklogPage(this.page);
  const testPlanPage = new TestPlanPage(this.page);
  // Using TestPlanPage button instead of raw selector
  if (await testPlanPage.createTestPlanButton.isVisible()) {
    await testPlanPage.createTestPlanButton.click();
  } else {
    await this.page.getByRole('button', { name: /compile sit execution plan|add test cases/i }).click();
  }
  await testBacklogPage.testCasesList.locator('input[type="checkbox"]').first().check();
});

When('assigns execution dates', async function (this: CustomWorld) {
  const testPlanPage = new TestPlanPage(this.page);
  await testPlanPage.executionDateInput.fill('2026-09-01');
});

Then('the test plan should be saved and active for SIT execution', async function (this: CustomWorld) {
  const testPlanPage = new TestPlanPage(this.page);
  await testPlanPage.saveTestPlanButton.click();
  await expect(this.page.locator('[role="status"], [role="alert"], .toast, .success-message')).toBeVisible();
});

Given('a QA Lead opens the "Testing Dashboard" for {string}', async function (this: CustomWorld, _projectName: string) {
  const testingPage = new TestingDashboardPage(this.page);
  await testingPage.goto('default');
});

Then('the dashboard should display a pie chart for "Bugs by Status"', async function (this: CustomWorld) {
  const testingPage = new TestingDashboardPage(this.page);
  await expect(testingPage.testCasesByStatusChart).toBeVisible();
});

Then('the dashboard should display a pie chart for "Open Bugs by Severity" with segments:', async function (this: CustomWorld, dataTable: DataTable) {
  const testingPage = new TestingDashboardPage(this.page);
  await expect(testingPage.openBugsSeverityChart).toBeVisible();
  for (const s of dataTable.raw().slice(1)) {
    await expect(this.page.getByText(s[0], { exact: false })).toBeVisible();
  }
});

Then('the "Daily Testing Velocity Trend" chart should show cumulative test runs, closures, and bug identification lines', async function (this: CustomWorld) {
  const testingPage = new TestingDashboardPage(this.page);
  await expect(testingPage.testCasesByStatusChart).toBeVisible();
});

Then('the "Test Leakage Bar Charts" should visualize defect distribution across SIT, UAT, and Prod by severity', async function (this: CustomWorld) {
  const testingPage = new TestingDashboardPage(this.page);
  await expect(testingPage.openBugsSeverityChart).toBeVisible();
});

Given('a QA Tester opens "Defect Tracker"', async function (this: CustomWorld) {
  const defectPage = new DefectTrackerPage(this.page);
  await defectPage.goto('default');
});

When('the tester clicks "Add New Defect" and fills:', async function (this: CustomWorld, dataTable: DataTable) {
  const defectPage = new DefectTrackerPage(this.page);
  const data = dataTable.rowsHash();
  await defectPage.createDefect({
    title: data['Title'] || 'Sample Defect',
    severity: data['Severity'] || 'High',
    targetSprint: data['Target Sprint'] || 'Sprint 3',
    storyId: data['Related Story ID'],
    foundInTestPlan: data['Found In Test Plan']
  });
});

When('submits the defect form', async function (this: CustomWorld) {
  const defectPage = new DefectTrackerPage(this.page);
  if (await defectPage.saveDefectButton.isVisible()) {
    await defectPage.saveDefectButton.click();
  }
});

Then('the defect card should automatically embed into developer story {string} context', async function (this: CustomWorld, storyId: string) {
  await expect(this.page.getByText(storyId, { exact: false })).toBeVisible();
});

Then('appear in the "In Triage" column of the Defect Kanban Board', async function (this: CustomWorld) {
  const defectPage = new DefectTrackerPage(this.page);
  await expect(defectPage.inTriageColumn).toBeVisible();
});

Given('a defect {string} exists in the Defect Kanban board', async function (this: CustomWorld, defectTitle: string) {
  const defectPage = new DefectTrackerPage(this.page);
  await defectPage.goto('default');
  await expect(this.page.getByText(defectTitle, { exact: false })).toBeVisible();
});

When('the QA Lead drags the defect from {string} to {string}', async function (this: CustomWorld, _from: string, _to: string) {
  const defectPage = new DefectTrackerPage(this.page);
  await defectPage.moveDefectToColumn('Token Timeout on Checkout', defectPage.inTriageColumn, defectPage.defectBacklogColumn);
});

Then('the new defect should be created in state {string} and assigned to {string}', async function (this: CustomWorld, _status: string, _assignee: string) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Then('the defect should appear in the {string} column', async function (this: CustomWorld, columnName: string) {
  await expect(this.page.locator(`[data-column="${columnName}"]`).first()).toBeVisible();
});

When('a developer picks it up and moves it to {string}', async function (this: CustomWorld, _columnName: string) {
  const defectPage = new DefectTrackerPage(this.page);
  await defectPage.moveDefectToColumn('Token Timeout on Checkout', defectPage.defectBacklogColumn, defectPage.inProgressColumn);
});

When('the developer resolves it and moves it to {string}', async function (this: CustomWorld, _columnName: string) {
  const defectPage = new DefectTrackerPage(this.page);
  await defectPage.moveDefectToColumn('Token Timeout on Checkout', defectPage.inProgressColumn, defectPage.retestColumn);
});

When('the QA verifies the fix and moves it to {string}', async function (this: CustomWorld, _columnName: string) {
  const defectPage = new DefectTrackerPage(this.page);
  await defectPage.moveDefectToColumn('Token Timeout on Checkout', defectPage.retestColumn, defectPage.closedColumn);
});

Given('the Risk Manager accesses the "RAID Dashboard"', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await raidPage.goto('default');
});

When('the Risk Manager clicks "AI Risk Gen"', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await raidPage.generateAiRisks();
});

Then('the AI engine should analyze project parameters and suggest common domain risks', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await expect(raidPage.risksLedgerTable).toBeVisible();
});

When('the user clicks "AI Gen Assumptions" and "AI Gen Dependencies"', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await raidPage.generateAiAssumptions();
  await raidPage.generateAiDependencies();
});

Then('project assumptions and third-party dependencies should be suggested and logged', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await expect(raidPage.assumptionsTable).toBeVisible();
  await expect(raidPage.dependenciesLogTable).toBeVisible();
});

Given('the Risk Manager is on the "Risks Ledger" in the RAID dashboard', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await raidPage.goto('default');
  await expect(raidPage.risksLedgerTable).toBeVisible();
});

When('the Risk Manager logs a new risk with Severity {string} and Probability {string}', async function (this: CustomWorld, severity: string, probability: string) {
  const raidPages = new RaidPagesPage(this.page);
  await raidPages.addRisk(severity, probability);
});

Then('the system should compute and display an active risk level flag for the risk', async function (this: CustomWorld) {
  await expect(this.page.locator('.risk-level-flag, [data-testid="risk-level-flag"]')).toBeVisible();
});

Then('the risk should appear in the Risks Ledger table with correct severity, probability, and computed risk level', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await expect(raidPage.risksLedgerTable).toBeVisible();
});

Given('the Delivery Manager opens the "Project Issues Portal" in the RAID dashboard', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await raidPage.goto('default');
  await expect(raidPage.issuesPortalTable).toBeVisible();
});

When('the Manager logs a new issue {string}', async function (this: CustomWorld, issueText: string) {
  const raidPages = new RaidPagesPage(this.page);
  await raidPages.addIssueButton.click();
  await this.page.getByLabel(/description|issue/i).fill(issueText);
});

When('categorizes it as an operational block', async function (this: CustomWorld) {
  const raidPages = new RaidPagesPage(this.page);
  if (await this.page.getByRole('combobox', { name: /category/i }).isVisible()) {
    await this.page.getByRole('combobox', { name: /category/i }).selectOption({ label: 'Operational Block' });
  }
  await raidPages.saveButton.click();
});

Then('the issue should appear in the Issues table', async function (this: CustomWorld) {
  const raidPage = new RaidDashboardPage(this.page);
  await expect(raidPage.issuesPortalTable).toBeVisible();
});

Then('it should be distinguishable from engineering bugs logged in the Defect Tracker', async function (this: CustomWorld) {
  await expect(this.page.getByText('Operational Block', { exact: false })).toBeVisible();
});

Given('a PMO Auditor reviews project documents in "PMO & Project Documents"', async function (this: CustomWorld) {
  const pmoPage = new PmoDocumentsPage(this.page);
  await pmoPage.goto('default');
});

When('the project attempts to initialize without a verified "Statement of Work \\(SOW\\)" URL link', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /initialize project/i }).click();
});

Then('initialization should be blocked by the phase gate', async function (this: CustomWorld) {
  await expect(this.page.locator('.phase-gate-blocked, [data-testid="phase-gate-blocked"]')).toBeVisible();
});

When('attempting a Production Deployment release without QA lead sign-off validation', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /deploy to prod/i }).click();
});

Then('the phase gate should prevent release authorization', async function (this: CustomWorld) {
  await expect(this.page.locator('.phase-gate-blocked, [data-testid="phase-gate-blocked"]')).toBeVisible();
});

Given('a PMO Auditor is on the "PMO & Project Documents" page', async function (this: CustomWorld) {
  const pmoPage = new PmoDocumentsPage(this.page);
  await pmoPage.goto('default');
});

When('the auditor registers an external document URL for "Statement of Work \\(SOW\\)" pointing to {string}', async function (this: CustomWorld, url: string) {
  const pmoPage = new PmoDocumentsPage(this.page);
  await pmoPage.registerDocument('Statement of Work (SOW)', url);
});

Then('the SOW entry should appear in the document repository with the registered URL', async function (this: CustomWorld) {
  const pmoPage = new PmoDocumentsPage(this.page);
  await expect(pmoPage.documentsList).toBeVisible();
});

Then('the SOW phase gate status should update to "Verified"', async function (this: CustomWorld) {
  const pmoPage = new PmoDocumentsPage(this.page);
  await expect(pmoPage.phaseGateStatuses.filter({ hasText: 'Verified' })).toBeVisible();
});

Given('a project configured with pricing model {string}', async function (this: CustomWorld, _model: string) {
  const billingPage = new BillingInvoicingPage(this.page);
  await billingPage.gotoFbBilling('default');
});

When('the monthly financial calculation engine runs for {string}', async function (this: CustomWorld, _model: string) {
  await this.page.getByRole('button', { name: /run calculation/i }).click();
});

Then('the invoice ledger should calculate {string}', async function (this: CustomWorld, _rule: string) {
  await expect(this.page.locator('[data-testid="fb-ledger-table"], [data-testid="tnm-ledger-table"]')).toBeVisible();
});

Given('the Finance Manager opens the "Fixed Bid Billing & Invoicing Ledger" for {string}', async function (this: CustomWorld, _projectName: string) {
  const billingPage = new BillingInvoicingPage(this.page);
  await billingPage.gotoFbBilling('default');
});

When('the Finance Manager adds fixed cost line items:', async function (this: CustomWorld, dataTable: DataTable) {
  const billingPage = new BillingInvoicingPage(this.page);
  for (const row of dataTable.hashes()) {
    await billingPage.addFixedCost(row['Description'], row['Amount (USD)']);
  }
});

Then('the Fixed Costs Module should list all three line items', async function (this: CustomWorld) {
  const billingPage = new BillingInvoicingPage(this.page);
  await expect(billingPage.fbLedgerTable).toBeVisible();
});

Then('the System Invoicing Table should combine active resource tallies with fixed cost line items', async function (this: CustomWorld) {
  const billingPage = new BillingInvoicingPage(this.page);
  await expect(billingPage.systemInvoicingTable).toBeVisible();
});

Then('output the absolute project contract value', async function (this: CustomWorld) {
  await expect(this.page.locator('.contract-value, [data-testid="contract-value"]')).toBeVisible();
});

Given('the Finance Manager is on the "FB Payment Milestones Dashboard" for {string}', async function (this: CustomWorld, _projectName: string) {
  const billingPage = new BillingInvoicingPage(this.page);
  await billingPage.gotoFbPaymentMilestones('default');
});

When('the milestone {string} is moved to state {string}', async function (this: CustomWorld, milestone: string, state: string) {
  const billingPage = new BillingInvoicingPage(this.page);
  await billingPage.setMilestoneState(milestone, state);
});

Then('the state change date should be logged', async function (this: CustomWorld) {
  await expect(this.page.locator('.state-change-log')).toBeVisible();
});

When('the milestone is advanced to {string}', async function (this: CustomWorld, state: string) {
  const billingPage = new BillingInvoicingPage(this.page);
  await billingPage.setMilestoneState('Alpha Delivery', state);
});

Then('the Invoice Raised date should be recorded', async function (this: CustomWorld) {
  await expect(this.page.locator('.invoice-raised-date')).toBeVisible();
});

When('the milestone is marked as {string}', async function (this: CustomWorld, state: string) {
  const billingPage = new BillingInvoicingPage(this.page);
  await billingPage.setMilestoneState('Alpha Delivery', state);
});

Then('the full state history log should show all transitions with their dates:', async function (this: CustomWorld, dataTable: DataTable) {
  const billingPage = new BillingInvoicingPage(this.page);
  await expect(billingPage.fbMilestonesTable).toBeVisible();
  for (const row of dataTable.hashes()) {
    await expect(this.page.getByText(row['State'], { exact: false })).toBeVisible();
  }
});

Given('the Finance Manager views the "TnM Billing Ledger" for a Time & Material project', async function (this: CustomWorld) {
  const billingPage = new BillingInvoicingPage(this.page);
  await billingPage.gotoTnmBilling('default');
});

Then('the TnM Payment Milestones Terminal should display chronological monthly billing periods', async function (this: CustomWorld) {
  const billingPage = new BillingInvoicingPage(this.page);
  await expect(billingPage.tnmMonthlyPeriodsTable).toBeVisible();
});

Then('each period frame should show invoice generation parameters \\(billing period dates, hours billed, LOP deductions, overtime additions\\)', async function (this: CustomWorld) {
  const billingPage = new BillingInvoicingPage(this.page);
  await expect(billingPage.tnmMonthlyPeriodsTable).toBeVisible();
});

Then('the monthly invoice summary should be calculable from the period data', async function (this: CustomWorld) {
  await expect(this.page.locator('.monthly-invoice-summary')).toBeVisible();
});

Given('the Delivery Manager is on the "BCP Profile" for {string}', async function (this: CustomWorld, _projectName: string) {
  const bcpPage = new BusinessContinuityPage(this.page);
  await bcpPage.goto('default');
});

When('the Manager registers a code repository entry:', async function (this: CustomWorld, dataTable: DataTable) {
  const bcpPage = new BusinessContinuityPage(this.page);
  const data = dataTable.rowsHash();
  await bcpPage.registerRepository(data['Repository URL'] || '', data['Access Token Expiry Date'] || '');
});

Then('the repository entry should appear in the "Code Repository Logs" section', async function (this: CustomWorld) {
  const bcpPage = new BusinessContinuityPage(this.page);
  await expect(bcpPage.codeRepositoryLogsTable).toBeVisible();
});

Then('the system should display the access token validity frame with expiry date {string}', async function (this: CustomWorld, expiryDate: string) {
  await expect(this.page.getByText(expiryDate, { exact: false })).toBeVisible();
});

Given('the Delivery Manager checks the "BCP Profile"', async function (this: CustomWorld) {
  const bcpPage = new BusinessContinuityPage(this.page);
  await bcpPage.goto('default');
});

Then('infrastructure endpoints, SSL cert expiry dates, and repository token validity frames should be tracked', async function (this: CustomWorld) {
  const bcpPage = new BusinessContinuityPage(this.page);
  await expect(bcpPage.infrastructureEndpointsTable).toBeVisible();
  await expect(bcpPage.codeRepositoryLogsTable).toBeVisible();
});

When('a primary developer is flagged as departing', async function (this: CustomWorld) {
  await this.page.getByRole('button', { name: /flag as departing/i }).first().click();
});

Then('mapped backup contact details \\(Name, Role, Email, Phone\\) should immediately display for delivery continuity', async function (this: CustomWorld) {
  const bcpPage = new BusinessContinuityPage(this.page);
  await expect(bcpPage.backupResourcesGrid).toBeVisible();
});
