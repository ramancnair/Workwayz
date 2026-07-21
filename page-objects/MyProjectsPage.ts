import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyProjectsPage extends BasePage {
  readonly myProjectsGrid: Locator;
  readonly projectCards: Locator;
  readonly initialEstimationsSection: Locator;

  constructor(page: Page) {
    super(page);
    this.myProjectsGrid = page.locator('[data-testid="my-projects-grid"]').first().or(page.locator('.projects-grid').first()).or(page.locator('main').first());
    this.projectCards = page.locator('[data-testid="project-card"]').first().or(page.locator('.project-card').first());
    this.initialEstimationsSection = page.locator('[data-testid="initial-estimations"]').first().or(page.locator('.initial-estimations-section').first());
  }

  async goto() {
    await this.navigateTo('/my-projects');
  }

  async openProjectByName(name: string) {
    await this.projectCards.filter({ hasText: name }).first().click();
  }
}
