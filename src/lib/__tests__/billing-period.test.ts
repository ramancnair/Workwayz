import { describe, it, expect } from 'vitest';
import {
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  subQuarters,
  addQuarters,
  format,
  getQuarter,
  getYear,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';

describe('Billing Period Financial Accounting & Date Range Helpers', () => {
  it('correctly calculates monthly intervals and step navigation', () => {
    const curMonth = '2026-10';
    const d = parseISO(`${curMonth}-01`);
    
    expect(format(startOfMonth(d), 'yyyy-MM-dd')).toBe('2026-10-01');
    expect(format(endOfMonth(d), 'yyyy-MM-dd')).toBe('2026-10-31');

    // Previous month (Sep 2026)
    const prevMonth = format(subMonths(d, 1), 'yyyy-MM');
    expect(prevMonth).toBe('2026-09');

    // Next month (Nov 2026)
    const nextMonth = format(addMonths(d, 1), 'yyyy-MM');
    expect(nextMonth).toBe('2026-11');
  });

  it('correctly calculates quarterly intervals and boundary stepping', () => {
    // Q4 2026
    const yr = 2026;
    const q = 4;
    const d = new Date(yr, (q - 1) * 3, 1);
    
    expect(format(startOfQuarter(d), 'yyyy-MM-dd')).toBe('2026-10-01');
    expect(format(endOfQuarter(d), 'yyyy-MM-dd')).toBe('2026-12-31');

    // Step back to Q3 2026
    const prevD = subQuarters(d, 1);
    expect(`${getYear(prevD)}-Q${getQuarter(prevD)}`).toBe('2026-Q3');

    // Boundary step back from Q1 2026 to Q4 2025
    const q1Date = new Date(2026, 0, 1);
    const prevFromQ1 = subQuarters(q1Date, 1);
    expect(`${getYear(prevFromQ1)}-Q${getQuarter(prevFromQ1)}`).toBe('2025-Q4');
  });

  it('correctly calculates yearly intervals', () => {
    const yr = 2026;
    const d = new Date(yr, 0, 1);
    
    expect(format(startOfYear(d), 'yyyy-MM-dd')).toBe('2026-01-01');
    expect(format(endOfYear(d), 'yyyy-MM-dd')).toBe('2026-12-31');
  });

  it('correctly resolves interval when Year is combined with Month or Quarter selection', () => {
    // Year 2025 + Month 05 (May)
    const yr = 2025;
    const mIdx = 4; // May (0-indexed)
    const monthDate = new Date(yr, mIdx, 1);
    expect(format(startOfMonth(monthDate), 'yyyy-MM-dd')).toBe('2025-05-01');
    expect(format(endOfMonth(monthDate), 'yyyy-MM-dd')).toBe('2025-05-31');
    expect(format(monthDate, 'MMMM yyyy')).toBe('May 2025');

    // Year 2025 + Quarter 3 (Jul - Sep)
    const q = 3;
    const qDate = new Date(yr, (q - 1) * 3, 1);
    expect(format(startOfQuarter(qDate), 'yyyy-MM-dd')).toBe('2025-07-01');
    expect(format(endOfQuarter(qDate), 'yyyy-MM-dd')).toBe('2025-09-30');
    expect(`Q${q} ${yr}`).toBe('Q3 2025');
  });

  it('correctly clamps resource working days to the active calendar interval', () => {
    // Period: October 2026 (2026-10-01 to 2026-10-31)
    const pStart = new Date(2026, 9, 1);
    const pEnd = new Date(2026, 9, 31, 23, 59, 59);

    // Employee 1: Active 2026-09-15 to 2026-10-10
    const userStart = new Date(2026, 8, 15);
    const userEnd = new Date(2026, 9, 10);

    const overlapStart = userStart < pStart ? pStart : userStart; // 2026-10-01
    const overlapEnd = userEnd > pEnd ? pEnd : userEnd;           // 2026-10-10

    expect(format(overlapStart, 'yyyy-MM-dd')).toBe('2026-10-01');
    expect(format(overlapEnd, 'yyyy-MM-dd')).toBe('2026-10-10');

    // 2026-10-01 to 2026-10-10:
    // Oct 1 (Thu), Oct 2 (Fri), Oct 5 (Mon), Oct 6 (Tue), Oct 7 (Wed), Oct 8 (Thu), Oct 9 (Fri) = 7 business days
    const interval = eachDayOfInterval({ start: overlapStart, end: overlapEnd });
    const businessDays = interval.filter(day => {
      const dow = day.getDay();
      return dow !== 0 && dow !== 6;
    });

    expect(businessDays.length).toBe(7);

    // Employee 2: Active in August 2026 only -> 0 days in October
    const augStart = new Date(2026, 7, 1);
    const augEnd = new Date(2026, 7, 31);
    const augOverlapStart = augStart < pStart ? pStart : augStart;
    const augOverlapEnd = augEnd > pEnd ? pEnd : augEnd;
    expect(augOverlapStart <= augOverlapEnd).toBe(false);
  });

  it('correctly attributes one-time and monthly fixed costs across intervals', () => {
    // Project started in October 2026
    const projStart = new Date(2026, 9, 15);
    const pOctStart = new Date(2026, 9, 1);
    const pOctEnd = new Date(2026, 9, 31);

    const pNovStart = new Date(2026, 10, 1);
    const pNovEnd = new Date(2026, 10, 30);

    const fixedCosts = [
      { id: '1', name: 'Software License', cost: 1000, type: 'One time' },
      { id: '2', name: 'Cloud Hosting', cost: 500, type: 'Monthly' },
    ];

    // In October: One-time is included ($1000) + Monthly for 1 month ($500) = $1500
    const octCosts = fixedCosts.reduce((acc, fc) => {
      if (fc.type === 'Monthly') return acc + fc.cost * 1;
      if (projStart >= pOctStart && projStart <= pOctEnd) return acc + fc.cost;
      return acc;
    }, 0);
    expect(octCosts).toBe(1500);

    // In November: One-time is NOT included (project didn't start in Nov) + Monthly ($500) = $500
    const novCosts = fixedCosts.reduce((acc, fc) => {
      if (fc.type === 'Monthly') return acc + fc.cost * 1;
      if (projStart >= pNovStart && projStart <= pNovEnd) return acc + fc.cost;
      return acc;
    }, 0);
    expect(novCosts).toBe(500);
  });
});
