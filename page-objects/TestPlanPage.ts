import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Test Plan page
 * Route: /projects/:projectId/testing/test-plan
 */
export class TestPlanPage extends BasePage {
  readonly createTestPlanButton: Locator;
  readonly testPlanNameInput: Locator;
  readonly testPlanTypeSelect: Locator;
  readonly testCaseSelector: Locator;
  readonly executionDateInput: Locator;
  readonly saveTestPlanButton: Locator;
  readonly activePlans: Locator;

  constructor(page: Page) {
    super(page);
    this.createTestPlanButton = page.getByRole('button', { name: /create test plan|new plan/i });
    this.testPlanNameInput = page.getByLabel(/test plan name|plan name/i);
    this.testPlanTypeSelect = page.getByRole('combobox', { name: /plan type|execution type/i });
    this.testCaseSelector = page.locator('[data-testid="test-case-selector"]');
    this.executionDateInput = page.getByLabel(/execution date/i);
    this.saveTestPlanButton = page.getByRole('button', { name: /save plan|create plan/i });
    this.activePlans = page.locator('[data-testid="active-plan"]');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/testing/test-plan`);
  }

  async createExecutionPlan(name: string, type: string) {
    await this.createTestPlanButton.click();
    await this.testPlanNameInput.fill(name);
    if (await this.testPlanTypeSelect.isVisible()) {
      await this.testPlanTypeSelect.selectOption({ label: type });
    }
    await this.saveTestPlanButton.click();
  }
}
