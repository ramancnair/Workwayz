import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Specifications & Environments page
 * Route: /projects/:projectId/project-details/specifications
 *        /projects/:projectId/initial-estimation/specifications
 */
export class SpecificationsPage extends BasePage {
  readonly environmentsTable: Locator;
  readonly addEnvironmentButton: Locator;
  readonly environmentNameInput: Locator;
  readonly saveEnvironmentButton: Locator;
  readonly deleteEnvironmentButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.environmentsTable = page.locator('[data-testid="environments-table"], .environments-matrix, main, body');
    this.addEnvironmentButton = page.getByRole('button', { name: /add environment/i });
    this.environmentNameInput = page.getByLabel(/environment name/i);
    this.saveEnvironmentButton = page.getByRole('button', { name: /save|create/i });
    this.deleteEnvironmentButtons = page.locator('[data-testid="delete-environment"]');
  }

  async gotoProjectSpecs(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/project-details/specifications`);
  }

  async gotoInitialEstimationSpecs(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/initial-estimation/specifications`);
  }

  async addEnvironment(name: string) {
    await this.addEnvironmentButton.click();
    await this.environmentNameInput.fill(name);
    await this.saveEnvironmentButton.click();
  }

  async deleteEnvironment(name: string) {
    const row = this.environmentsTable.locator('tr').filter({ hasText: name });
    await row.getByRole('button', { name: /delete/i }).click();
  }
}
