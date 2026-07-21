import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class InitialEstimationPage extends BasePage {
  readonly projectSummaryTextarea: Locator;
  readonly stackSuggestButton: Locator;
  readonly stackOptionsCards: Locator;
  readonly addSystemButton: Locator;
  readonly impactedSystemsList: Locator;
  readonly horizontalSuggestButton: Locator;
  readonly aiEstimatorButton: Locator;
  readonly confirmEstimationButton: Locator;

  constructor(page: Page) {
    super(page);
    this.projectSummaryTextarea = page.getByLabel(/project summary/i);
    this.stackSuggestButton = page.getByRole('button', { name: /stack suggest/i });
    this.stackOptionsCards = page.locator('.stack-option-card, [data-testid="stack-option"]');
    this.addSystemButton = page.getByRole('button', { name: /add system/i });
    this.impactedSystemsList = page.locator('.impacted-systems-list, [data-testid="impacted-systems"]');
    this.horizontalSuggestButton = page.getByRole('button', { name: /horizontal suggest/i });
    this.aiEstimatorButton = page.getByRole('button', { name: /ai estimator/i });
    this.confirmEstimationButton = page.getByRole('button', { name: /confirm estimation/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/initial-estimation`);
  }

  async setProjectSummary(summaryText: string) {
    await this.projectSummaryTextarea.fill(summaryText);
  }

  async clickStackSuggest() {
    await this.stackSuggestButton.click();
  }

  async selectStackOption(index: number) {
    await this.stackOptionsCards.nth(index).click();
  }

  async addManualSystem(systemName: string) {
    await this.addSystemButton.click();
    await this.page.getByPlaceholder(/system name/i).fill(systemName);
    await this.page.getByRole('button', { name: /save|add/i }).click();
  }

  async clickHorizontalSuggest() {
    await this.horizontalSuggestButton.click();
  }

  async clickAiEstimator() {
    await this.aiEstimatorButton.click();
  }

  async confirmEstimation() {
    await this.confirmEstimationButton.click();
  }
}
