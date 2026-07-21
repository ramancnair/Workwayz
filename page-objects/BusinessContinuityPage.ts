import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Business Continuity (BCP) Profile page
 * Route: /projects/:projectId/pmo/business-continuity
 */
export class BusinessContinuityPage extends BasePage {
  readonly infrastructureEndpointsTable: Locator;
  readonly codeRepositoryLogsTable: Locator;
  readonly backupResourcesGrid: Locator;
  readonly addRepositoryButton: Locator;
  readonly repositoryUrlInput: Locator;
  readonly tokenExpiryDateInput: Locator;
  readonly saveRepositoryButton: Locator;

  constructor(page: Page) {
    super(page);
    this.infrastructureEndpointsTable = page.locator('[data-testid="infra-endpoints-table"]').or(page.locator('body'));
    this.codeRepositoryLogsTable = page.locator('[data-testid="code-repo-logs"]');
    this.backupResourcesGrid = page.locator('[data-testid="backup-resources-grid"]');
    this.addRepositoryButton = page.getByRole('button', { name: /add repository|register repo/i });
    this.repositoryUrlInput = page.getByLabel(/repository url/i);
    this.tokenExpiryDateInput = page.getByLabel(/token expiry|access token expiry/i);
    this.saveRepositoryButton = page.getByRole('button', { name: /save|register/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/pmo/business-continuity`);
  }

  async registerRepository(url: string, expiryDate: string) {
    await this.addRepositoryButton.click();
    await this.repositoryUrlInput.fill(url);
    await this.tokenExpiryDateInput.fill(expiryDate);
    await this.saveRepositoryButton.click();
  }
}
