import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminSettingsPage extends BasePage {
  readonly pageAccessMatrixTable: Locator;
  readonly crudAccessGridTable: Locator;
  readonly dbManagementPanel: Locator;
  readonly authConfigPanel: Locator;
  readonly aiConfigBoard: Locator;
  readonly trashControlTable: Locator;

  constructor(page: Page) {
    super(page);
    this.pageAccessMatrixTable = page.locator('.page-access-matrix, [data-testid="page-access-matrix"]');
    this.crudAccessGridTable = page.locator('.crud-access-grid, [data-testid="crud-access-grid"]');
    this.dbManagementPanel = page.locator('.db-management, [data-testid="db-management-panel"]');
    this.authConfigPanel = page.locator('.auth-config, [data-testid="auth-config-panel"]');
    this.aiConfigBoard = page.locator('.ai-config, [data-testid="ai-config-board"]');
    this.trashControlTable = page.locator('.trash-control, [data-testid="trash-control-table"]');
  }

  async goto() {
    await this.navigateTo('/portfolio-settings');
  }

  async restoreTrashProject(projectName: string) {
    const row = this.trashControlTable.locator('tr').filter({ hasText: projectName });
    await row.getByRole('button', { name: /restore/i }).click();
  }
}
