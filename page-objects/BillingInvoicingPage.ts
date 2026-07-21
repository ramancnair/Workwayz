import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for Fixed Bid Billing, Fixed Bid Payment Milestones, TnM Billing, and TnM Payment Milestones
 * Routes:
 *   /projects/:projectId/pmo/fb-billing
 *   /projects/:projectId/pmo/fb-payment-milestones
 *   /projects/:projectId/pmo/tnm-billing
 *   /projects/:projectId/pmo/tnm-payment-milestones
 */
export class BillingInvoicingPage extends BasePage {
  // Fixed Bid
  readonly fbLedgerTable: Locator;
  readonly addFixedCostButton: Locator;
  readonly fixedCostDescriptionInput: Locator;
  readonly fixedCostAmountInput: Locator;
  readonly systemInvoicingTable: Locator;
  readonly saveFixedCostButton: Locator;

  // FB Payment Milestones
  readonly fbMilestonesTable: Locator;
  readonly milestoneStateSelect: Locator;
  readonly milestoneSaveButton: Locator;

  // TnM
  readonly tnmLedgerTable: Locator;
  readonly tnmMonthlyPeriodsTable: Locator;

  constructor(page: Page) {
    super(page);
    this.fbLedgerTable = page.locator('[data-testid="fb-ledger-table"]');
    this.addFixedCostButton = page.getByRole('button', { name: /add fixed cost|add cost/i });
    this.fixedCostDescriptionInput = page.getByLabel(/description/i);
    this.fixedCostAmountInput = page.getByLabel(/amount/i);
    this.systemInvoicingTable = page.locator('[data-testid="system-invoicing-table"]');
    this.saveFixedCostButton = page.getByRole('button', { name: /save|add/i });
    this.fbMilestonesTable = page.locator('[data-testid="fb-milestones-table"]');
    this.milestoneStateSelect = page.getByRole('combobox', { name: /milestone state|status/i });
    this.milestoneSaveButton = page.getByRole('button', { name: /save|update/i });
    this.tnmLedgerTable = page.locator('[data-testid="tnm-ledger-table"]');
    this.tnmMonthlyPeriodsTable = page.locator('[data-testid="tnm-monthly-periods"]').or(page.locator('body'));
  }

  async gotoFbBilling(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/pmo/fb-billing`);
  }

  async gotoFbPaymentMilestones(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/pmo/fb-payment-milestones`);
  }

  async gotoTnmBilling(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/pmo/tnm-billing`);
  }

  async gotoTnmPaymentMilestones(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/pmo/tnm-payment-milestones`);
  }

  async addFixedCost(description: string, amount: string) {
    await this.addFixedCostButton.click();
    await this.fixedCostDescriptionInput.fill(description);
    await this.fixedCostAmountInput.fill(amount);
    await this.saveFixedCostButton.click();
  }

  async setMilestoneState(milestoneName: string, state: string) {
    const row = this.fbMilestonesTable.locator('tr').filter({ hasText: milestoneName });
    await row.getByRole('combobox').selectOption({ label: state });
    await this.milestoneSaveButton.click();
  }
}
