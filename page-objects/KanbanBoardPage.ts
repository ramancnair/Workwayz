import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Kanban Board page
 * Route: /projects/:projectId/development/kanban
 */
export class KanbanBoardPage extends BasePage {
  readonly kanbanColumns: Locator;
  readonly storyFilterButton: Locator;
  readonly subTaskFilterButton: Locator;
  readonly engineerSortSelect: Locator;
  readonly kanbanCards: Locator;

  constructor(page: Page) {
    super(page);
    this.kanbanColumns = page.locator('[data-testid="kanban-column"], .kanban-column');
    this.storyFilterButton = page.getByRole('button', { name: /user stories/i });
    this.subTaskFilterButton = page.getByRole('button', { name: /sub-tasks/i });
    this.engineerSortSelect = page.getByRole('combobox', { name: /engineer|sort by/i });
    this.kanbanCards = page.locator('[data-testid="kanban-card"], .kanban-card');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/development/kanban`);
  }

  async filterByStories() {
    if (await this.storyFilterButton.isVisible()) {
      await this.storyFilterButton.click();
    }
  }

  async filterBySubTasks() {
    if (await this.subTaskFilterButton.isVisible()) {
      await this.subTaskFilterButton.click();
    }
  }

  async sortByEngineer(engineerName: string) {
    if (await this.engineerSortSelect.isVisible()) {
      await this.engineerSortSelect.selectOption({ label: engineerName });
    }
  }

  getColumnByName(name: string) {
    return this.kanbanColumns.filter({ hasText: name });
  }
}
