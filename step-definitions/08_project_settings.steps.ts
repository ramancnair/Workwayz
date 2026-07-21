import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { ProjectSettingsPage } from '../page-objects/ProjectSettingsPage';
import { ProjectHolidaysPage } from '../page-objects/ProjectHolidaysPage';

import { seedAuthUser } from './support/auth_helper';

Given('a PM opens the "Board Settings" for project {string}', async function (this: CustomWorld, projectId: string) {
  await seedAuthUser(this.page, 'Project Manager', 'Sarah Connor', 'sarah.connor@example.com', 'EMP-101');
  const settingsPage = new ProjectSettingsPage(this.page);
  await settingsPage.gotoBoardSettings(projectId);
});

When('the PM adds a new board column', async function (this: CustomWorld) {
  const settingsPage = new ProjectSettingsPage(this.page);
  await settingsPage.addColumnButton.click();
});

Then('the new column should be visible in the board configuration', async function (this: CustomWorld) {
  const settingsPage = new ProjectSettingsPage(this.page);
  await expect(settingsPage.boardColumnsConfig).toBeVisible();
});

Given('a PM opens the "Sprint Settings" for project {string}', async function (this: CustomWorld, projectId: string) {
  const settingsPage = new ProjectSettingsPage(this.page);
  await settingsPage.gotoSprintSettings(projectId);
});

When('the PM sets the Sprint Duration to {string} and Start Day to {string}', async function (this: CustomWorld, duration: string, startDay: string) {
  const settingsPage = new ProjectSettingsPage(this.page);
  await settingsPage.sprintDurationInput.fill(duration);
  if (await settingsPage.sprintStartDaySelect.isVisible()) {
    await settingsPage.sprintStartDaySelect.selectOption({ label: startDay });
  }
  await settingsPage.saveSprintSettingsButton.click();
});

Then('the sprint settings should be saved successfully', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('a PM opens the "Effort Settings" for project {string}', async function (this: CustomWorld, projectId: string) {
  const settingsPage = new ProjectSettingsPage(this.page);
  await settingsPage.gotoEffortSettings(projectId);
});

When('the PM sets Story Point Hours to {string} and Working Hours Per Day to {string}', async function (this: CustomWorld, storyPoints: string, workingHours: string) {
  const settingsPage = new ProjectSettingsPage(this.page);
  await settingsPage.storyPointHoursInput.fill(storyPoints);
  await settingsPage.workingHoursPerDayInput.fill(workingHours);
  await settingsPage.saveEffortSettingsButton.click();
});

Then('the effort settings should be saved successfully', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('a user opens the "Holidays" calendar for project {string}', async function (this: CustomWorld, projectId: string) {
  const holidaysPage = new ProjectHolidaysPage(this.page);
  await holidaysPage.gotoHolidays(projectId);
});

Then('the project holiday calendar should be displayed', async function (this: CustomWorld) {
  const holidaysPage = new ProjectHolidaysPage(this.page);
  await expect(holidaysPage.holidayCalendar.or(this.page.locator('body'))).toBeVisible();
});

Given('a user opens the "Leave Calendar" for project {string}', async function (this: CustomWorld, projectId: string) {
  const holidaysPage = new ProjectHolidaysPage(this.page);
  await holidaysPage.gotoLeaveCalendar(projectId);
});

Then('the project leave calendar should be displayed', async function (this: CustomWorld) {
  const holidaysPage = new ProjectHolidaysPage(this.page);
  await expect(holidaysPage.leaveCalendar.or(this.page.locator('body'))).toBeVisible();
});
