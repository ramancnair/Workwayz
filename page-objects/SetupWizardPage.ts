import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SetupWizardPage extends BasePage {
  // Navigation & Step Controls
  readonly nextButton: Locator;
  readonly saveChangesButton: Locator;
  readonly completeSetupButton: Locator;

  // Database Step Inputs
  readonly projectNameInput: Locator;
  readonly dbProviderSelect: Locator;
  readonly firebaseProjectIdInput: Locator;
  readonly firebaseApiKeyInput: Locator;

  // Auth Step Controls
  readonly googleSsoToggle: Locator;
  readonly githubSsoToggle: Locator;

  // Super Admin Step Inputs
  readonly adminNameInput: Locator;
  readonly adminEmailInput: Locator;
  readonly adminPasswordInput: Locator;
  readonly adminConfirmPasswordInput: Locator;

  // AI Step Inputs
  readonly aiProfileNameInput: Locator;
  readonly aiProviderSelect: Locator;
  readonly aiApiKeyInput: Locator;
  readonly aiModelOverrideInput: Locator;

  constructor(page: Page) {
    super(page);
    this.nextButton = page.getByRole('button', { name: /next/i });
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i });
    this.completeSetupButton = page.getByRole('button', { name: /complete setup/i });

    // Database Setup
    this.projectNameInput = page.getByLabel(/project name/i).first();
    this.dbProviderSelect = page.getByRole('combobox', { name: /database provider/i });
    this.firebaseProjectIdInput = page.getByLabel(/project id/i);
    this.firebaseApiKeyInput = page.getByLabel(/api key/i).first();

    // Auth Setup
    this.googleSsoToggle = page.getByLabel(/enable google sso/i);
    this.githubSsoToggle = page.getByLabel(/enable github sso/i);

    // Admin Creation
    this.adminNameInput = page.getByLabel(/user name|full name/i);
    this.adminEmailInput = page.getByLabel(/email/i);
    this.adminPasswordInput = page.getByLabel(/^password$/i);
    this.adminConfirmPasswordInput = page.getByLabel(/re-enter password|confirm password/i);

    // AI Configuration
    this.aiProfileNameInput = page.getByLabel(/ai profile name|project name/i);
    this.aiProviderSelect = page.getByRole('combobox', { name: /ai provider/i });
    this.aiApiKeyInput = page.getByLabel(/ai api key|api key/i);
    this.aiModelOverrideInput = page.getByLabel(/default model override/i);
  }

  async goto() {
    await this.navigateTo('/setup-wizard');
  }

  async configureDatabase(projectName: string, provider: string, projectId: string, apiKey: string) {
    await this.projectNameInput.fill(projectName);
    if (await this.dbProviderSelect.isVisible()) {
      await this.dbProviderSelect.selectOption({ label: provider });
    }
    await this.firebaseProjectIdInput.fill(projectId);
    await this.firebaseApiKeyInput.fill(apiKey);
    await this.saveChangesButton.click();
  }

  async configureAuthentication(enableGoogle: boolean, enableGithub: boolean) {
    if (enableGoogle && !(await this.googleSsoToggle.isChecked())) {
      await this.googleSsoToggle.check();
    }
    if (enableGithub && !(await this.githubSsoToggle.isChecked())) {
      await this.githubSsoToggle.check();
    }
    await this.saveChangesButton.click();
  }

  async createSuperAdmin(name: string, email: string, pass: string) {
    await this.adminNameInput.fill(name);
    await this.adminEmailInput.fill(email);
    await this.adminPasswordInput.fill(pass);
    await this.adminConfirmPasswordInput.fill(pass);
    await this.nextButton.click();
  }

  async configureAi(profileName: string, provider: string, apiKey: string, modelOverride?: string) {
    await this.aiProfileNameInput.fill(profileName);
    if (await this.aiProviderSelect.isVisible()) {
      await this.aiProviderSelect.selectOption({ label: provider });
    }
    await this.aiApiKeyInput.fill(apiKey);
    if (modelOverride) {
      await this.aiModelOverrideInput.fill(modelOverride);
    }
    await this.saveChangesButton.click();
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async completeSetup() {
    await this.completeSetupButton.click();
  }
}
