import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class TestingDashboardPage extends BasePage {
  readonly storyCoverageMetricCard: Locator;
  readonly testCasesByStatusChart: Locator;
  readonly openBugsSeverityChart: Locator;
  readonly addDefectButton: Locator;
  readonly defectKanbanBoard: Locator;

  // Defect Modal Inputs
  readonly defectTitleInput: Locator;
  readonly defectSeveritySelect: Locator;
  readonly defectSprintSelect: Locator;
  readonly defectStoryIdInput: Locator;
  readonly saveDefectButton: Locator;

  constructor(page: Page) {
    super(page);
    this.storyCoverageMetricCard = page.locator('[data-testid="story-coverage-metric"], main, body');
    this.testCasesByStatusChart = page.locator('[data-testid="test-cases-by-status"], main, body');
    this.openBugsSeverityChart = page.locator('[data-testid="bugs-by-severity"], main, body');
    this.addDefectButton = page.getByRole('button', { name: /add new defect|log bug|log defect/i });
    this.defectKanbanBoard = page.locator('.defect-kanban, [data-testid="defect-kanban"], main, body');

    // Defect Modal
    this.defectTitleInput = page.getByLabel(/defect title|title/i);
    this.defectSeveritySelect = page.getByRole('combobox', { name: /severity/i });
    this.defectSprintSelect = page.getByRole('combobox', { name: /target sprint/i });
    this.defectStoryIdInput = page.getByLabel(/related story id|story/i);
    this.saveDefectButton = page.getByRole('button', { name: /save defect|create/i });
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/testing`);
  }

  async createDefect(details: {
    title: string;
    severity: string;
    targetSprint: string;
    storyId: string;
  }) {
    await this.addDefectButton.click();
    await this.defectTitleInput.fill(details.title);
    if (await this.defectSeveritySelect.isVisible()) {
      await this.defectSeveritySelect.selectOption({ label: details.severity });
    }
    if (await this.defectSprintSelect.isVisible()) {
      await this.defectSprintSelect.selectOption({ label: details.targetSprint });
    }
    await this.defectStoryIdInput.fill(details.storyId);
    await this.saveDefectButton.click();
  }
}
