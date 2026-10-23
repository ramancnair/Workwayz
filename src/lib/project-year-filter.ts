import type { Project } from '@/types';

export interface ProjectYearRange {
  startYear?: number;
  endYear?: number;
}

/**
 * Extracts the start and end years for a project.
 * Uses startDate/endDate (ISO strings), with fallbacks to:
 * - project code or name (e.g. 'Batch 26-1' or 'P2600001' -> 2026)
 * - createdAt timestamp
 */
export function getProjectYearRange(project: Project): ProjectYearRange {
  let startYear: number | undefined;
  let endYear: number | undefined;

  if (project.startDate) {
    const sDate = new Date(project.startDate);
    if (!isNaN(sDate.getTime())) {
      startYear = sDate.getFullYear();
    }
  }

  if (project.endDate) {
    const eDate = new Date(project.endDate);
    if (!isNaN(eDate.getTime())) {
      endYear = eDate.getFullYear();
    }
  }

  // Fallbacks: check project name or code (e.g. 'Batch 26-1', 'Batch 25-2', 'P2600001')
  if (!startYear && !endYear) {
    const match =
      (project.name || '').match(/Batch\s*(\d{2})/i) ||
      (project.id || '').match(/^P(\d{2})/i);
    if (match) {
      const yr = 2000 + parseInt(match[1], 10);
      startYear = yr;
      endYear = yr;
    }
  }

  // Check createdAt if available
  if (!startYear && (project as any).createdAt) {
    const cDate = new Date((project as any).createdAt);
    if (!isNaN(cDate.getTime())) {
      startYear = cDate.getFullYear();
      endYear = cDate.getFullYear();
    }
  }

  return { startYear, endYear };
}

/**
 * Checks whether a project is active or overlapping with a selected year.
 * If selectedYear is 'all', always returns true.
 * If a project has no dates or year metadata, it matches the current year by default.
 */
export function isProjectInYear(project: Project, selectedYear: string): boolean {
  if (!selectedYear || selectedYear === 'all') return true;

  const targetYear = parseInt(selectedYear, 10);
  if (isNaN(targetYear)) return true;

  const { startYear, endYear } = getProjectYearRange(project);

  if (startYear !== undefined && endYear !== undefined) {
    return targetYear >= startYear && targetYear <= endYear;
  }
  if (startYear !== undefined) {
    return targetYear >= startYear;
  }
  if (endYear !== undefined) {
    return targetYear <= endYear;
  }

  // Project with no discernible year metadata is treated as current year
  const currentYear = new Date().getFullYear();
  return targetYear === currentYear;
}

/**
 * Calculates all available distinct years from a list of projects.
 * Always includes the current year.
 * Returns sorted descending (e.g. [2027, 2026, 2025, 2024]).
 */
export function getAvailableProjectYears(projects: Project[]): number[] {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  years.add(currentYear);

  projects.forEach((p) => {
    const { startYear, endYear } = getProjectYearRange(p);
    if (startYear) years.add(startYear);
    if (endYear) years.add(endYear);
  });

  return Array.from(years).sort((a, b) => b - a);
}
