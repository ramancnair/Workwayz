import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Trash pages
 * Routes:
 *   /trash  (global portfolio trash)
 *   /projects/:projectId/trash  (project-level trash)
 */
export class TrashPage extends BasePage {
  readonly deletedItemsList: Locator;
  readonly retentionDaysLabels: Locator;
  readonly restoreButtons: Locator;
  readonly permanentDeleteButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.deletedItemsList = page.locator('[data-testid="trash-items"], .trash-list');
    this.retentionDaysLabels = page.locator('[data-testid="retention-days"]');
    this.restoreButtons = page.getByRole('button', { name: /restore/i });
    this.permanentDeleteButtons = page.getByRole('button', { name: /delete permanently/i });
  }

  async gotoGlobalTrash() {
    await this.navigateTo('/trash');
  }

  async gotoProjectTrash(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/trash`);
  }

  async restoreItem(itemName: string) {
    const row = this.deletedItemsList.locator('tr, .trash-item').filter({ hasText: itemName });
    await row.getByRole('button', { name: /restore/i }).click();
  }
}
