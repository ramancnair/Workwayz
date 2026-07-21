import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Test Backlog page
 * Route: /projects/:projectId/testing/test-backlog
 */
export class TestBacklogPage extends BasePage {
  readonly testCasesList: Locator;
  readonly addTestCaseButton: Locator;
  readonly testCaseTitleInput: Locator;
  readonly saveTestCaseButton: Locator;

  constructor(page: Page) {
    super(page);
    this.testCasesList = page.locator('[data-testid="test-backlog-list"], .test-backlog');
    this.addTestCaseButton = page.getByRole('button', { name: /add test case|new test/i });
    this.testCaseTitleInput = page.getByLabel(/test case title|title/i);
    this.saveTestCaseButton = page.getByRole('button', { name: /save|create/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/testing/test-backlog`);
  }

  async addTestCase(title: string) {
    await this.addTestCaseButton.click();
    await this.testCaseTitleInput.fill(title);
    await this.saveTestCaseButton.click();
  }
}
