import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * POM for global Holidays, Leave Settings, and Leave Tracker pages
 * Routes:
 *   /holidays/holiday-calendar
 *   /holidays/leave-settings
 *   /holidays/leave-tracker
 */
export class GlobalHolidaysPage extends BasePage {
  // Holiday Calendar
  readonly holidayCalendarGrid: Locator;
  readonly weeklyOffSaturdayToggle: Locator;
  readonly weeklyOffSundayToggle: Locator;
  readonly autoFillWithAiButton: Locator;

  // Leave Settings
  readonly annualPaidLeavesInput: Locator;
  readonly allowCarryOverToggle: Locator;
  readonly carryOverDaysLimitInput: Locator;
  readonly saveLeaveSettingsButton: Locator;
  readonly resourceLeaveAccountsTable: Locator;

  // Leave Tracker
  readonly applyForLeaveButton: Locator;
  readonly leaveStartDateInput: Locator;
  readonly leaveEndDateInput: Locator;
  readonly submitLeaveButton: Locator;
  readonly leaveBalanceRail: Locator;

  constructor(page: Page) {
    super(page);
    // Holiday Calendar
    this.holidayCalendarGrid = page.locator('[data-testid="holiday-calendar-grid"]').first();
    this.weeklyOffSaturdayToggle = page.getByLabel(/saturday/i).first();
    this.weeklyOffSundayToggle = page.getByLabel(/sunday/i).first();
    this.autoFillWithAiButton = page.getByRole('button', { name: /auto-fill with ai/i }).first();

    // Leave Settings
    this.annualPaidLeavesInput = page.getByLabel(/annual paid leaves quota/i).first();
    this.allowCarryOverToggle = page.getByLabel(/allow carry-over/i).first();
    this.carryOverDaysLimitInput = page.getByLabel(/carry-over days limit/i).first();
    this.saveLeaveSettingsButton = page.getByRole('button', { name: /save|update settings/i }).first();
    this.resourceLeaveAccountsTable = page.locator('[data-testid="resource-leave-accounts"]').first();

    // Leave Tracker
    this.applyForLeaveButton = page.getByRole('button', { name: /apply for leave/i }).first();
    this.leaveStartDateInput = page.getByLabel(/from|start date/i).first();
    this.leaveEndDateInput = page.getByLabel(/to|end date/i).first();
    this.submitLeaveButton = page.getByRole('button', { name: /submit leave|apply/i }).first();
    this.leaveBalanceRail = page.locator('[data-testid="leave-balance-rail"]').first();
  }

  async gotoHolidayCalendar() {
    await this.navigateTo('/holidays/holiday-calendar');
  }

  async gotoLeaveSettings() {
    await this.navigateTo('/holidays/leave-settings');
  }

  async gotoLeaveTracker() {
    await this.navigateTo('/holidays/leave-tracker');
  }

  async autoFillHolidays() {
    await this.autoFillWithAiButton.click();
  }

  async configureLeaveSettings(annualQuota: string, allowCarryOver: boolean, carryOverLimit: string) {
    await this.annualPaidLeavesInput.fill(annualQuota);
    const isChecked = await this.allowCarryOverToggle.isChecked();
    if (allowCarryOver && !isChecked) await this.allowCarryOverToggle.check();
    if (!allowCarryOver && isChecked) await this.allowCarryOverToggle.uncheck();
    await this.carryOverDaysLimitInput.fill(carryOverLimit);
    await this.saveLeaveSettingsButton.click();
  }

  async applyLeave(fromDate: string, toDate: string) {
    await this.applyForLeaveButton.click();
    await this.leaveStartDateInput.fill(fromDate);
    await this.leaveEndDateInput.fill(toDate);
    await this.submitLeaveButton.click();
  }
}
