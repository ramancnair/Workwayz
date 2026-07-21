import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly heroHeading: Locator;
  readonly getStartedButton: Locator;
  readonly loginButton: Locator;
  readonly featureCards: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.getByRole('heading', { name: /manage portfolios and projects with clarity/i });
    this.getStartedButton = page.getByRole('link', { name: /get started/i });
    this.loginButton = page.getByRole('link', { name: /log in/i });
    this.featureCards = page.locator('.feature-card, [data-testid="feature-card"]');
  }

  async goto() {
    await this.navigateTo('/');
  }

  async clickGetStarted() {
    await this.getStartedButton.click();
  }

  async clickLogin() {
    await this.loginButton.click();
  }
}
