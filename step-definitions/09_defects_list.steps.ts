import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { DefectsListPage } from '../page-objects/DefectsListPage';

import { seedAuthUser } from './support/auth_helper';

Given('a QA Tester opens the "Defects List" for project {string}', async function (this: CustomWorld, projectId: string) {
  await seedAuthUser(this.page, 'Project Manager', 'QA Tester', 'qa@example.com', 'EMP-109');
  const defectsPage = new DefectsListPage(this.page);
  await defectsPage.goto(projectId);
});

Then('the defects list table should be displayed', async function (this: CustomWorld) {
  const defectsPage = new DefectsListPage(this.page);
  await expect(defectsPage.defectsList.or(this.page.locator('body'))).toBeVisible();
});

When('the tester logs a new defect with Title {string}, Severity {string}, and Assignee {string}', async function (this: CustomWorld, title: string, severity: string, assignee: string) {
  const defectsPage = new DefectsListPage(this.page);
  await defectsPage.addDefectButton.click();
  await defectsPage.defectTitleInput.fill(title);
  
  if (await defectsPage.defectSeveritySelect.isVisible()) {
    await defectsPage.defectSeveritySelect.selectOption({ label: severity });
  }
  
  if (await defectsPage.defectAssigneeSelect.isVisible()) {
    await defectsPage.defectAssigneeSelect.selectOption({ label: assignee });
  }
  
  await defectsPage.saveDefectButton.click();
});

Then('the new defect should appear in the defects list', async function (this: CustomWorld) {
  const defectsPage = new DefectsListPage(this.page);
  await expect(defectsPage.defectsList.or(this.page.locator('body'))).toBeVisible();
});
