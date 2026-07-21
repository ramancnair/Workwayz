import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Project Settings pages
 * Routes:
 *   /projects/:projectId/settings/board
 *   /projects/:projectId/settings/sprint
 *   /projects/:projectId/settings/effort
 */
export class ProjectSettingsPage extends BasePage {
  // Board Settings
  readonly boardColumnsConfig: Locator;
  readonly addColumnButton: Locator;

  // Sprint Settings
  readonly sprintDurationInput: Locator;
  readonly sprintStartDaySelect: Locator;
  readonly saveSprintSettingsButton: Locator;

  // Effort Settings
  readonly storyPointHoursInput: Locator;
  readonly workingHoursPerDayInput: Locator;
  readonly saveEffortSettingsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.boardColumnsConfig = page.locator('[data-testid="board-columns-config"]');
    this.addColumnButton = page.getByRole('button', { name: /add column/i });
    this.sprintDurationInput = page.getByLabel(/sprint duration/i);
    this.sprintStartDaySelect = page.getByRole('combobox', { name: /sprint start day/i });
    this.saveSprintSettingsButton = page.getByRole('button', { name: /save/i });
    this.storyPointHoursInput = page.getByLabel(/story point hours|hours per point/i);
    this.workingHoursPerDayInput = page.getByLabel(/working hours per day/i);
    this.saveEffortSettingsButton = page.getByRole('button', { name: /save/i });
  }

  async gotoBoardSettings(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/settings/board`);
  }

  async gotoSprintSettings(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/settings/sprint`);
  }

  async gotoEffortSettings(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/settings/effort`);
  }
}
