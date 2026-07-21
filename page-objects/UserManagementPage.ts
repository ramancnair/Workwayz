import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class UserManagementPage extends BasePage {
  readonly awaitingEnablementQueue: Locator;
  readonly addNewUserButton: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly empIdInput: Locator;
  readonly accessLevelSelect: Locator;
  readonly resourceCostInput: Locator;
  readonly saveUserButton: Locator;

  constructor(page: Page) {
    super(page);
    this.awaitingEnablementQueue = page.locator('[data-testid="awaiting-enablement"]').first();
    this.addNewUserButton = page.getByRole('button', { name: /add new user|add user/i }).first();
    this.firstNameInput = page.getByLabel(/first name/i).first();
    this.lastNameInput = page.getByLabel(/last name/i).first();
    this.empIdInput = page.getByLabel(/emp id|employee id/i).first();
    this.accessLevelSelect = page.getByRole('combobox', { name: /access level|role/i }).first();
    this.resourceCostInput = page.getByLabel(/resource cost/i).first();
    this.saveUserButton = page.getByRole('button', { name: /save user|create/i }).first();
  }

  async goto() {
    await this.navigateTo('/users');
  }

  async approveUser(userName: string) {
    const userRow = this.awaitingEnablementQueue.locator('[data-testid="user-row"]').filter({ hasText: userName }).first().or(this.awaitingEnablementQueue.locator('tr').filter({ hasText: userName }).first());
    await userRow.getByRole('button', { name: /approve|enable/i }).first().click();
  }

  async addUser(details: {
    firstName: string;
    lastName: string;
    empId: string;
    accessLevel: string;
    resourceCost: string;
  }) {
    await this.addNewUserButton.click();
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.empIdInput.fill(details.empId);
    if (await this.accessLevelSelect.isVisible()) {
      await this.accessLevelSelect.selectOption({ label: details.accessLevel });
    }
    await this.resourceCostInput.fill(details.resourceCost);
    await this.saveUserButton.click();
  }
}
