import { describe, it, expect } from 'vitest';
import {
  groupResourceRatesByPerson,
  type ResourceRateRow,
} from '../billing-rate-grouping';

describe('groupResourceRatesByPerson', () => {
  const mockAllocations: ResourceRateRow[] = [
    {
      id: 'emp-1-proj-a',
      userId: 'user-adrian',
      projectId: 'proj-1',
      projectName: 'Omnichannel Mobile Self-Service',
      pricingModel: 'T&M',
      empId: 'E12351',
      firstName: 'Adrian',
      lastName: 'Sterling',
      role: 'Architect',
      accessLevel: 'Lead',
      availability: 50,
      billedRate: 14000,
      costRate: 8000,
      margin: 6000,
      marginPercentage: 42.86,
    },
    {
      id: 'emp-1-proj-b',
      userId: 'user-adrian',
      projectId: 'proj-2',
      projectName: 'AI-Powered Customer Assistance Hub',
      pricingModel: 'Fixed Bid',
      empId: 'E12351',
      firstName: 'Adrian',
      lastName: 'Sterling',
      role: 'Architect',
      accessLevel: 'Lead',
      availability: 50,
      billedRate: 16000,
      costRate: 10000,
      margin: 6000,
      marginPercentage: 37.5,
    },
    {
      id: 'emp-2-proj-b',
      userId: 'user-kendall',
      projectId: 'proj-2',
      projectName: 'AI-Powered Customer Assistance Hub',
      pricingModel: 'Fixed Bid',
      empId: 'E12355',
      firstName: 'Kendall',
      lastName: 'Hayes',
      role: 'Lead',
      accessLevel: 'Senior Management',
      availability: 100,
      billedRate: 12000,
      costRate: 7000,
      margin: 5000,
      marginPercentage: 41.67,
    },
  ];

  it('correctly groups allocations by person key (empId)', () => {
    const groups = groupResourceRatesByPerson(mockAllocations, 'firstName', true);

    expect(groups).toHaveLength(2);

    const adrian = groups.find((g) => g.empId === 'E12351');
    expect(adrian).toBeDefined();
    expect(adrian?.firstName).toBe('Adrian');
    expect(adrian?.allocations).toHaveLength(2);
    expect(adrian?.totalAvailability).toBe(100);

    const kendall = groups.find((g) => g.empId === 'E12355');
    expect(kendall).toBeDefined();
    expect(kendall?.firstName).toBe('Kendall');
    expect(kendall?.allocations).toHaveLength(1);
    expect(kendall?.totalAvailability).toBe(100);
  });

  it('accurately computes average daily billed rate, cost rate, and margin across allocations', () => {
    const groups = groupResourceRatesByPerson(mockAllocations);
    const adrian = groups.find((g) => g.empId === 'E12351')!;

    // Adrian rates: 14000 and 16000 -> avg = 15000
    expect(adrian.avgBilledRate).toBe(15000);
    // Adrian costs: 8000 and 10000 -> avg = 9000
    expect(adrian.avgCostRate).toBe(9000);
    // Margin: 15000 - 9000 = 6000
    expect(adrian.avgMargin).toBe(6000);
    // Margin %: (6000 / 15000) * 100 = 40%
    expect(adrian.avgMarginPercentage).toBe(40);
  });

  it('supports sorting by average billed rate descending and ascending', () => {
    const sortedDesc = groupResourceRatesByPerson(mockAllocations, 'billedRate', false);
    expect(sortedDesc[0].empId).toBe('E12351'); // Adrian: 15000
    expect(sortedDesc[1].empId).toBe('E12355'); // Kendall: 12000

    const sortedAsc = groupResourceRatesByPerson(mockAllocations, 'billedRate', true);
    expect(sortedAsc[0].empId).toBe('E12355'); // Kendall: 12000
    expect(sortedAsc[1].empId).toBe('E12351'); // Adrian: 15000
  });

  it('handles empty input gracefully', () => {
    const groups = groupResourceRatesByPerson([]);
    expect(groups).toEqual([]);
  });
});
