/**
 * Tests for src/lib/utils.ts (cn function) and src/lib/mock-data.ts
 * 
 * Coverage:
 * - cn() utility: class merging, deduplication, conditional classes
 * - mock-data: type correctness, data integrity
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import type { Story, Task, Epic, Sprint, Employee, TestCase, Holiday, Risk, Assumption, Issue, Dependency, KanbanColumn, ProjectSettings, ImpactedSystem, Release, Worklog, WorklogSubmission, LeavePeriod, Project, Horizontal, User, Environment, FixedCost, TestPlan, TestPlanTestCase, PaymentMilestone, CodeRepository, TrashedItem, AccessControlSetting, ProjectStatusHistoryItem } from '@/types';
import { employees, epics, sprints, stories } from '@/lib/mock-data';

describe('cn utility', () => {
  describe('basic merging', () => {
    it('should merge multiple classes', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn(undefined)).toBe('');
      expect(cn(null)).toBe('');
      expect(cn(false)).toBe('');
    });

    it('should merge conflicting Tailwind classes (last wins)', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });

    it('should merge text color classes (last wins)', () => {
      const result = cn('text-red-500', 'text-green-500');
      expect(result).toBe('text-green-500');
    });

    it('should merge padding classes (last wins)', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('should merge margin classes (last wins)', () => {
      const result = cn('m-2', 'm-4');
      expect(result).toBe('m-4');
    });

    it('should merge width classes (last wins)', () => {
      const result = cn('w-full', 'w-1/2');
      expect(result).toBe('w-1/2');
    });
  });

  describe('conditional classes', () => {
    it('should include class when condition is true', () => {
      const result = cn('base', true && 'conditional');
      expect(result).toBe('base conditional');
    });

    it('should exclude class when condition is false', () => {
      const result = cn('base', false && 'conditional');
      expect(result).toBe('base');
    });

    it('should handle ternary expressions', () => {
      const result = cn('base', true ? 'active' : 'inactive');
      expect(result).toBe('base active');
    });

    it('should handle nested conditionals', () => {
      const result = cn('base', true && true && 'double');
      expect(result).toBe('base double');
    });
  });

  describe('object syntax', () => {
    it('should merge classes from object', () => {
      const result = cn('base', { 'obj-class': true, 'skip-class': false });
      expect(result).toContain('base');
      expect(result).toContain('obj-class');
      expect(result).not.toContain('skip-class');
    });

    it('should handle all-false object', () => {
      const result = cn('base', { 'skip': false, 'also-skip': false });
      expect(result).toBe('base');
    });

    it('should handle mixed object and string', () => {
      const result = cn('base', { 'obj': true }, 'string');
      expect(result).toBe('base obj string');
    });
  });

  describe('duplicate handling', () => {
    it('should handle duplicate classes (clsx preserves them, tailwind-merge deduplicates)', () => {
      // clsx preserves duplicates, twMerge deduplicates conflicting Tailwind classes
      // For identical plain classes, clsx keeps them but tailwind-merge may or may not deduplicate
      const result = cn('class1', 'class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should deduplicate across merged classes', () => {
      const result = cn('p-4 p-4', 'p-4');
      expect(result).toBe('p-4');
    });
  });

  describe('complex scenarios', () => {
    it('should handle realistic component classes', () => {
      const result = cn(
        'relative',
        'overflow-hidden',
        'rounded-lg',
        'border',
        true && 'bg-white',
        false && 'bg-gray-100',
        { 'shadow-sm': true },
      );
      expect(result).toContain('relative');
      expect(result).toContain('overflow-hidden');
      expect(result).toContain('rounded-lg');
      expect(result).toContain('border');
      expect(result).toContain('bg-white');
      expect(result).toContain('shadow-sm');
      expect(result).not.toContain('bg-gray-100');
    });

    it('should handle empty object', () => {
      const result = cn('base', {});
      expect(result).toBe('base');
    });
  });
});

describe('mock data - employees', () => {
  it('should have at least 5 employees', () => {
    expect(employees.length).toBeGreaterThanOrEqual(5);
  });

  it('should have valid employee IDs', () => {
    employees.forEach((emp) => {
      expect(emp.id).toBeDefined();
      expect(typeof emp.id).toBe('string');
      expect(emp.id.length).toBeGreaterThan(0);
    });
  });

  it('should have valid empId format', () => {
    employees.forEach((emp) => {
      expect(emp.empId).toBeDefined();
      expect(typeof emp.empId).toBe('string');
    });
  });

  it('should have valid email format', () => {
    employees.forEach((emp) => {
      expect(emp.email).toBeDefined();
      expect(emp.email).toContain('@');
    });
  });

  it('should have valid role values', () => {
    const validRoles = ['Developer', 'Tester', 'Architect', 'BA', 'PM', 'Program Director'];
    employees.forEach((emp) => {
      expect(validRoles).toContain(emp.role);
    });
  });

  it('should have valid billedRate values', () => {
    employees.forEach((emp) => {
      expect(typeof emp.billedRate).toBe('number');
      expect(emp.billedRate).toBeGreaterThan(0);
    });
  });

  it('should have valid experience values', () => {
    employees.forEach((emp) => {
      expect(typeof emp.experience).toBe('number');
      expect(emp.experience).toBeGreaterThanOrEqual(0);
    });
  });

  it('should have valid availability values (0-100)', () => {
    employees.forEach((emp) => {
      expect(typeof emp.availability).toBe('number');
      expect(emp.availability).toBeGreaterThanOrEqual(0);
      expect(emp.availability).toBeLessThanOrEqual(100);
    });
  });

  it('should have valid onboardingDate', () => {
    employees.forEach((emp) => {
      expect(emp.onboardingDate).toBeDefined();
      const date = new Date(emp.onboardingDate!);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  it('should have valid costAmount values', () => {
    employees.forEach((emp) => {
      expect(typeof emp.costAmount).toBe('number');
      expect(emp.costAmount).toBeGreaterThan(0);
    });
  });

  it('should have valid costCurrency', () => {
    employees.forEach((emp) => {
      expect(emp.costCurrency).toBe('USD');
    });
  });
});

describe('mock data - epics', () => {
  it('should have at least 2 epics', () => {
    expect(epics.length).toBeGreaterThanOrEqual(2);
  });

  it('should have valid epic structure', () => {
    epics.forEach((epic) => {
      expect(epic.id).toBeDefined();
      expect(epic.title).toBeDefined();
      expect(typeof epic.title).toBe('string');
      expect(epic.title.length).toBeGreaterThan(0);
    });
  });
});

describe('mock data - sprints', () => {
  it('should have at least 1 sprint', () => {
    expect(sprints.length).toBeGreaterThanOrEqual(1);
  });

  it('should have valid sprint structure', () => {
    sprints.forEach((sprint) => {
      expect(sprint.id).toBeDefined();
      expect(sprint.title).toBeDefined();
      expect(sprint.isCurrent).toBeDefined();
      expect(typeof sprint.isCurrent).toBe('boolean');
    });
  });

  it('should have valid date ranges', () => {
    sprints.forEach((sprint) => {
      if (sprint.startDate && sprint.endDate) {
        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        expect(end.getTime()).toBeGreaterThan(start.getTime());
      }
    });
  });
});

describe('mock data - stories', () => {
  it('should have at least 5 stories', () => {
    expect(stories.length).toBeGreaterThanOrEqual(5);
  });

  it('should have valid story structure', () => {
    stories.forEach((story) => {
      expect(story.id).toBeDefined();
      expect(story.storyId).toBeDefined();
      expect(story.title).toBeDefined();
      expect(story.description).toBeDefined();
      expect(story.itemType).toBeDefined();
      expect(story.status).toBeDefined();
    });
  });

  it('should have valid story IDs', () => {
    const storyIds = stories.map((s) => s.storyId);
    expect(new Set(storyIds).size).toBe(storyIds.length);
  });

  it('should have valid epic references', () => {
    const epicIds = new Set(epics.map((e) => e.id));
    stories.forEach((story) => {
      if (story.epicId) {
        expect(epicIds.has(story.epicId)).toBe(true);
      }
    });
  });

  it('should have valid sprint references', () => {
    const sprintIds = new Set(sprints.map((s) => s.id));
    stories.forEach((story) => {
      if (story.sprintId) {
        expect(sprintIds.has(story.sprintId)).toBe(true);
      }
    });
  });

  it('should have valid assignee references', () => {
    const empIds = new Set(employees.map((e) => e.id));
    stories.forEach((story) => {
      if (story.assigneeId) {
        expect(empIds.has(story.assigneeId)).toBe(true);
      }
    });
  });
});
