import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectHomePage extends BasePage {
  readonly createNewProjectButton: Locator;
  readonly portfolioSelect: Locator;
  readonly projectNameInput: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly projectManagerSelect: Locator;
  readonly pricingModelSelect: Locator;
  readonly statusSelect: Locator;
  readonly saveProjectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.createNewProjectButton = page.getByRole('button', { name: /new project/i }).first();
    this.portfolioSelect = page.getByRole('combobox', { name: /portfolio/i });
    this.projectNameInput = page.getByLabel(/project name/i);
    this.startDateInput = page.getByLabel(/start date/i);
    this.endDateInput = page.getByLabel(/end date/i);
    this.projectManagerSelect = page.getByRole('combobox', { name: /project manager/i });
    this.pricingModelSelect = page.getByRole('combobox', { name: /pricing model/i });
    this.statusSelect = page.getByRole('combobox', { name: /status/i });
    this.saveProjectButton = page.getByRole('button', { name: /save project|create/i });
  }

  async goto() {
    await this.navigateTo('/project-home');
  }

  async createProject(details: {
    portfolio?: string;
    name: string;
    startDate: string;
    endDate: string;
    manager: string;
    pricingModel: string;
    status: string;
  }) {
    await this.createNewProjectButton.click();
    if (details.portfolio && await this.portfolioSelect.isVisible()) {
      await this.portfolioSelect.selectOption({ label: details.portfolio });
    }
    await this.projectNameInput.fill(details.name);
    await this.startDateInput.fill(details.startDate);
    await this.endDateInput.fill(details.endDate);
    if (await this.projectManagerSelect.isVisible()) {
      await this.projectManagerSelect.selectOption({ label: details.manager });
    }
    if (await this.pricingModelSelect.isVisible()) {
      await this.pricingModelSelect.selectOption({ label: details.pricingModel });
    }
    if (await this.statusSelect.isVisible()) {
      await this.statusSelect.selectOption({ label: details.status });
    }
    await this.saveProjectButton.click();
  }
}
