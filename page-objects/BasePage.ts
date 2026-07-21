import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly sidebarNav: Locator;
  readonly pageHeader: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarNav = page.locator('nav, aside, [data-testid="sidebar"]');
    this.pageHeader = page.locator('header, h1');
    this.toastContainer = page.locator('[role="status"], [role="alert"], .toast');
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async waitForHeader(text: string) {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  async clickSidebarItem(label: string) {
    await this.sidebarNav.getByRole('link', { name: label }).click();
  }

  async expectToastMessage(text: string) {
    await expect(this.toastContainer.filter({ hasText: text })).toBeVisible();
  }
}
