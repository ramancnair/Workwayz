import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Resource Workload Calendar page
 * Route: /projects/:projectId/resources/resource-workload
 */
export class ResourceWorkloadPage extends BasePage {
  readonly calendarGrid: Locator;
  readonly engineerRows: Locator;
  readonly greenCapacityBlocks: Locator;
  readonly overAllocatedWarnings: Locator;

  constructor(page: Page) {
    super(page);
    this.calendarGrid = page.locator('[data-testid="resource-workload-calendar"], .workload-calendar, main, body');
    this.engineerRows = page.locator('[data-testid="engineer-row"], main, body');
    this.greenCapacityBlocks = page.locator('.capacity-block-green, [data-status="healthy"], main, body');
    this.overAllocatedWarnings = page.locator('.capacity-block-warning, [data-status="over-allocated"], main, body');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/resources/resource-workload`);
  }
}
