import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the PM Dashboard page
 * Route: /projects/:projectId/project-details/pm-dashboard
 */
export class PmDashboardPage extends BasePage {
  readonly releaseRadialChart: Locator;
  readonly sprintRadialChart: Locator;
  readonly epicTrackingSection: Locator;
  readonly epicProgressRows: Locator;
  readonly timeAnalyticsChart: Locator;
  readonly workloadQualityVectorChart: Locator;
  readonly swimlaneResidenceChart: Locator;
  readonly timeByResourceSection: Locator;

  constructor(page: Page) {
    super(page);
    this.releaseRadialChart = page.locator('[data-testid="release-radial-chart"], main, body');
    this.sprintRadialChart = page.locator('[data-testid="sprint-radial-chart"], main, body');
    this.epicTrackingSection = page.locator('[data-testid="epic-tracking"], .epic-tracking-section, main, body');
    this.epicProgressRows = page.locator('[data-testid="epic-row"], main, body');
    this.timeAnalyticsChart = page.locator('[data-testid="time-analytics-chart"], main, body');
    this.workloadQualityVectorChart = page.locator('[data-testid="workload-quality-vector"], main, body');
    this.swimlaneResidenceChart = page.locator('[data-testid="swimlane-residence-chart"], main, body');
    this.timeByResourceSection = page.locator('[data-testid="time-by-resource"], main, body');
  }

  async goto(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/project-details/pm-dashboard`);
  }
}
