import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Defect Tracker Kanban board
 * Route: /projects/:projectId/testing/defect-tracker
 *        /projects/:projectId/development/defect-tracker
 */
export class DefectTrackerPage extends BasePage {
  readonly inTriageColumn: Locator;
  readonly defectBacklogColumn: Locator;
  readonly inProgressColumn: Locator;
  readonly retestColumn: Locator;
  readonly closedColumn: Locator;
  readonly addDefectButton: Locator;
  readonly defectTitleInput: Locator;
  readonly defectSeveritySelect: Locator;
  readonly defectSprintSelect: Locator;
  readonly relatedStoryIdInput: Locator;
  readonly foundInTestPlanSelect: Locator;
  readonly saveDefectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.inTriageColumn = page.locator('[data-column="In Triage"], [data-testid="column-in-triage"]');
    this.defectBacklogColumn = page.locator('[data-column="Defect Backlog"], [data-testid="column-defect-backlog"]');
    this.inProgressColumn = page.locator('[data-column="In Progress"], [data-testid="column-in-progress"]');
    this.retestColumn = page.locator('[data-column="Retest"], [data-testid="column-retest"]');
    this.closedColumn = page.locator('[data-column="Closed"], [data-testid="column-closed"]');
    this.addDefectButton = page.getByRole('button', { name: /add new defect|log defect/i });
    this.defectTitleInput = page.getByLabel(/title/i);
    this.defectSeveritySelect = page.getByRole('combobox', { name: /severity/i });
    this.defectSprintSelect = page.getByRole('combobox', { name: /target sprint/i });
    this.relatedStoryIdInput = page.getByLabel(/related story id|story id/i);
    this.foundInTestPlanSelect = page.getByRole('combobox', { name: /found in test plan/i });
    this.saveDefectButton = page.getByRole('button', { name: /save defect|create/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/testing/defect-tracker`);
  }

  async createDefect(details: {
    title: string;
    severity: string;
    targetSprint: string;
    storyId?: string;
    foundInTestPlan?: string;
  }) {
    await this.addDefectButton.click();
    await this.defectTitleInput.fill(details.title);
    if (await this.defectSeveritySelect.isVisible()) {
      await this.defectSeveritySelect.selectOption({ label: details.severity });
    }
    if (await this.defectSprintSelect.isVisible()) {
      await this.defectSprintSelect.selectOption({ label: details.targetSprint });
    }
    if (details.storyId) {
      await this.relatedStoryIdInput.fill(details.storyId);
    }
    if (details.foundInTestPlan && await this.foundInTestPlanSelect.isVisible()) {
      await this.foundInTestPlanSelect.selectOption({ label: details.foundInTestPlan });
    }
    await this.saveDefectButton.click();
  }

  async moveDefectToColumn(defectTitle: string, fromColumn: Locator, toColumn: Locator) {
    const card = fromColumn.locator('.defect-card').filter({ hasText: defectTitle });
    await card.dragTo(toColumn);
  }
}
