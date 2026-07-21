import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the PMO Documents page
 * Route: /projects/:projectId/pmo/documents
 */
export class PmoDocumentsPage extends BasePage {
  readonly documentsList: Locator;
  readonly addDocumentButton: Locator;
  readonly documentTypeSelect: Locator;
  readonly documentUrlInput: Locator;
  readonly saveDocumentButton: Locator;
  readonly phaseGateStatuses: Locator;

  constructor(page: Page) {
    super(page);
    this.documentsList = page.locator('[data-testid="pmo-documents-list"], .pmo-documents');
    this.addDocumentButton = page.getByRole('button', { name: /add document|register url/i });
    this.documentTypeSelect = page.getByRole('combobox', { name: /document type/i });
    this.documentUrlInput = page.getByLabel(/document url|url/i);
    this.saveDocumentButton = page.getByRole('button', { name: /save|register/i });
    this.phaseGateStatuses = page.locator('[data-testid="phase-gate-status"]');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/pmo/documents`);
  }

  async registerDocument(type: string, url: string) {
    if (await this.addDocumentButton.isVisible()) {
      await this.addDocumentButton.click();
    }
    if (await this.documentTypeSelect.isVisible()) {
      await this.documentTypeSelect.selectOption({ label: type });
    }
    if (await this.documentUrlInput.isVisible()) {
      await this.documentUrlInput.fill(url);
    }
    if (await this.saveDocumentButton.isVisible()) {
      await this.saveDocumentButton.click();
    }
  }
}
