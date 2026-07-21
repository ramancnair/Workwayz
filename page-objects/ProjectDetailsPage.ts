import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectDetailsPage extends BasePage {
  readonly statusSelect: Locator;
  readonly projectManagerSelect: Locator;
  readonly pricingModelSelect: Locator;
  readonly scopeHealthSlider: Locator;
  readonly costHealthSlider: Locator;
  readonly timeHealthSlider: Locator;
  readonly saveDetailsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.statusSelect = page.getByRole('combobox', { name: /project status/i });
    this.projectManagerSelect = page.getByRole('combobox', { name: /assigned pm/i });
    this.pricingModelSelect = page.getByRole('combobox', { name: /pricing structure/i });
    this.scopeHealthSlider = page.locator('[aria-label="Scope Health"], input[name="scopeHealth"]');
    this.costHealthSlider = page.locator('[aria-label="Cost Health"], input[name="costHealth"]');
    this.timeHealthSlider = page.locator('[aria-label="Time Health"], input[name="timeHealth"]');
    this.saveDetailsButton = page.getByRole('button', { name: /save changes|update details/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/project-details`);
  }

  async setHealthIndicators(scope: string, cost: string, time: string) {
    if (await this.scopeHealthSlider.isVisible()) {
      await this.scopeHealthSlider.fill(scope);
    }
    if (await this.costHealthSlider.isVisible()) {
      await this.costHealthSlider.fill(cost);
    }
    if (await this.timeHealthSlider.isVisible()) {
      await this.timeHealthSlider.fill(time);
    }
    await this.saveDetailsButton.click();
  }
}
