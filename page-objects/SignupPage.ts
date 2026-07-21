import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SignupPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly empIdInput: Locator;
  readonly phoneInput: Locator;
  readonly experienceInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signupButton: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByLabel(/first name/i).first();
    this.lastNameInput = page.getByLabel(/last name/i).first();
    this.empIdInput = page.getByLabel(/emp id|employee id/i).first();
    this.phoneInput = page.getByLabel(/phone/i).first();
    this.experienceInput = page.getByLabel(/experience/i).first();
    this.emailInput = page.getByLabel(/email/i).first();
    this.passwordInput = page.getByLabel(/password/i).first();
    this.signupButton = page.getByRole('button', { name: /sign up|register/i }).first();
  }

  async goto() {
    await this.navigateTo('/signup');
  }

  async registerUser(details: {
    firstName: string;
    lastName: string;
    empId: string;
    phone: string;
    experience: string;
    email: string;
    password: string;
  }) {
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.empIdInput.fill(details.empId);
    await this.phoneInput.fill(details.phone);
    await this.experienceInput.fill(details.experience);
    await this.emailInput.fill(details.email);
    await this.passwordInput.fill(details.password);
    await this.signupButton.click();
  }
}
