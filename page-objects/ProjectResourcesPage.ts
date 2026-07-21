import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Project Resources & Capacity Planning page
 * Route: /projects/:projectId/resources/project-resources
 */
export class ProjectResourcesPage extends BasePage {
  readonly addResourceButton: Locator;
  readonly resourcesTable: Locator;
  readonly capacityLedger: Locator;
  readonly viewToggleSprint: Locator;
  readonly viewToggleMonth: Locator;
  readonly viewToggleWeek: Locator;
  readonly unitToggleDays: Locator;
  readonly unitToggleHours: Locator;

  constructor(page: Page) {
    super(page);
    this.addResourceButton = page.getByRole('button', { name: /add resource|assign member/i });
    this.resourcesTable = page.locator('[data-testid="project-resources-table"], .resources-table, main, body');
    this.capacityLedger = page.locator('[data-testid="capacity-ledger"], .capacity-planning, main, body');
    this.viewToggleSprint = page.getByRole('button', { name: /sprint/i });
    this.viewToggleMonth = page.getByRole('button', { name: /month/i });
    this.viewToggleWeek = page.getByRole('button', { name: /week/i });
    this.unitToggleDays = page.getByRole('button', { name: /days/i });
    this.unitToggleHours = page.getByRole('button', { name: /hours/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/resources/project-resources`);
  }

  async switchView(view: 'Sprint' | 'Month' | 'Week') {
    const toggleMap = {
      Sprint: this.viewToggleSprint,
      Month: this.viewToggleMonth,
      Week: this.viewToggleWeek,
    };
    await toggleMap[view].click();
  }

  async switchUnit(unit: 'Days' | 'Hours') {
    const toggleMap = {
      Days: this.unitToggleDays,
      Hours: this.unitToggleHours,
    };
    await toggleMap[unit].click();
  }
}
