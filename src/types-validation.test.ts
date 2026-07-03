/**
 * Tests for type definitions in src/types/index.ts
 * 
 * Coverage:
 * - All exported type shapes
 * - Discriminated union correctness
 * - Status enum values
 * - Required vs optional fields
 */

import { describe, it, expect } from 'vitest';
import type {
  TaskStatus,
  Task,
  Epic,
  StoryStatus,
  WorkItemType,
  Priority,
  BugSeverity,
  StatusHistoryItem,
  Story,
  SprintStatus,
  Sprint,
  TestCaseStatus,
  TestCaseType,
  TestPlan,
  TestPlanTestCase,
  TestCase,
  UserRole,
  AccessLevel,
  LeavePeriod,
  User,
  Employee,
  RiskSeverity,
  RiskProbability,
  Risk,
  AssumptionStatus,
  AssumptionCategory,
  Assumption,
  IssueStatus,
  IssuePriority,
  Issue,
  DependencyStatus,
  DependencyType,
  Dependency,
  KanbanColumn,
  HolidayType,
  Holiday,
  ProjectSettings,
  ImpactedSystemCategory,
  ImpactedSystem,
  ReleaseItemType,
  Release,
  WorklogItem,
  Worklog,
  WorklogSubmission,
  Portfolio,
  PricingModel,
  ProjectStatus,
  RagStatus,
  ProjectStatusHistoryItem,
  Project,
  AccessControlSetting,
  TrashedItem,
  Horizontal,
  Environment,
  ProjectDocument,
  PaymentMilestoneStatus,
  PaymentMilestone,
  CodeRepository,
  BugCriticality,
  FixedCost,
  ArchiveSettings,
} from '@/types';

describe('Type definitions', () => {
  describe('TaskStatus', () => {
    const validStatuses: TaskStatus[] = ['To Do', 'In Development', 'In QA', 'Complete'];
    
    it('should have exactly 4 valid statuses', () => {
      expect(validStatuses.length).toBe(4);
    });

    it('should contain all expected statuses', () => {
      expect(validStatuses).toContain('To Do');
      expect(validStatuses).toContain('In Development');
      expect(validStatuses).toContain('In QA');
      expect(validStatuses).toContain('Complete');
    });
  });

  describe('Task', () => {
    it('should have all required fields', () => {
      const task: Task = {
        id: 'task1',
        title: 'Test task',
        description: 'A test task',
        status: 'To Do',
        assigneeId: 'dev1',
        storyId: 'story1',
        plannedStartDate: new Date(),
        plannedEndDate: new Date(),
      };
      expect(task.id).toBe('task1');
      expect(task.status).toBe('To Do');
    });

    it('should allow optional actual dates', () => {
      const task: Task = {
        id: 'task1',
        title: 'Test task',
        description: 'A test task',
        status: 'Complete',
        assigneeId: 'dev1',
        storyId: 'story1',
        plannedStartDate: new Date(),
        plannedEndDate: new Date(),
        actualStartDate: new Date(),
        actualEndDate: new Date(),
      };
      expect(task.actualStartDate).toBeDefined();
      expect(task.actualEndDate).toBeDefined();
    });
  });

  describe('Epic', () => {
    it('should have required fields', () => {
      const epic: Epic = {
        id: 'epic1',
        title: 'Test Epic',
      };
      expect(epic.id).toBe('epic1');
      expect(epic.title).toBe('Test Epic');
    });

    it('should allow optional description', () => {
      const epic: Epic = {
        id: 'epic1',
        title: 'Test Epic',
        description: 'A description',
      };
      expect(epic.description).toBe('A description');
    });
  });

  describe('WorkItemType', () => {
    const validTypes: WorkItemType[] = [
      'Requirement/Story',
      'Bug',
      'Task',
      'Feature Change',
      'Sub Task',
    ];

    it('should have exactly 5 valid types', () => {
      expect(validTypes.length).toBe(5);
    });
  });

  describe('Priority', () => {
    const validPriorities: Priority[] = ['Critical', 'High', 'Medium', 'Low', 'Backburner'];
    
    it('should have exactly 5 valid priorities', () => {
      expect(validPriorities.length).toBe(5);
    });

    it('should contain all expected priorities', () => {
      expect(validPriorities).toContain('Critical');
      expect(validPriorities).toContain('High');
      expect(validPriorities).toContain('Medium');
      expect(validPriorities).toContain('Low');
      expect(validPriorities).toContain('Backburner');
    });
  });

  describe('BugSeverity', () => {
    const validSeverities: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
    
    it('should have exactly 4 valid severities', () => {
      expect(validSeverities.length).toBe(4);
    });
  });

  describe('StatusHistoryItem', () => {
    it('should allow null fromStatus', () => {
      const item: StatusHistoryItem = {
        fromStatus: null,
        toStatus: 'To Do',
        date: new Date().toISOString(),
      };
      expect(item.fromStatus).toBeNull();
    });

    it('should allow non-null fromStatus', () => {
      const item: StatusHistoryItem = {
        fromStatus: 'In Progress',
        toStatus: 'Done',
        date: new Date().toISOString(),
      };
      expect(item.fromStatus).toBe('In Progress');
    });
  });

  describe('Story', () => {
    it('should have all required fields', () => {
      const story: Story = {
        id: 'story1',
        storyId: 'ST-1',
        title: 'Test Story',
        description: 'A test story',
        itemType: 'Requirement/Story',
        status: 'To Do',
      };
      expect(story.id).toBe('story1');
      expect(story.storyId).toBe('ST-1');
      expect(story.title).toBe('Test Story');
    });

    it('should allow optional fields', () => {
      const story: Story = {
        id: 'story1',
        storyId: 'ST-1',
        title: 'Test Story',
        description: 'A test story',
        itemType: 'Requirement/Story',
        status: 'To Do',
        sortOrder: 1,
        acceptanceCriteria: 'Test criteria',
        reporterId: 'dev1',
        assigneeId: 'dev1',
        epicId: 'epic1',
        sprintId: 'sprint1',
        estimatedHours: 8,
        priority: 'High',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        closedAt: new Date().toISOString(),
        effortDays: 1,
        releaseId: 'rel1',
        isDeleted: false,
        deletedAt: new Date().toISOString(),
        parentStoryId: 'story0',
        relatedTestCaseId: 'tc1',
        foundInTestPlanId: 'tp1',
        relatedBugId: 'bug1',
        developmentStartDate: new Date().toISOString(),
        completionDate: new Date().toISOString(),
      };
      expect(story.sortOrder).toBe(1);
      expect(story.acceptanceCriteria).toBe('Test criteria');
      expect(story.estimatedHours).toBe(8);
      expect(story.priority).toBe('High');
    });

    it('should allow undefined optional fields', () => {
      const story: Story = {
        id: 'story1',
        storyId: 'ST-1',
        title: 'Test Story',
        description: 'A test story',
        itemType: 'Requirement/Story',
        status: 'To Do',
      };
      expect(story.epicId).toBeUndefined();
      expect(story.sprintId).toBeUndefined();
      expect(story.estimatedHours).toBeUndefined();
      expect(story.priority).toBeUndefined();
      expect(story.statusHistory).toBeUndefined();
    });

    it('should support statusHistory array', () => {
      const story: Story = {
        id: 'story1',
        storyId: 'ST-1',
        title: 'Test Story',
        description: 'A test story',
        itemType: 'Requirement/Story',
        status: 'To Do',
        statusHistory: [
          { fromStatus: null, toStatus: 'To Do', date: new Date().toISOString() },
          { fromStatus: 'To Do', toStatus: 'In Progress', date: new Date().toISOString() },
        ],
      };
      expect(story.statusHistory).toHaveLength(2);
    });

    it('should support impactedSystemIds array', () => {
      const story: Story = {
        id: 'story1',
        storyId: 'ST-1',
        title: 'Test Story',
        description: 'A test story',
        itemType: 'Requirement/Story',
        status: 'To Do',
        impactedSystemIds: ['sys1', 'sys2'],
      };
      expect(story.impactedSystemIds).toEqual(['sys1', 'sys2']);
    });

    it('should support severity for Bug type', () => {
      const story: Story = {
        id: 'story1',
        storyId: 'ST-1',
        title: 'Test Bug',
        description: 'A test bug',
        itemType: 'Bug',
        status: 'To Do',
        severity: 'Critical',
      };
      expect(story.severity).toBe('Critical');
    });
  });

  describe('Sprint', () => {
    it('should have required fields', () => {
      const sprint: Sprint = {
        id: 'sprint1',
        title: 'Sprint 1',
        isCurrent: true,
      };
      expect(sprint.id).toBe('sprint1');
      expect(sprint.title).toBe('Sprint 1');
      expect(sprint.isCurrent).toBe(true);
    });

    it('should allow status instead of isCurrent', () => {
      const sprint: Sprint = {
        id: 'sprint1',
        title: 'Sprint 1',
        status: 'Current',
      };
      expect(sprint.status).toBe('Current');
      expect(sprint.isCurrent).toBeUndefined();
    });

    it('should have valid SprintStatus values', () => {
      const validStatuses: SprintStatus[] = ['Yet to Start', 'Current', 'Completed', 'Cancelled'];
      expect(validStatuses.length).toBe(4);
    });
  });

  describe('TestCase', () => {
    it('should have valid TestCaseType values', () => {
      const validTypes: TestCaseType[] = ['Functional', 'Non-functional'];
      expect(validTypes.length).toBe(2);
    });

    it('should have valid TestCaseStatus values', () => {
      const validStatuses: TestCaseStatus[] = ['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'];
      expect(validStatuses.length).toBe(5);
    });
  });

  describe('TestPlan', () => {
    it('should have valid planType values', () => {
      const validTypes: TestPlan['planType'][] = ['Sprint', 'Release'];
      expect(validTypes.length).toBe(2);
    });
  });

  describe('TestPlanTestCase', () => {
    it('should have valid status values', () => {
      const validStatuses: TestPlanTestCase['status'][] = ['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'];
      expect(validStatuses.length).toBe(5);
    });
  });

  describe('UserRole', () => {
    const validRoles: UserRole[] = ['Developer', 'Tester', 'Architect', 'BA', 'PM', 'Program Director'];
    
    it('should have exactly 6 valid roles', () => {
      expect(validRoles.length).toBe(6);
    });
  });

  describe('AccessLevel', () => {
    const validLevels: AccessLevel[] = [
      'Administrator',
      'Senior Management',
      'Project Manager',
      'Lead',
      'Team Member',
      'PMO',
    ];
    
    it('should have exactly 6 valid levels', () => {
      expect(validLevels.length).toBe(6);
    });
  });

  describe('User', () => {
    it('should have all required fields', () => {
      const user: User = {
        id: 'user1',
        empId: 'E001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0100',
      };
      expect(user.id).toBe('user1');
      expect(user.empId).toBe('E001');
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.phone).toBe('555-0100');
    });

    it('should allow optional fields', () => {
      const user: User = {
        id: 'user1',
        empId: 'E001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0100',
        avatar: 'https://example.com/avatar.png',
        clientEmpId: 'C001',
        clientEmail: 'client@example.com',
        role: 'Developer',
        experience: 5,
        onboardingDate: new Date().toISOString(),
        offloadingDate: new Date().toISOString(),
        employmentStartDate: new Date().toISOString(),
        employmentEndDate: new Date().toISOString(),
        accessLevel: 'Team Member',
        billedRate: 100,
        costRate: 80,
        costAmount: 100000,
        costCurrency: 'USD',
        availability: 100,
        isDeleted: false,
        deletedAt: new Date().toISOString(),
        isEnabled: true,
        capabilities: ['react', 'typescript'],
        isBcpSupport: false,
      };
      expect(user.avatar).toBe('https://example.com/avatar.png');
      expect(user.role).toBe('Developer');
      expect(user.billedRate).toBe(100);
      expect(user.capabilities).toContain('react');
    });
  });

  describe('Risk', () => {
    it('should have valid RiskSeverity values', () => {
      const validSeverities: RiskSeverity[] = [1, 2, 3];
      expect(validSeverities).toContain(1);
      expect(validSeverities).toContain(2);
      expect(validSeverities).toContain(3);
    });

    it('should have valid RiskProbability values', () => {
      const validProbabilities: RiskProbability[] = [1, 2, 3];
      expect(validProbabilities).toContain(1);
      expect(validProbabilities).toContain(2);
      expect(validProbabilities).toContain(3);
    });

    it('should have all required fields', () => {
      const risk: Risk = {
        id: 'risk1',
        riskId: 'R-1',
        description: 'Test risk',
        severity: 2,
        probability: 1,
        mitigationPlan: 'Monitor',
        residualRisk: 'Low',
        contingencyPlan: 'Escalate',
      };
      expect(risk.id).toBe('risk1');
      expect(risk.severity).toBe(2);
      expect(risk.probability).toBe(1);
    });
  });

  describe('Assumption', () => {
    it('should have valid AssumptionStatus values', () => {
      const validStatuses: AssumptionStatus[] = ['Active', 'Validated', 'Invalidated'];
      expect(validStatuses.length).toBe(3);
    });

    it('should have valid AssumptionCategory values', () => {
      const validCategories: AssumptionCategory[] = ['Technical', 'Resource', 'Business', 'External'];
      expect(validCategories.length).toBe(4);
    });
  });

  describe('Issue', () => {
    it('should have valid IssueStatus values', () => {
      const validStatuses: IssueStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];
      expect(validStatuses.length).toBe(4);
    });

    it('should have valid IssuePriority values', () => {
      const validPriorities: IssuePriority[] = ['Low', 'Medium', 'High', 'Critical'];
      expect(validPriorities.length).toBe(4);
    });
  });

  describe('Dependency', () => {
    it('should have valid DependencyStatus values', () => {
      const validStatuses: DependencyStatus[] = ['On Track', 'At Risk', 'Blocked'];
      expect(validStatuses.length).toBe(3);
    });

    it('should have valid DependencyType values', () => {
      const validTypes: DependencyType[] = ['Internal', 'External'];
      expect(validTypes.length).toBe(2);
    });
  });

  describe('KanbanColumn', () => {
    it('should have all required fields', () => {
      const column: KanbanColumn = {
        id: 'col1',
        name: 'To Do',
        order: 0,
        isDefault: true,
        isDoneColumn: false,
      };
      expect(column.id).toBe('col1');
      expect(column.name).toBe('To Do');
      expect(column.order).toBe(0);
      expect(column.isDefault).toBe(true);
      expect(column.isDoneColumn).toBe(false);
    });
  });

  describe('Holiday', () => {
    it('should have valid HolidayType values', () => {
      const validTypes: HolidayType[] = ['National', 'Regional', 'Optional'];
      expect(validTypes.length).toBe(3);
    });

    it('should have all required fields', () => {
      const holiday: Holiday = {
        id: 'hol1',
        date: new Date().toISOString(),
        description: 'New Year',
      };
      expect(holiday.id).toBe('hol1');
      expect(typeof holiday.date).toBe('string');
      expect(holiday.description).toBe('New Year');
    });
  });

  describe('ProjectSettings', () => {
    it('should have id as "main"', () => {
      const settings: ProjectSettings = {
        id: 'main',
      };
      expect(settings.id).toBe('main');
    });

    it('should allow optional settings', () => {
      const settings: ProjectSettings = {
        id: 'main',
        weeklyOffDays: [0, 6],
        sprintDurationInWeeks: 2,
        sprintStartDay: 1,
        overrideGlobalHolidays: false,
        manMonthToDays: 22,
        manDayToHours: 8,
        storyPointToHours: 8,
        allocatedPaidLeavesPerYear: 24,
        allowCarryOver: true,
        carryOverLimit: 5,
      };
      expect(settings.weeklyOffDays).toEqual([0, 6]);
      expect(settings.sprintDurationInWeeks).toBe(2);
      expect(settings.manMonthToDays).toBe(22);
    });
  });

  describe('ImpactedSystem', () => {
    it('should have valid category values', () => {
      const validCategories: ImpactedSystemCategory[] = ['Technology', 'Function'];
      expect(validCategories.length).toBe(2);
    });

    it('should have all required fields', () => {
      const system: ImpactedSystem = {
        id: 'sys1',
        name: 'Front End',
        description: 'UI layer',
        category: 'Technology',
      };
      expect(system.id).toBe('sys1');
      expect(system.name).toBe('Front End');
      expect(system.category).toBe('Technology');
    });
  });

  describe('Release', () => {
    it('should have valid ReleaseItemType values', () => {
      const validTypes: ReleaseItemType[] = ['Release', 'Stage', 'Milestone'];
      expect(validTypes.length).toBe(3);
    });

    it('should have all required fields', () => {
      const release: Release = {
        id: 'rel1',
        releaseId: 'REL-1',
        name: 'Release 1',
        description: 'First release',
        itemType: 'Release',
      };
      expect(release.id).toBe('rel1');
      expect(release.itemType).toBe('Release');
    });
  });

  describe('Worklog', () => {
    it('should have all required fields', () => {
      const worklog: Worklog = {
        id: 'emp1-2024-07-25',
        employeeId: 'emp1',
        date: new Date().toISOString(),
        items: [],
        totalHours: 0,
      };
      expect(worklog.id).toBe('emp1-2024-07-25');
      expect(worklog.employeeId).toBe('emp1');
      expect(worklog.totalHours).toBe(0);
    });
  });

  describe('WorklogSubmission', () => {
    it('should have all required fields', () => {
      const submission: WorklogSubmission = {
        id: 'emp1-2024-07-21',
        employeeId: 'emp1',
        weekStartDate: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      };
      expect(submission.id).toBe('emp1-2024-07-21');
      expect(typeof submission.submittedAt).toBe('string');
    });
  });

  describe('Portfolio', () => {
    it('should have all required fields', () => {
      const portfolio: Portfolio = {
        id: 'port1',
        name: 'Test Portfolio',
      };
      expect(portfolio.id).toBe('port1');
      expect(portfolio.name).toBe('Test Portfolio');
    });
  });

  describe('PricingModel', () => {
    const validModels: PricingModel[] = ['Fixed Bid', 'T&M'];
    it('should have exactly 2 valid models', () => {
      expect(validModels.length).toBe(2);
    });
  });

  describe('ProjectStatus', () => {
    const validStatuses: ProjectStatus[] = [
      'Not Started', 'Active', 'On Hold', 'Completed', 'Cancelled', 'Initial Estimation',
    ];
    it('should have exactly 6 valid statuses', () => {
      expect(validStatuses.length).toBe(6);
    });
  });

  describe('RagStatus', () => {
    const validStatuses: RagStatus[] = ['Red', 'Amber', 'Green'];
    it('should have exactly 3 valid statuses', () => {
      expect(validStatuses.length).toBe(3);
    });
  });

  describe('Project', () => {
    it('should have all required fields', () => {
      const project: Project = {
        id: 'proj1',
        name: 'Test Project',
        portfolioId: 'port1',
      };
      expect(project.id).toBe('proj1');
      expect(project.name).toBe('Test Project');
      expect(project.portfolioId).toBe('port1');
    });

    it('should allow optional fields', () => {
      const project: Project = {
        id: 'proj1',
        name: 'Test Project',
        portfolioId: 'port1',
        summary: 'A test project',
        projectManagerId: 'pm1',
        pricingModel: 'Fixed Bid',
        status: 'Active',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        overallStatus: 'Green',
        scopeStatus: 'Green',
        costStatus: 'Green',
        timeStatus: 'Green',
        isArchived: false,
        projectValue: 100000,
        isProjectValueOverridden: false,
        monthlyBilledValue: 10000,
      };
      expect(project.summary).toBe('A test project');
      expect(project.status).toBe('Active');
      expect(project.overallStatus).toBe('Green');
      expect(project.pricingModel).toBe('Fixed Bid');
    });

    it('should support statusHistory', () => {
      const project: Project = {
        id: 'proj1',
        name: 'Test Project',
        portfolioId: 'port1',
        statusHistory: [
          {
            date: new Date().toISOString(),
            overallStatus: 'Green',
            scopeStatus: 'Green',
            costStatus: 'Green',
            timeStatus: 'Green',
            statusComments: 'All good',
          },
        ],
      };
      expect(project.statusHistory).toHaveLength(1);
    });

    it('should support pmoApproval', () => {
      const project: Project = {
        id: 'proj1',
        name: 'Test Project',
        portfolioId: 'port1',
        pmoApproval: {
          permitToBuild: {
            approved: true,
            approvedBy: 'pmo1',
            approvedAt: new Date().toISOString(),
          },
          permitToDeploy: {
            approved: false,
          },
        },
      };
      expect(project.pmoApproval?.permitToBuild?.approved).toBe(true);
      expect(project.pmoApproval?.permitToDeploy?.approved).toBe(false);
    });
  });

  describe('TrashedItem', () => {
    it('should have valid type values', () => {
      const validTypes: TrashedItem['type'][] = ['Portfolio', 'Project', 'User'];
      expect(validTypes.length).toBe(3);
    });
  });

  describe('Horizontal', () => {
    it('should have all required fields', () => {
      const horizontal: Horizontal = {
        id: 'h1',
        name: 'Quality Analysis',
        weightage: 15,
        isEnabled: true,
      };
      expect(horizontal.name).toBe('Quality Analysis');
      expect(horizontal.weightage).toBe(15);
      expect(horizontal.isEnabled).toBe(true);
    });
  });

  describe('Environment', () => {
    it('should have all required fields', () => {
      const env: Environment = {
        id: 'env1',
        name: 'Production',
        order: 1,
      };
      expect(env.name).toBe('Production');
      expect(env.order).toBe(1);
    });
  });

  describe('ProjectDocument', () => {
    it('should have all required fields', () => {
      const doc: ProjectDocument = {
        id: 'doc1',
        name: 'Requirements.pdf',
        location: 'gs://bucket/docs/req.pdf',
        createdAt: new Date().toISOString(),
      };
      expect(doc.name).toBe('Requirements.pdf');
      expect(typeof doc.location).toBe('string');
    });
  });

  describe('PaymentMilestone', () => {
    it('should have valid PaymentMilestoneStatus values', () => {
      const validStatuses: PaymentMilestoneStatus[] = [
        'TBD', 'In Progress', 'Milestone completed', 'Invoice raised', 'Payment Completed',
      ];
      expect(validStatuses.length).toBe(5);
    });

    it('should have all required fields', () => {
      const milestone: PaymentMilestone = {
        id: 'ms1',
        milestoneId: 'MS-1',
        name: 'Phase 1 Payment',
        billingPercentage: 30,
        amount: 30000,
        status: 'TBD',
      };
      expect(milestone.name).toBe('Phase 1 Payment');
      expect(milestone.billingPercentage).toBe(30);
      expect(milestone.amount).toBe(30000);
    });
  });

  describe('CodeRepository', () => {
    it('should have all required fields', () => {
      const repo: CodeRepository = {
        id: 'repo1',
        name: 'Main Repo',
        url: 'https://github.com/example/repo',
      };
      expect(repo.name).toBe('Main Repo');
      expect(typeof repo.url).toBe('string');
    });
  });

  describe('FixedCost', () => {
    it('should have valid type values', () => {
      const validTypes: FixedCost['type'][] = ['One time', 'Monthly'];
      expect(validTypes.length).toBe(2);
    });

    it('should have all required fields', () => {
      const cost: FixedCost = {
        id: 'fc1',
        name: 'Server Hosting',
        cost: 5000,
      };
      expect(cost.name).toBe('Server Hosting');
      expect(cost.cost).toBe(5000);
    });
  });

  describe('ArchiveSettings', () => {
    it('should have all required fields', () => {
      const settings: ArchiveSettings = {
        autoArchiveCompletedProjects: true,
        autoArchiveAfterMonths: '6',
        autoDeleteArchivedProjects: false,
        autoDeleteAfterMonths: '12',
      };
      expect(settings.autoArchiveCompletedProjects).toBe(true);
      expect(settings.autoArchiveAfterMonths).toBe('6');
    });
  });

  describe('LeavePeriod', () => {
    it('should have all required fields', () => {
      const leave: LeavePeriod = {
        id: 'leave1',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      };
      expect(typeof leave.startDate).toBe('string');
      expect(typeof leave.endDate).toBe('string');
    });

    it('should allow optional type', () => {
      const leave: LeavePeriod = {
        id: 'leave1',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        type: 'Paid Leave',
      };
      expect(leave.type).toBe('Paid Leave');
    });
  });

  describe('BugCriticality', () => {
    const validCriticalities: BugCriticality[] = ['Low', 'Medium', 'High', 'Critical'];
    it('should have exactly 4 valid criticalities', () => {
      expect(validCriticalities.length).toBe(4);
    });
  });
});
