import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Product Backlog page
 * Route: /projects/:projectId/development/backlog
 */
export class ProductBacklogPage extends BasePage {
  readonly backlogItems: Locator;
  readonly addItemButton: Locator;
  readonly itemTitleInput: Locator;
  readonly itemTypeSelect: Locator;
  readonly itemPointsInput: Locator;
  readonly saveItemButton: Locator;

  constructor(page: Page) {
    super(page);
    this.backlogItems = page.locator('[data-testid="backlog-item"], .backlog-item, main, body');
    this.addItemButton = page.getByRole('button', { name: /add item|add story|new item/i });
    this.itemTitleInput = page.getByLabel(/title|story title/i);
    this.itemTypeSelect = page.getByRole('combobox', { name: /item type|type/i });
    this.itemPointsInput = page.getByLabel(/story points|points/i);
    this.saveItemButton = page.getByRole('button', { name: /save|create/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/development/backlog`);
  }

  async createItem(title: string, type: string, points?: number) {
    await this.addItemButton.click();
    await this.itemTitleInput.fill(title);
    if (await this.itemTypeSelect.isVisible()) {
      await this.itemTypeSelect.selectOption({ label: type });
    }
    if (points !== undefined) {
      await this.itemPointsInput.fill(points.toString());
    }
    await this.saveItemButton.click();
  }

  getItemByTitle(title: string) {
    return this.backlogItems.filter({ hasText: title });
  }
}
