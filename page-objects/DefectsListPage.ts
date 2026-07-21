import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Defects list page (separate from Defect Tracker)
 * Route: /projects/:projectId/testing/defects
 */
export class DefectsListPage extends BasePage {
  readonly defectsList: Locator;
  readonly addDefectButton: Locator;
  readonly defectTitleInput: Locator;
  readonly defectSeveritySelect: Locator;
  readonly defectAssigneeSelect: Locator;
  readonly saveDefectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.defectsList = page.locator('[data-testid="defects-list"], .defects-list');
    this.addDefectButton = page.getByRole('button', { name: /add defect|log defect/i });
    this.defectTitleInput = page.getByLabel(/title/i);
    this.defectSeveritySelect = page.getByRole('combobox', { name: /severity/i });
    this.defectAssigneeSelect = page.getByRole('combobox', { name: /assignee/i });
    this.saveDefectButton = page.getByRole('button', { name: /save|create/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/testing/defects`);
  }
}
