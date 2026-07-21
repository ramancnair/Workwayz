import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for the Project Holidays and Leave Calendar pages
 * Routes:
 *   /projects/:projectId/holidays
 *   /projects/:projectId/holidays/leave-calendar
 */
export class ProjectHolidaysPage extends BasePage {
  readonly holidayCalendar: Locator;
  readonly leaveCalendar: Locator;

  constructor(page: Page) {
    super(page);
    this.holidayCalendar = page.locator('[data-testid="project-holiday-calendar"]');
    this.leaveCalendar = page.locator('[data-testid="project-leave-calendar"]');
  }

  async gotoHolidays(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/holidays`);
  }

  async gotoLeaveCalendar(projectId: string) {
    await this.navigateTo(`/projects/${projectId}/holidays/leave-calendar`);
  }
}
