import { describe, it, expect } from 'vitest';
import {
  parseEmployeeJoiningDate,
  calculatePolicyALeaveQuotaForYear,
  calculateEmployeeLeaveQuotaStats,
} from '../leave-utils';
import { type LeavePeriod } from '@/types';

describe('Leave Allocation & Carry-Over Policy A (leave-utils.ts)', () => {
  describe('parseEmployeeJoiningDate', () => {
    it('extracts exact year, monthIndex, and day from YYYY-MM-DD and ISO strings without timezone drift', () => {
      expect(parseEmployeeJoiningDate({ employmentStartDate: '2026-12-31' })).toEqual({
        year: 2026,
        monthIndex: 11,
        day: 31,
      });
      expect(parseEmployeeJoiningDate({ employmentStartDate: '2026-12-31T00:00:00.000Z' })).toEqual({
        year: 2026,
        monthIndex: 11,
        day: 31,
      });
      expect(parseEmployeeJoiningDate({ onboardingDate: '2026-01-15' })).toEqual({
        year: 2026,
        monthIndex: 0,
        day: 15,
      });
    });

    it('returns null when no joining or onboarding date is present', () => {
      expect(parseEmployeeJoiningDate(null)).toBeNull();
      expect(parseEmployeeJoiningDate({})).toBeNull();
      expect(parseEmployeeJoiningDate({ employmentStartDate: '   ' })).toBeNull();
    });
  });

  describe('calculatePolicyALeaveQuotaForYear (Monthly Pro-Rata with 15th Cutoff)', () => {
    const annualQuota = 26;

    it('returns 0 for years prior to the joining year', () => {
      const joinDate = { year: 2026, monthIndex: 5, day: 10 };
      expect(calculatePolicyALeaveQuotaForYear(annualQuota, 2025, joinDate)).toBe(0);
    });

    it('returns the full annual quota for years after the joining year', () => {
      const joinDate = { year: 2026, monthIndex: 11, day: 31 };
      expect(calculatePolicyALeaveQuotaForYear(annualQuota, 2027, joinDate)).toBe(26);
    });

    it('pro-rates joining year quota with 15th-of-month cutoff rounded to nearest 0.5 day', () => {
      // Joined Jan 10 (<= 15th) -> 12 eligible months -> 26 days
      expect(
        calculatePolicyALeaveQuotaForYear(annualQuota, 2026, { year: 2026, monthIndex: 0, day: 10 })
      ).toBe(26);

      // Joined Jan 16 (> 15th) -> 11 eligible months -> (26 / 12) * 11 = 23.83 -> 24 days
      expect(
        calculatePolicyALeaveQuotaForYear(annualQuota, 2026, { year: 2026, monthIndex: 0, day: 16 })
      ).toBe(24);

      // Joined Jul 1 (<= 15th) -> 6 eligible months -> 13 days
      expect(
        calculatePolicyALeaveQuotaForYear(annualQuota, 2026, { year: 2026, monthIndex: 6, day: 1 })
      ).toBe(13);

      // Joined Dec 15 (<= 15th) -> 1 eligible month -> (26 / 12) * 1 = 2.16 -> 2 days
      expect(
        calculatePolicyALeaveQuotaForYear(annualQuota, 2026, { year: 2026, monthIndex: 11, day: 15 })
      ).toBe(2);

      // Joined Dec 31 (> 15th) -> 0 eligible months -> 0 days
      expect(
        calculatePolicyALeaveQuotaForYear(annualQuota, 2026, { year: 2026, monthIndex: 11, day: 31 })
      ).toBe(0);
    });
  });

  describe('calculateEmployeeLeaveQuotaStats (Dec 31 -> Jan 1 Carry-Over & Pro-Rata Ledger)', () => {
    const defaultSettings = {
      allocatedPaidLeavesPerYear: 26,
      allowCarryOver: true,
      carryOverLimit: 10,
    };

    const mockBusinessDays = (period: LeavePeriod, targetYear: number) => {
      const pYear = new Date(period.startDate).getFullYear();
      if (pYear !== targetYear) return 0;
      return period.isHalfDay ? 0.5 : 1;
    };

    it('allocates 0 days on Dec 31 and carries over 0 days on Jan 1 for a Dec 31 joiner', () => {
      const dec31Joiner = {
        employmentStartDate: '2026-12-31T00:00:00.000Z',
        leavePeriods: [],
      };

      const stats2026 = calculateEmployeeLeaveQuotaStats(
        dec31Joiner,
        2026,
        defaultSettings,
        mockBusinessDays
      );
      expect(stats2026.allocated).toBe(0);
      expect(stats2026.carriedOver).toBe(0);
      expect(stats2026.totalAvailable).toBe(0);
      expect(stats2026.remainingPaid).toBe(0);

      const stats2027 = calculateEmployeeLeaveQuotaStats(
        dec31Joiner,
        2027,
        defaultSettings,
        mockBusinessDays
      );
      expect(stats2027.prevYearAllocated).toBe(0);
      expect(stats2027.carriedOver).toBe(0);
      expect(stats2027.allocated).toBe(26);
      expect(stats2027.totalAvailable).toBe(26);
      expect(stats2027.remainingPaid).toBe(26);
    });

    it('carries over only the unused pro-rated balance for a mid-year joiner', () => {
      // Joined Nov 1, 2026 -> 2 eligible months in 2026 -> (26/12)*2 = 4.33 -> 4.5 days allocated in 2026
      // Took 1 paid leave day in Nov 2026 -> 3.5 days remaining to carry into 2027
      const nov1Joiner = {
        employmentStartDate: '2026-11-01',
        leavePeriods: [
          {
            id: 'lp-1',
            startDate: '2026-11-18T00:00:00.000Z',
            endDate: '2026-11-18T00:00:00.000Z',
            type: 'Paid Leave' as const,
            isHalfDay: false,
          },
        ],
      };

      const stats2027 = calculateEmployeeLeaveQuotaStats(
        nov1Joiner,
        2027,
        defaultSettings,
        mockBusinessDays
      );
      expect(stats2027.prevYearAllocated).toBe(4.5);
      expect(stats2027.carriedOver).toBe(3.5);
      expect(stats2027.allocated).toBe(26);
      expect(stats2027.totalAvailable).toBe(29.5);
    });

    it('caps carry-over at carryOverLimit when unused pro-rated balance exceeds limit', () => {
      // Joined Jan 1, 2026 -> 26 days in 2026, 0 taken -> remaining 26 -> capped at 10 in 2027
      const jan1Joiner = {
        employmentStartDate: '2026-01-01',
        leavePeriods: [],
      };

      const stats2027 = calculateEmployeeLeaveQuotaStats(
        jan1Joiner,
        2027,
        defaultSettings,
        mockBusinessDays
      );
      expect(stats2027.prevYearAllocated).toBe(26);
      expect(stats2027.carriedOver).toBe(10);
      expect(stats2027.totalAvailable).toBe(36);
    });
  });
});

