import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Sub-Tasks (Bulk Sub-Task Matrix) page
 * Route: /projects/:projectId/development/development-tasks
 */
export class SubTasksPage extends BasePage {
  readonly subTasksTable: Locator;
  readonly subTaskRows: Locator;
  readonly bulkAssigneeSelect: Locator;
  readonly bulkSprintSelect: Locator;
  readonly applyBulkActionButton: Locator;
  readonly selectAllCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    this.subTasksTable = page.locator('[data-testid="subtasks-table"], .subtasks-matrix, main, body');
    this.subTaskRows = page.locator('[data-testid="subtask-row"], main, body');
    this.bulkAssigneeSelect = page.getByRole('combobox', { name: /bulk assignee|assign to/i });
    this.bulkSprintSelect = page.getByRole('combobox', { name: /bulk sprint|target sprint/i });
    this.applyBulkActionButton = page.getByRole('button', { name: /apply|update/i });
    this.selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/development/development-tasks`);
  }

  async selectAllSubTasks() {
    await this.selectAllCheckbox.check();
  }

  async bulkAssign(assignee: string) {
    if (await this.bulkAssigneeSelect.isVisible()) {
      await this.bulkAssigneeSelect.selectOption({ label: assignee });
    }
    await this.applyBulkActionButton.click();
  }

  async bulkSetSprint(sprint: string) {
    if (await this.bulkSprintSelect.isVisible()) {
      await this.bulkSprintSelect.selectOption({ label: sprint });
    }
    await this.applyBulkActionButton.click();
  }
}
