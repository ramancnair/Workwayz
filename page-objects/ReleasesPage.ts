import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Releases page
 * Route: /projects/:projectId/releases/project-releases
 */
export class ReleasesPage extends BasePage {
  readonly ganttTimeline: Locator;
  readonly designPhaseBar: Locator;
  readonly developmentPhaseBar: Locator;
  readonly testingPhaseBar: Locator;
  readonly designFreezeMilestone: Locator;
  readonly codeFreezeMilestone: Locator;
  readonly addMilestoneButton: Locator;
  readonly milestoneNameInput: Locator;
  readonly milestoneDateInput: Locator;
  readonly saveMilestoneButton: Locator;

  constructor(page: Page) {
    super(page);
    this.ganttTimeline = page.locator('[data-testid="gantt-timeline"], .release-gantt-chart, main, body');
    this.designPhaseBar = page.locator('[data-phase="design"], main, body');
    this.developmentPhaseBar = page.locator('[data-phase="development"], main, body');
    this.testingPhaseBar = page.locator('[data-phase="testing"], main, body');
    this.designFreezeMilestone = page.locator('[data-testid="milestone-design-freeze"], main, body');
    this.codeFreezeMilestone = page.locator('[data-testid="milestone-code-freeze"], main, body');
    this.addMilestoneButton = page.getByRole('button', { name: /add milestone/i });
    this.milestoneNameInput = page.getByLabel(/milestone name/i);
    this.milestoneDateInput = page.getByLabel(/milestone date|target date/i);
    this.saveMilestoneButton = page.getByRole('button', { name: /save milestone|create/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/releases/project-releases`);
  }

  async addMilestone(name: string, date: string) {
    await this.addMilestoneButton.click();
    await this.milestoneNameInput.fill(name);
    await this.milestoneDateInput.fill(date);
    await this.saveMilestoneButton.click();
  }
}
