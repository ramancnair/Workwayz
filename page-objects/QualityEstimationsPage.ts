import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class QualityEstimationsPage extends BasePage {
  readonly initialEstimationGate: Locator;
  readonly plannedEstimationGate: Locator;
  readonly actualEffortGate: Locator;
  readonly kpiSummaryHighlightCard: Locator;
  readonly sitDefectsCard: Locator;
  readonly uatDefectsCard: Locator;
  readonly prodLeaksCard: Locator;

  constructor(page: Page) {
    super(page);
    this.initialEstimationGate = page.locator('[data-testid="initial-estimation-gate"]').first();
    this.plannedEstimationGate = page.locator('[data-testid="planned-estimation-gate"]').first();
    this.actualEffortGate = page.locator('[data-testid="actual-effort-gate"]').first();
    this.kpiSummaryHighlightCard = page.locator('[data-testid="kpi-summary"]').first();
    this.sitDefectsCard = page.locator('[data-testid="sit-defects"]').first();
    this.uatDefectsCard = page.locator('[data-testid="uat-defects"]').first();
    this.prodLeaksCard = page.locator('[data-testid="prod-leaks"]').first();
  }

  async goto() {
    await this.navigateTo('/quality');
  }
}
