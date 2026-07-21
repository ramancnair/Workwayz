import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the My Account / Profile page
 * Route: /my-account
 */
export class MyAccountPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailDisplay: Locator;
  readonly phoneInput: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly saveProfileButton: Locator;
  readonly changePasswordButton: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByLabel(/first name/i);
    this.lastNameInput = page.getByLabel(/last name/i);
    this.emailDisplay = page.locator('[data-testid="email-display"]');
    this.phoneInput = page.getByLabel(/phone/i);
    this.currentPasswordInput = page.getByLabel(/current password/i);
    this.newPasswordInput = page.getByLabel(/new password/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.saveProfileButton = page.getByRole('button', { name: /save profile|update profile/i });
    this.changePasswordButton = page.getByRole('button', { name: /change password|update password/i });
  }

  async goto() {
    await this.navigateTo('/my-account');
  }

  async updateProfile(firstName: string, lastName: string, phone: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.phoneInput.fill(phone);
    await this.saveProfileButton.click();
  }

  async changePassword(currentPass: string, newPass: string) {
    await this.currentPasswordInput.fill(currentPass);
    await this.newPasswordInput.fill(newPass);
    await this.confirmPasswordInput.fill(newPass);
    await this.changePasswordButton.click();
  }
}
