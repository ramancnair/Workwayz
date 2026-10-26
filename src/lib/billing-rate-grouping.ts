import type { AccessLevel } from '@/types';

export interface ResourceRateRow {
  id: string;
  userId?: string;
  projectId: string;
  projectName: string;
  pricingModel: string;
  empId: string;
  firstName: string;
  lastName: string;
  role: string;
  accessLevel: AccessLevel;
  avatar?: string;
  availability: number;
  billedRate: number;
  costRate: number;
  margin: number;
  marginPercentage: number;
  onboardingDate?: string;
  offloadingDate?: string;
}

export interface PersonResourceGroup {
  key: string;
  empId: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  accessLevel: AccessLevel;
  allocations: ResourceRateRow[];
  totalAvailability: number;
  avgBilledRate: number;
  avgCostRate: number;
  avgMargin: number;
  avgMarginPercentage: number;
  primaryProjectName: string;
  primaryRole: string;
}

/**
 * Groups individual resource rate project allocations by person (identified by empId or fullName).
 * Calculates aggregate availability and average daily billed rate, cost rate, and margin.
 */
export function groupResourceRatesByPerson(
  items: ResourceRateRow[],
  sortField: keyof ResourceRateRow = 'billedRate',
  sortAsc = false
): PersonResourceGroup[] {
  const map = new Map<string, PersonResourceGroup>();

  for (const item of items) {
    const key = (
      (item.empId && item.empId.trim()) ||
      `${item.firstName}_${item.lastName}`.trim() ||
      item.userId ||
      item.id
    ).toLowerCase();

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        empId: item.empId || '',
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        avatar: item.avatar,
        accessLevel: item.accessLevel,
        allocations: [],
        totalAvailability: 0,
        avgBilledRate: 0,
        avgCostRate: 0,
        avgMargin: 0,
        avgMarginPercentage: 0,
        primaryProjectName: item.projectName,
        primaryRole: item.role,
      };
      map.set(key, group);
    }
    group.allocations.push(item);
  }

  const groups = Array.from(map.values()).map((group) => {
    const count = group.allocations.length;
    const totalAvail = group.allocations.reduce((sum, a) => sum + (a.availability ?? 0), 0);
    const sumBilled = group.allocations.reduce((sum, a) => sum + (a.billedRate || 0), 0);
    const sumCost = group.allocations.reduce((sum, a) => sum + (a.costRate || 0), 0);
    const avgBilled = count > 0 ? Math.round(sumBilled / count) : 0;
    const avgCost = count > 0 ? Math.round(sumCost / count) : 0;
    const avgMargin = avgBilled - avgCost;
    const avgMarginPercentage = avgBilled > 0 ? (avgMargin / avgBilled) * 100 : 0;

    return {
      ...group,
      totalAvailability: totalAvail,
      avgBilledRate: avgBilled,
      avgCostRate: avgCost,
      avgMargin,
      avgMarginPercentage,
    };
  });

  return groups.sort((a, b) => {
    let valA: any;
    let valB: any;

    if (sortField === 'firstName' || sortField === 'empId') {
      valA = `${a.firstName} ${a.lastName}`.toLowerCase();
      valB = `${b.firstName} ${b.lastName}`.toLowerCase();
    } else if (sortField === 'accessLevel') {
      valA = (a.accessLevel || '').toLowerCase();
      valB = (b.accessLevel || '').toLowerCase();
    } else if (sortField === 'role') {
      valA = (a.primaryRole || '').toLowerCase();
      valB = (b.primaryRole || '').toLowerCase();
    } else if (sortField === 'projectName') {
      valA = (a.primaryProjectName || '').toLowerCase();
      valB = (b.primaryProjectName || '').toLowerCase();
    } else if (sortField === 'billedRate') {
      valA = a.avgBilledRate;
      valB = b.avgBilledRate;
    } else if (sortField === 'costRate') {
      valA = a.avgCostRate;
      valB = b.avgCostRate;
    } else if (sortField === 'margin') {
      valA = a.avgMargin;
      valB = b.avgMargin;
    } else if (sortField === 'availability') {
      valA = a.totalAvailability;
      valB = b.totalAvailability;
    } else {
      valA = (a.allocations[0] as any)?.[sortField] ?? 0;
      valB = (b.allocations[0] as any)?.[sortField] ?? 0;
    }

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });
}
