import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ResourceUtilizationPage extends BasePage {
  readonly searchInput: Locator;
  readonly availabilityOutlookCard: Locator;
  readonly capacitySaturationBadge: Locator;
  readonly availabilityGrid: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByPlaceholder(/search employee|search by name or id/i).first();
    this.availabilityOutlookCard = page.locator('[data-testid="availability-outlook"]').first();
    this.capacitySaturationBadge = page.locator('[data-testid="capacity-badge"]').first();
    this.availabilityGrid = page.locator('[data-testid="availability-grid"]').first();
  }

  async goto() {
    await this.navigateTo('/utilization');
  }

  async searchEmployee(nameOrId: string) {
    await this.searchInput.fill(nameOrId);
    await this.page.keyboard.press('Enter');
  }
}
