import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly askGeminiOverlayButton: Locator;
  readonly askGeminiPanel: Locator;
  readonly askGeminiInput: Locator;
  readonly passwordResetPanel: Locator;
  readonly newPasswordInput: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel(/email/i).first();
    this.passwordInput = page.getByLabel(/password/i).first();
    this.loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();

    // Ask Gemini Overlay
    this.askGeminiOverlayButton = page.getByRole('button', { name: /ask gemini/i });
    this.askGeminiPanel = page.locator('[data-testid="ask-gemini-panel"]').first().or(page.locator('.gemini-panel').first());
    this.askGeminiInput = page.getByPlaceholder(/ask gemini|type a message/i).first();

    // Password reset modal/panel - use specific locator first, avoid body fallback
    this.passwordResetPanel = page.locator('[data-testid="password-reset"]').first().or(page.locator('.password-reset-panel').first());
    this.newPasswordInput = page.getByLabel(/new password/i);
  }

  async goto() {
    await this.navigateTo('/login');
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }

  async openAskGemini() {
    await this.askGeminiOverlayButton.click();
  }

  async sendAskGeminiPrompt(prompt: string) {
    await this.askGeminiInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.askGeminiInput.fill(prompt);
    await this.page.keyboard.press('Enter');
  }

  async updatePasswordOnFirstLogin(newPass: string) {
    await this.newPasswordInput.fill(newPass);
    await this.page.getByRole('button', { name: /update password|submit/i }).click();
  }
}
