import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Grooming Board page
 * Route: /projects/:projectId/development/grooming
 */
export class GroomingBoardPage extends BasePage {
  readonly backlogColumn: Locator;
  readonly sprintColumn: Locator;
  readonly sprintCapacityHeader: Locator;
  readonly readyTickIndicators: Locator;

  constructor(page: Page) {
    super(page);
    this.backlogColumn = page.locator('[data-testid="backlog-column"], .grooming-backlog');
    this.sprintColumn = page.locator('[data-testid="sprint-column"], .grooming-sprint');
    this.sprintCapacityHeader = page.locator('[data-testid="sprint-capacity"], .sprint-capacity');
    this.readyTickIndicators = page.locator('[data-testid="ready-tick"], .validation-tick-green');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/development/grooming`);
  }

  async dragStoryToSprint(storyTitle: string, sprintName: string) {
    const storyCard = this.backlogColumn.locator('.story-card').filter({ hasText: storyTitle }).first();
    const targetSprint = this.sprintColumn.filter({ hasText: sprintName }).first();
    if (await storyCard.isVisible() && await targetSprint.isVisible()) {
      await storyCard.dragTo(targetSprint);
    }
  }
}
