import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for Portfolio Settings sub-pages
 * Routes:
 *   /portfolio-settings/access-settings
 *   /portfolio-settings/database
 *   /portfolio-settings/authentication
 *   /portfolio-settings/ai-config
 *   /portfolio-settings/archive
 */
export class PortfolioSettingsPage extends BasePage {
  // Access Settings
  readonly pageAccessMatrixTable: Locator;
  readonly crudAccessGridTable: Locator;
  readonly saveAccessSettingsButton: Locator;

  // Database
  readonly dbProviderSelect: Locator;
  readonly dbProjectIdInput: Locator;
  readonly dbApiKeyInput: Locator;
  readonly saveDbButton: Locator;

  // Authentication
  readonly googleOauthToggle: Locator;
  readonly facebookOauthToggle: Locator;
  readonly appleSsoToggle: Locator;
  readonly saveAuthButton: Locator;

  // AI Config
  readonly aiProviderSelect: Locator;
  readonly aiApiKeyInput: Locator;
  readonly aiModelSelect: Locator;
  readonly saveAiConfigButton: Locator;

  // Archive
  readonly archivePolicyInput: Locator;
  readonly autoDeletionRuleInput: Locator;
  readonly saveArchivePolicyButton: Locator;

  constructor(page: Page) {
    super(page);
    // Access Settings
    this.pageAccessMatrixTable = page.locator('[data-testid="page-access-matrix"]');
    this.crudAccessGridTable = page.locator('[data-testid="crud-access-grid"]');
    this.saveAccessSettingsButton = page.getByRole('button', { name: /save|update/i });

    // Database
    this.dbProviderSelect = page.getByRole('combobox', { name: /database provider/i });
    this.dbProjectIdInput = page.getByLabel(/project id/i);
    this.dbApiKeyInput = page.getByLabel(/api key/i);
    this.saveDbButton = page.getByRole('button', { name: /save|update/i });

    // Authentication
    this.googleOauthToggle = page.getByLabel(/google oauth/i);
    this.facebookOauthToggle = page.getByLabel(/facebook oauth/i);
    this.appleSsoToggle = page.getByLabel(/apple sso/i);
    this.saveAuthButton = page.getByRole('button', { name: /save|update/i });

    // AI Config
    this.aiProviderSelect = page.getByRole('combobox', { name: /ai provider/i });
    this.aiApiKeyInput = page.getByLabel(/api key/i);
    this.aiModelSelect = page.getByRole('combobox', { name: /default model/i });
    this.saveAiConfigButton = page.getByRole('button', { name: /save|update/i });

    // Archive
    this.archivePolicyInput = page.getByLabel(/archiving window|months post-closure/i);
    this.autoDeletionRuleInput = page.getByLabel(/auto-deletion|months in archive/i);
    this.saveArchivePolicyButton = page.getByRole('button', { name: /save policy/i });
  }

  async gotoAccessSettings() {
    await this.navigateTo('/portfolio-settings/access-settings');
  }

  async gotoDatabase() {
    await this.navigateTo('/portfolio-settings/database');
  }

  async gotoAuthentication() {
    await this.navigateTo('/portfolio-settings/authentication');
  }

  async gotoAiConfig() {
    await this.navigateTo('/portfolio-settings/ai-config');
  }

  async gotoArchive() {
    await this.navigateTo('/portfolio-settings/archive');
  }
}
