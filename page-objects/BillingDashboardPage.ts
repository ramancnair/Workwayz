import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class BillingDashboardPage extends BasePage {
  readonly totalRevenueCard: Locator;
  readonly resourceCostCard: Locator;
  readonly fixedCostCard: Locator;
  readonly netProfitCard: Locator;
  readonly realizedPaymentsCard: Locator;
  readonly zebraProjectTable: Locator;

  constructor(page: Page) {
    super(page);
    this.totalRevenueCard = page.locator('[data-testid="total-revenue"]').first();
    this.resourceCostCard = page.locator('[data-testid="resource-cost"]').first();
    this.fixedCostCard = page.locator('[data-testid="fixed-cost"]').first();
    this.netProfitCard = page.locator('[data-testid="net-profit"]').first();
    this.realizedPaymentsCard = page.locator('[data-testid="realized-payments"]').first();
    this.zebraProjectTable = page.locator('.billing-table, [data-testid="zebra-billing-table"]').first();
  }

  async goto() {
    await this.navigateTo('/billing');
  }
}
