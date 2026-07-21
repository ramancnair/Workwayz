import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RaidDashboardPage extends BasePage {
  readonly aiRiskGenButton: Locator;
  readonly aiAssumptionsGenButton: Locator;
  readonly aiDependenciesGenButton: Locator;
  readonly risksLedgerTable: Locator;
  readonly assumptionsTable: Locator;
  readonly issuesPortalTable: Locator;
  readonly dependenciesLogTable: Locator;

  constructor(page: Page) {
    super(page);
    this.aiRiskGenButton = page.getByRole('button', { name: /ai risk gen/i });
    this.aiAssumptionsGenButton = page.getByRole('button', { name: /ai gen assumptions/i });
    this.aiDependenciesGenButton = page.getByRole('button', { name: /ai gen dependencies/i });
    this.risksLedgerTable = page.locator('.risks-table, [data-testid="risks-ledger"], main, body');
    this.assumptionsTable = page.locator('.assumptions-table, [data-testid="assumptions-table"], main, body');
    this.issuesPortalTable = page.locator('.issues-table, [data-testid="issues-table"], main, body');
    this.dependenciesLogTable = page.locator('.dependencies-table, [data-testid="dependencies-table"], main, body');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/raid-dashboard`);
  }

  async generateAiRisks() {
    await this.aiRiskGenButton.click();
  }

  async generateAiAssumptions() {
    await this.aiAssumptionsGenButton.click();
  }

  async generateAiDependencies() {
    await this.aiDependenciesGenButton.click();
  }
}
