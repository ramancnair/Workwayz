import { type LeavePeriod } from '@/types';

export interface ParsedJoiningDate {
  year: number;
  monthIndex: number; // 0 (Jan) - 11 (Dec)
  day: number; // 1 - 31
}

export interface LeavePolicySettings {
  allocatedPaidLeavesPerYear: number;
  allowCarryOver: boolean;
  carryOverLimit: number;
}

export interface EmployeeLeaveSource {
  employmentStartDate?: any;
  onboardingDate?: any;
  createdAt?: any;
  created_at?: any;
  leavePeriods?: LeavePeriod[];
}

export interface EmployeeLeaveQuotaStats {
  year: number;
  activeYear: number;
  allocated: number;
  prevYearAllocated: number;
  carriedOver: number;
  totalAvailable: number;
  activeYearPaidTaken: number;
  activeYearLopTaken: number;
  remainingPaid: number;
}

/**
 * Extracts calendar (year, monthIndex, day) from an employee's joining/onboarding date
 * without timezone-induced day shifts on ISO date strings ('YYYY-MM-DD...').
 */
export function parseEmployeeJoiningDate(user?: EmployeeLeaveSource | null): ParsedJoiningDate | null {
  if (!user) return null;

  const rawDate = user.employmentStartDate ?? user.onboardingDate ?? user.createdAt ?? user.created_at;
  if (!rawDate) return null;

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) return null;

    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const monthIndex = Number(isoMatch[2]) - 1;
      const day = Number(isoMatch[3]);
      if (!Number.isNaN(year) && monthIndex >= 0 && monthIndex <= 11 && day >= 1 && day <= 31) {
        return { year, monthIndex, day };
      }
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        monthIndex: parsed.getMonth(),
        day: parsed.getDate(),
      };
    }
    return null;
  }

  if (typeof rawDate?.toDate === 'function') {
    const d = rawDate.toDate();
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return {
        year: d.getUTCFullYear(),
        monthIndex: d.getUTCMonth(),
        day: d.getUTCDate(),
      };
    }
  }

  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return {
      year: rawDate.getFullYear(),
      monthIndex: rawDate.getMonth(),
      day: rawDate.getDate(),
    };
  }

  return null;
}

/**
 * Policy A: Monthly Pro-Rata Leave Allocation with 15th-of-Month Cutoff.
 *
 * - Before joining year (targetYear < joinYear): 0 days.
 * - Joining year (targetYear === joinYear):
 *   - Joined on or before the 15th of the month: joining month counts as 1 full eligible month
 *     (eligibleMonths = 12 - joinMonthIndex).
 *   - Joined after the 15th of the month (e.g., Dec 31): joining month counts as 0
 *     (eligibleMonths = 12 - (joinMonthIndex + 1)).
 *   - Pro-rated quota = round_to_nearest_0.5((annualQuota / 12) * eligibleMonths).
 * - After joining year (targetYear > joinYear): full annualQuota.
 */
export function calculatePolicyALeaveQuotaForYear(
  annualQuota: number,
  targetYear: number,
  joiningDate: ParsedJoiningDate | null,
  options?: { defaultFullIfMissingJoinDate?: boolean }
): number {
  const safeAnnualQuota = Math.max(0, Number(annualQuota) || 0);

  if (!joiningDate) {
    return options?.defaultFullIfMissingJoinDate !== false ? safeAnnualQuota : 0;
  }

  if (targetYear < joiningDate.year) {
    return 0;
  }

  if (targetYear > joiningDate.year) {
    return safeAnnualQuota;
  }

  const eligibleMonths =
    joiningDate.day <= 15
      ? 12 - joiningDate.monthIndex
      : 12 - (joiningDate.monthIndex + 1);

  const rawQuota = (safeAnnualQuota / 12) * Math.max(0, eligibleMonths);
  return Math.round(rawQuota * 2) / 2;
}

/**
 * Computes an employee's pro-rated base quota, carry-forward from previous year's
 * pro-rated unused balance, and remaining paid leave balance for `year`.
 */
export function calculateEmployeeLeaveQuotaStats(
  user: EmployeeLeaveSource,
  year: number,
  leaveSettings: LeavePolicySettings,
  calculateBusinessDaysForYear: (period: LeavePeriod, targetYear: number) => number
): EmployeeLeaveQuotaStats {
  const prevYear = year - 1;
  const joiningDate = parseEmployeeJoiningDate(user);

  const hasLeavesInPrevYearOrBefore = (user.leavePeriods || []).some(
    (p) => p.startDate && new Date(p.startDate).getFullYear() <= prevYear
  );

  const allocated = calculatePolicyALeaveQuotaForYear(
    leaveSettings.allocatedPaidLeavesPerYear,
    year,
    joiningDate,
    { defaultFullIfMissingJoinDate: true }
  );

  const prevYearAllocated = calculatePolicyALeaveQuotaForYear(
    leaveSettings.allocatedPaidLeavesPerYear,
    prevYear,
    joiningDate,
    { defaultFullIfMissingJoinDate: hasLeavesInPrevYearOrBefore }
  );

  const prevYearPaidTaken = (user.leavePeriods || [])
    .filter((p) => p.type === 'Paid Leave' || !p.type)
    .reduce((sum, p) => sum + calculateBusinessDaysForYear(p, prevYear), 0);

  const remainingPrev = Math.max(0, prevYearAllocated - prevYearPaidTaken);

  const existedInPrevYear = joiningDate
    ? joiningDate.year <= prevYear
    : hasLeavesInPrevYearOrBefore;

  const carriedOver =
    existedInPrevYear && leaveSettings.allowCarryOver
      ? Math.min(remainingPrev, Math.max(0, Number(leaveSettings.carryOverLimit) || 0))
      : 0;

  const totalAvailable = allocated + carriedOver;

  const activeYearPaidTaken = (user.leavePeriods || [])
    .filter((p) => p.type === 'Paid Leave' || !p.type)
    .reduce((sum, p) => sum + calculateBusinessDaysForYear(p, year), 0);

  const activeYearLopTaken = (user.leavePeriods || [])
    .filter((p) => p.type === 'Loss of Pay')
    .reduce((sum, p) => sum + calculateBusinessDaysForYear(p, year), 0);

  const remainingPaid = Math.max(0, totalAvailable - activeYearPaidTaken);

  return {
    year,
    activeYear: year,
    allocated,
    prevYearAllocated,
    carriedOver,
    totalAvailable,
    activeYearPaidTaken,
    activeYearLopTaken,
    remainingPaid,
  };
}

