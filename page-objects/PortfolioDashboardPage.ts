import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class PortfolioDashboardPage extends BasePage {
  readonly highPotentialRisksQuadrant: Locator;
  readonly criticalIssuesQuadrant: Locator;
  readonly redHealthProjectsSection: Locator;

  constructor(page: Page) {
    super(page);
    this.highPotentialRisksQuadrant = page.locator('[data-testid="high-potential-risks"]').first();
    this.criticalIssuesQuadrant = page.locator('[data-testid="critical-high-issues"]').first();
    this.redHealthProjectsSection = page.locator('[data-testid="red-health-projects"]').first();
  }

  async goto() {
    await this.navigateTo('/portfolio-dashboard');
  }
}
