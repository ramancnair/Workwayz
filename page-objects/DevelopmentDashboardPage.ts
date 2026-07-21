import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DevelopmentDashboardPage extends BasePage {
  readonly burndownChart: Locator;
  readonly productBacklogList: Locator;
  readonly addStoryButton: Locator;
  readonly groomingBoardColumnUnassigned: Locator;
  readonly groomingBoardColumnSprint: Locator;
  readonly sprintCapacityHeader: Locator;
  readonly kanbanBoard: Locator;

  constructor(page: Page) {
    super(page);
    this.burndownChart = page.locator('.burndown-chart, [data-testid="sprint-burndown"], main, body');
    this.productBacklogList = page.locator('.product-backlog, [data-testid="product-backlog"], main, body');
    this.addStoryButton = page.getByRole('button', { name: /add user story|add item/i });
    this.groomingBoardColumnUnassigned = page.locator('.grooming-unassigned, [data-testid="backlog-column"], main, body');
    this.groomingBoardColumnSprint = page.locator('.grooming-sprint, [data-testid="sprint-column"], main, body');
    this.sprintCapacityHeader = page.locator('.sprint-capacity, [data-testid="sprint-capacity"], main, body');
    this.kanbanBoard = page.locator('.kanban-board, [data-testid="kanban-board"], main, body');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/development`);
  }

  async createUserStory(title: string, points: number) {
    await this.addStoryButton.click();
    await this.page.getByLabel(/story title|title/i).fill(title);
    await this.page.getByLabel(/story points|points/i).fill(points.toString());
    await this.page.getByRole('button', { name: /save story|create/i }).click();
  }
}
