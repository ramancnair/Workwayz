import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Quality sub-pages
 * Routes:
 *   /quality/estimations
 *   /quality/defects
 */
export class QualityDefectsPage extends BasePage {
  readonly sitDefectsCard: Locator;
  readonly uatDefectsCard: Locator;
  readonly prodLeaksCard: Locator;
  readonly averageLeakageRateCard: Locator;

  constructor(page: Page) {
    super(page);
    this.sitDefectsCard = page.locator('[data-testid="sit-defects"]');
    this.uatDefectsCard = page.locator('[data-testid="uat-defects"]');
    this.prodLeaksCard = page.locator('[data-testid="prod-leaks"]');
    this.averageLeakageRateCard = page.locator('[data-testid="average-leakage-rate"]');
  }

  async gotoEstimations() {
    await this.navigateTo('/quality/estimations');
  }

  async gotoDefects() {
    await this.navigateTo('/quality/defects');
  }
}
