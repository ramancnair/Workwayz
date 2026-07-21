import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Worklog page
 * Route: /projects/:projectId/resources/worklog
 */
export class WorklogPage extends BasePage {
  readonly resourceCards: Locator;
  readonly datePicker: Locator;
  readonly hoursInput: Locator;
  readonly taskTypeSelect: Locator;
  readonly otherDescriptionInput: Locator;
  readonly submitWorklogButton: Locator;

  constructor(page: Page) {
    super(page);
    this.resourceCards = page.locator('[data-testid="resource-card"], .resource-card');
    this.datePicker = page.locator('[data-testid="worklog-date"], input[type="date"]');
    this.hoursInput = page.getByLabel(/hours/i);
    this.taskTypeSelect = page.getByRole('combobox', { name: /task type|log against/i });
    this.otherDescriptionInput = page.getByLabel(/description|log description/i);
    this.submitWorklogButton = page.getByRole('button', { name: /submit|save worklog/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/resources/worklog`);
  }

  async selectResource(name: string) {
    const card = this.resourceCards.filter({ hasText: name }).first();
    if (await card.isVisible()) {
      await card.click();
    }
  }

  async logHours(date: string, hours: number, taskType: string, description?: string) {
    await this.datePicker.fill(date);
    await this.hoursInput.fill(hours.toString());
    if (await this.taskTypeSelect.isVisible()) {
      await this.taskTypeSelect.selectOption({ label: taskType });
    }
    if (taskType === 'Other' && description) {
      await this.otherDescriptionInput.fill(description);
    }
    await this.submitWorklogButton.click();
  }
}
