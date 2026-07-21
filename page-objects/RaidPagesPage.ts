import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the individual RAID pages
 * Routes:
 *   /projects/:projectId/risks
 *   /projects/:projectId/assumptions
 *   /projects/:projectId/issues
 *   /projects/:projectId/dependencies
 */
export class RaidPagesPage extends BasePage {
  readonly risksTable: Locator;
  readonly addRiskButton: Locator;
  readonly riskSeveritySelect: Locator;
  readonly riskProbabilitySelect: Locator;
  readonly riskLevelBadge: Locator;
  readonly assumptionsTable: Locator;
  readonly addAssumptionButton: Locator;
  readonly issuesTable: Locator;
  readonly addIssueButton: Locator;
  readonly dependenciesTable: Locator;
  readonly addDependencyButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.risksTable = page.locator('[data-testid="risks-table"], .risks-ledger');
    this.addRiskButton = page.getByRole('button', { name: /add risk|new risk/i });
    this.riskSeveritySelect = page.getByRole('combobox', { name: /severity/i });
    this.riskProbabilitySelect = page.getByRole('combobox', { name: /probability/i });
    this.riskLevelBadge = page.locator('[data-testid="risk-level-badge"]');
    this.assumptionsTable = page.locator('[data-testid="assumptions-table"]');
    this.addAssumptionButton = page.getByRole('button', { name: /add assumption/i });
    this.issuesTable = page.locator('[data-testid="issues-table"]');
    this.addIssueButton = page.getByRole('button', { name: /add issue/i });
    this.dependenciesTable = page.locator('[data-testid="dependencies-table"]');
    this.addDependencyButton = page.getByRole('button', { name: /add dependency/i });
    this.saveButton = page.getByRole('button', { name: /save|create/i });
  }

  async gotoRisks(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/risks`);
  }

  async gotoAssumptions(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/assumptions`);
  }

  async gotoIssues(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/issues`);
  }

  async gotoDependencies(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/dependencies`);
  }

  async addRisk(severity: string, probability: string) {
    await this.addRiskButton.click();
    if (await this.riskSeveritySelect.isVisible()) {
      await this.riskSeveritySelect.selectOption({ label: severity });
    }
    if (await this.riskProbabilitySelect.isVisible()) {
      await this.riskProbabilitySelect.selectOption({ label: probability });
    }
    await this.saveButton.click();
  }

  async addIssue(description: string) {
    await this.addIssueButton.click();
    await this.page.getByLabel(/description|issue description/i).fill(description);
    await this.saveButton.click();
  }
}
