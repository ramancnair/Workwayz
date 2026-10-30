import { describe, it, expect } from 'vitest';
import {
  isEmployeeAllocatedToProject,
  filterAllocatedProjects,
  getWorkItemOptionsForProject,
  type ProjectCandidate,
  type ResourceMember,
} from '../worklog-utils';
import type { Story } from '@/types';

describe('Worklog Utils - Project Allocation & Option Filtering', () => {
  const sampleProjects: ProjectCandidate[] = [
    {
      id: 'proj-1',
      name: 'AI-Powered Customer Assistance Hub (Batch 26-2)',
      status: 'Active',
      projectManagerId: 'e1001',
    },
    {
      id: 'proj-2',
      name: 'Microservices Architecture Migration (Batch 26-1)',
      status: 'Active',
      projectManagerId: 'pm-alice@workwayz.com',
    },
    {
      id: 'proj-3',
      name: 'Multi-Region Zero Downtime Database (Batch 26-5)',
      status: 'Active',
    },
    {
      id: 'proj-4',
      name: 'Archived Project',
      status: 'Active',
      isArchived: true,
      projectManagerId: 'e949',
    },
    {
      id: 'proj-5',
      name: 'Completed Project',
      status: 'Completed',
      projectManagerId: 'e949',
    },
  ];

  const sampleResources: Record<string, ResourceMember[]> = {
    'proj-1': [{ empId: 'e1002', email: 'dev1@workwayz.com' }],
    'proj-2': [{ empId: 'e1003', email: 'dev2@workwayz.com' }],
    'proj-3': [{ empId: 'e1004', email: 'dev3@workwayz.com' }],
  };

  describe('isEmployeeAllocatedToProject', () => {
    it('returns true if employee is Project Manager by empId', () => {
      const allocated = isEmployeeAllocatedToProject(
        sampleProjects[0],
        'E1001',
        'e1001@workwayz.com',
        []
      );
      expect(allocated).toBe(true);
    });

    it('returns true if employee is Project Manager by email', () => {
      const allocated = isEmployeeAllocatedToProject(
        sampleProjects[1],
        'E9999',
        'pm-alice@workwayz.com',
        []
      );
      expect(allocated).toBe(true);
    });

    it('returns true if employee is in resource roster by empId', () => {
      const allocated = isEmployeeAllocatedToProject(
        sampleProjects[0],
        'e1002',
        'different@workwayz.com',
        sampleResources['proj-1']
      );
      expect(allocated).toBe(true);
    });

    it('returns true if employee is in resource roster by email', () => {
      const allocated = isEmployeeAllocatedToProject(
        sampleProjects[2],
        'E9999',
        'dev3@workwayz.com',
        sampleResources['proj-3']
      );
      expect(allocated).toBe(true);
    });

    it('returns false if employee is unallocated to the project (e.g. Raman Nair E949)', () => {
      const allocated = isEmployeeAllocatedToProject(
        sampleProjects[0],
        'E949',
        'ramancnair6282@gmail.com',
        sampleResources['proj-1']
      );
      expect(allocated).toBe(false);
    });
  });

  describe('filterAllocatedProjects', () => {
    it('returns empty array when user is not allocated to any active project (e.g. Raman Nair E949)', () => {
      const result = filterAllocatedProjects(
        sampleProjects,
        'E949',
        'ramancnair6282@gmail.com',
        sampleResources
      );
      // E949 is PM only on an archived project and a completed project, none active!
      expect(result).toEqual([]);
    });

    it('returns only the projects the employee is allocated to', () => {
      const result = filterAllocatedProjects(
        sampleProjects,
        'E1002',
        'dev1@workwayz.com',
        sampleResources
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('proj-1');
      expect(result[0].name).toBe('AI-Powered Customer Assistance Hub (Batch 26-2)');
    });

    it('excludes archived and completed projects even if user is PM', () => {
      const result = filterAllocatedProjects(
        sampleProjects,
        'E949',
        '',
        {}
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('getWorkItemOptionsForProject', () => {
    it('returns general work options including "Other" when project is "other"', () => {
      const options = getWorkItemOptionsForProject('other');
      const optionValues = options.map((o) => o.value);
      expect(optionValues).toContain('other');
      expect(optionValues).toContain('meeting');
      expect(optionValues).toContain('training');
      expect(optionValues).toContain('admin');
      expect(optionValues).toContain('bench');
      expect(optionValues).toContain('holiday');
      expect(optionValues).toContain('weekend');
    });

    it('returns project story options along with general options for a specific project', () => {
      const stories: Story[] = [
        {
          id: 'story-1',
          storyId: 'ST-101',
          title: 'Implement OAuth Login',
          itemType: 'Story',
          status: 'Done',
          epicId: null,
          sprintId: null,
        } as any,
      ];
      const options = getWorkItemOptionsForProject('proj-1', stories);
      const labels = options.map((o) => o.label);
      expect(labels).toContain('[ST-101] Implement OAuth Login');
      expect(labels).toContain('Meeting');
      expect(labels).toContain('Other');
    });
  });
});
