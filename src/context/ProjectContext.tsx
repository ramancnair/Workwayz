'use client';

import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase, Risk, Assumption, Issue, Dependency, KanbanColumn, Holiday, ProjectSettings, ImpactedSystem, Release, Worklog, WorklogItem, WorklogSubmission, LeavePeriod, Project, Horizontal, User, Environment, WorkItemType, BugSeverity, RiskSeverity, RiskProbability, AssumptionCategory, AssumptionStatus, IssuePriority, IssueStatus, DependencyStatus, DependencyType, ProjectDocument, PaymentMilestone, CodeRepository, StatusHistoryItem, SprintStatus, FixedCost, TestPlan, TestPlanTestCase } from '@/types';
import { FirebaseProjectProvider } from './FirebaseProjectProvider';
import { PostgresProjectProvider } from './PostgresProjectProvider';

export interface ProjectContextType {
  project: Project | null;
  epics: Epic[];
  stories: Story[];
  sprints: Sprint[];
  employees: Employee[];
  allUsers: User[];
  testCases: TestCase[];
  risks: Risk[];
  assumptions: Assumption[];
  issues: Issue[];
  dependencies: Dependency[];
  documents: ProjectDocument[];
  paymentMilestones: PaymentMilestone[];
  kanbanColumns: KanbanColumn[];
  holidays: Holiday[];
  releasesAndMilestones: Release[];
  worklogs: Worklog[];
  worklogSubmissions: WorklogSubmission[];
  projectSettings: ProjectSettings | null;
  weeklyOffDays: number[];
  impactedSystems: ImpactedSystem[];
  horizontals: Horizontal[];
  initialImpactedSystems: ImpactedSystem[];
  initialHorizontals: Horizontal[];
  fixedCosts: FixedCost[];
  environments: Environment[];
  codeRepositories: CodeRepository[];
  testPlans: TestPlan[];
  testPlanTestCases: Record<string, TestPlanTestCase[]>;
  testDate: Date | null;
  setTestDate: (date: Date | null) => void;
  
  // Project actions
  updateProject: (data: Partial<Omit<Project, 'id'>>) => Promise<boolean>;

  // Story actions
  addStory: (story: Omit<Story, 'id' | 'storyId'>) => Promise<boolean>;
  updateStory: (storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>) => Promise<boolean>;
  deleteStory: (storyId: string) => Promise<boolean>;
  autoGenerateStories: (count: number) => Promise<boolean>;
  bulkUpdateStorySprints: (sprintId: string | null, storyIds: string[]) => Promise<boolean>;
  bulkUpdateStoryEpics: (epicId: string | null, storyIds: string[]) => Promise<boolean>;
  bulkUpdateStoryReleases: (releaseId: string | null, storyIds: string[]) => Promise<boolean>;
  bulkUpdateSubTaskAssignees: (assigneeId: string | null) => Promise<boolean>;
  bulkUpdateSubTaskSprints: (sprintId: string) => Promise<boolean>;
  bulkUpdateSubTaskEpics: (epicId: string) => Promise<boolean>;
  bulkUpdateSubTaskReleases: (releaseId: string) => Promise<boolean>;
  bulkDeleteStories: (storyIds: string[]) => Promise<boolean>;
  bulkMoveStories: (storyIds: string[], targetEpicId?: string | null, targetReleaseId?: string | null) => Promise<boolean>;
  bulkAssignSubTasks: (taskIds: string[], assigneeId: string | null) => Promise<boolean>;

  // Epic actions
  addEpic: (epic: Omit<Epic, 'id'>) => Promise<boolean>;
  updateEpic: (epicId: string, data: Partial<Omit<Epic, 'id'>>) => Promise<boolean>;
  deleteEpic: (epicId: string, deleteItems?: boolean) => Promise<boolean>;

  // Sprint actions
  addSprint: (sprint: { sprintId?: string, title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }) => Promise<boolean>;
  updateSprint: (sprintId: string, data: { sprintId?: string, title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }) => Promise<boolean>;
  deleteSprint: (sprintId: string) => Promise<boolean>;

  // Employee actions
  addUserToProject: (employee: Employee) => Promise<boolean>;
  updateProjectUser: (employeeId: string, data: Partial<Omit<Employee, 'id' | 'empId' | 'firstName' | 'lastName' | 'email' | 'phone'>>) => Promise<boolean>;
  deleteEmployee: (employeeId: string) => Promise<boolean>;
  addLeavePeriod: (employeeId: string, leavePeriod: Omit<LeavePeriod, 'id'>) => Promise<boolean>;
  deleteLeavePeriod: (employeeId: string, leavePeriodId: string) => Promise<boolean>;

  // TestCase actions
  addTestCase: (testCase: Omit<TestCase, 'id' | 'testCaseId'>) => Promise<boolean>;
  updateTestCase: (testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>) => Promise<boolean>;
  autoGenerateTestCases: (counts: Record<string, number>) => Promise<boolean>;
  deleteTestCase: (testCaseId: string) => Promise<boolean>;
  addTestPlan: (plan: Omit<TestPlan, 'id' | 'testPlanId'>) => Promise<boolean>;
  updateTestPlan: (id: string, data: Partial<Omit<TestPlan, 'id' | 'testPlanId'>>) => Promise<boolean>;
  deleteTestPlan: (id: string, deleteTestCases?: boolean) => Promise<boolean>;
  // Test Plan Test Case actions (copies)
  addTestCasesToPlan: (planId: string, testCaseIds: string[], executionDate?: string) => Promise<boolean>;
  updateTestPlanTestCase: (planId: string, tcId: string, data: Partial<Omit<TestPlanTestCase, 'id' | 'originalTestCaseId' | 'testCaseId'>>) => Promise<boolean>;
  removeTestCasesFromPlan: (planId: string, tcIds: string[]) => Promise<boolean>;
  subscribeToTestPlanTestCases: (planId: string) => () => void;

  // Risk actions
  addRisk: (risk: Omit<Risk, 'id' | 'riskId'>) => Promise<boolean>;
  updateRisk: (riskId: string, data: Partial<Omit<Risk, 'id' | 'riskId'>>) => Promise<boolean>;
  deleteRisk: (riskId: string) => Promise<boolean>;
  autoGenerateRisks: (count: number) => Promise<boolean>;

  // Assumption actions
  addAssumption: (assumption: Omit<Assumption, 'id' | 'assumptionId'>) => Promise<boolean>;
  updateAssumption: (assumptionId: string, data: Partial<Omit<Assumption, 'id' | 'assumptionId'>>) => Promise<boolean>;
  deleteAssumption: (assumptionId: string) => Promise<boolean>;
  autoGenerateAssumptions: (count: number) => Promise<boolean>;

  // Issue actions
  addIssue: (issue: Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { reportedDate: Date, resolvedDate?: Date }) => Promise<boolean>;
  updateIssue: (issueId: string, data: Partial<Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { resolvedDate?: Date }>) => Promise<boolean>;
  deleteIssue: (issueId: string) => Promise<boolean>;

  // Dependency actions
  addDependency: (dependency: Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate: Date }) => Promise<boolean>;
  updateDependency: (dependencyId: string, data: Partial<Omit<Dependency, 'id' | 'dependencyId'| 'expectedByDate'> & { expectedByDate?: Date }>) => Promise<boolean>;
  deleteDependency: (dependencyId: string) => Promise<boolean>;
  autoGenerateDependencies: (count: number) => Promise<boolean>;
  
  // Release & Milestone actions
  addReleaseOrMilestone: (item: Omit<Release, 'id' | 'releaseId'>) => Promise<boolean>;
  updateReleaseOrMilestone: (id: string, data: Partial<Omit<Release, 'id' | 'releaseId' | 'itemType' >>) => Promise<boolean>;
  deleteReleaseOrMilestone: (id: string) => Promise<boolean>;

  // Kanban Column actions
  addKanbanColumn: (column: Omit<KanbanColumn, 'id' | 'isDefault' | 'isDoneColumn'>) => Promise<boolean>;
  updateKanbanColumn: (columnId: string, data: Partial<Omit<KanbanColumn, 'id'>>) => Promise<boolean>;
  deleteKanbanColumn: (columnId: string) => Promise<boolean>;
  updateKanbanColumnOrder: (oldIndex: number, newIndex: number) => Promise<boolean>;
  
  // Settings actions
  updateProjectSettings: (settings: Partial<Omit<ProjectSettings, 'id'>>) => Promise<boolean>;
  setWeeklyOffDays: (days: number[]) => Promise<boolean>;
  updateSprintSettings: (settings: Pick<ProjectSettings, 'sprintDurationInWeeks' | 'sprintStartDay'>) => Promise<boolean>;
  updateEffortSettings: (settings: Pick<ProjectSettings, 'manMonthToDays' | 'manDayToHours' | 'storyPointToHours'>) => Promise<boolean>;
  addHoliday: (holiday: Omit<Holiday, 'id'>) => Promise<boolean>;
  updateHoliday: (id: string, data: Partial<Omit<Holiday, 'id'>>) => Promise<boolean>;
  deleteHoliday: (id: string) => Promise<boolean>;

  // Impacted System Actions (live)
  addImpactedSystem: (system: Omit<ImpactedSystem, 'id'>) => Promise<boolean>;
  updateImpactedSystem: (systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>) => Promise<boolean>;
  deleteImpactedSystem: (systemId: string) => Promise<boolean>;
  replaceImpactedSystems: (systems: Omit<ImpactedSystem, 'id'>[]) => Promise<boolean>;

  // Initial Estimation Actions
  addInitialImpactedSystem: (system: Omit<ImpactedSystem, 'id'>) => Promise<boolean>;
  updateInitialImpactedSystem: (systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>) => Promise<boolean>;
  deleteInitialImpactedSystem: (systemId: string) => Promise<boolean>;
  replaceInitialImpactedSystems: (systems: Omit<ImpactedSystem, 'id'>[]) => Promise<boolean>;
  addInitialHorizontal: (horizontal: Omit<Horizontal, 'id'>) => Promise<boolean>;
  updateInitialHorizontal: (horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>) => Promise<boolean>;
  deleteInitialHorizontal: (horizontalId: string) => Promise<boolean>;
  replaceInitialHorizontals: (horizontals: Omit<Horizontal, 'id'>[]) => Promise<boolean>;
  confirmInitialEstimation: () => Promise<boolean>;

  // Horizontal Actions (live)
  addHorizontal: (horizontal: Omit<Horizontal, 'id'>) => Promise<boolean>;
  updateHorizontal: (horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>) => Promise<boolean>;
  deleteHorizontal: (horizontalId: string) => Promise<boolean>;
  replaceHorizontals: (horizontals: Omit<Horizontal, 'id'>[]) => Promise<boolean>;

  // Environment actions
  addEnvironment: (environment: Omit<Environment, 'id' | 'order'>) => Promise<boolean>;
  updateEnvironment: (environmentId: string, data: Partial<Omit<Environment, 'id' | 'order'>>) => Promise<boolean>;
  deleteEnvironment: (environmentId: string) => Promise<boolean>;
  updateEnvironmentOrder: (oldIndex: number, newIndex: number) => Promise<boolean>;

  // Worklog actions
  saveWorklog: (worklog: Omit<Worklog, 'id'>) => Promise<boolean>;

  // Document actions
  addDocument: (doc: Omit<ProjectDocument, 'id' | 'createdAt'>) => Promise<boolean>;
  updateDocument: (docId: string, data: Partial<Omit<ProjectDocument, 'id' | 'createdAt'>>) => Promise<boolean>;
  deleteDocument: (docId: string) => Promise<boolean>;
  
  // Payment Milestone actions
  addPaymentMilestone: (milestone: Omit<PaymentMilestone, 'id' | 'milestoneId'>) => Promise<boolean>;
  updatePaymentMilestone: (milestoneId: string, data: Partial<Omit<PaymentMilestone, 'id' | 'milestoneId'>>) => Promise<boolean>;
  deletePaymentMilestone: (milestoneId: string) => Promise<boolean>;

  // Code Repository actions
  addCodeRepository: (repo: Omit<CodeRepository, 'id'>) => Promise<boolean>;
  updateCodeRepository: (repoId: string, data: Partial<Omit<CodeRepository, 'id'>>) => Promise<boolean>;
  deleteCodeRepository: (repoId: string) => Promise<boolean>;
  
  // Fixed Cost actions
  addFixedCost: (cost: Omit<FixedCost, 'id'>) => Promise<boolean>;
  updateFixedCost: (id: string, data: Partial<Omit<FixedCost, 'id'>>) => Promise<boolean>;
  deleteFixedCost: (id: string) => Promise<boolean>;

  // Trash actions
  restoreItem: (id: string, collection: string) => Promise<boolean>;
  permanentlyDeleteItem: (id: string, collection: string) => Promise<boolean>;

  isLoading: boolean;
  error: string | null;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

export function ProjectProvider({ children, projectId }: PropsWithChildren<{ projectId: string }>) {
  const isPostgres = process.env.NEXT_PUBLIC_DB_PROVIDER === 'postgres';
  if (isPostgres) {
    return <PostgresProjectProvider projectId={projectId}>{children}</PostgresProjectProvider>;
  }
  return <FirebaseProjectProvider projectId={projectId}>{children}</FirebaseProjectProvider>;
}
