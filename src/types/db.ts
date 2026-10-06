import type { 
    Epic, Story, Sprint, StoryStatus, Employee, TestCase, Risk, Assumption, 
    Issue, Dependency, KanbanColumn, Holiday, ProjectSettings, ImpactedSystem, 
    Release, Worklog, WorklogSubmission, LeavePeriod, Project, 
    Horizontal, User, Environment, WorkItemType, ProjectDocument, 
    PaymentMilestone, CodeRepository, SprintStatus, 
    FixedCost, TestPlan, TestPlanTestCase, TestCycle, TestCycleTestCase
} from '@/types';

export type CollectionName = 'epics' | 'stories' | 'sprints' | 'employees' | 'testCases' | 'risks' | 'assumptions' | 'issues' | 'dependencies' | 'kanbanColumns' | 'holidays' | 'releases' | 'impactedSystems' | 'horizontals' | 'initialImpactedSystems' | 'initialHorizontals' | 'fixedCosts' | 'environments' | 'worklogs' | 'worklogSubmissions' | 'settings' | 'project' | 'allUsers' | 'documents' | 'paymentMilestones' | 'codeRepositories' | 'testPlans' | 'testCycles';

export interface DatabaseAdapter {
    // Initialization / Subscriptions
    subscribeToProjectDoc(projectId: string, callback: (data: Project | null) => void): () => void;
    subscribeToProjectSettings(projectId: string, callback: (data: ProjectSettings | null) => void): () => void;
    subscribeToCollection<T>(projectId: string, collectionName: CollectionName, callback: (data: T[]) => void, customQuery?: any): () => void;
    subscribeToGlobalSettings(callback: (data: ProjectSettings | null) => void): () => void;
    subscribeToGlobalHolidays(callback: (data: Holiday[]) => void): () => void;
    subscribeToAllUsers(callback: (data: User[]) => void): () => void;

    // Project actions
    updateProject(projectId: string, data: Partial<Omit<Project, 'id'>>, currentProject?: Project | null, testDate?: Date | null): Promise<boolean>;

    // Story actions
    addStory(projectId: string, story: Omit<Story, 'id' | 'storyId'>, prefixOverride?: string, testDate?: Date | null, stories?: Story[]): Promise<{id: string, storyId: string} | null>;
    autoGenerateStories(projectId: string, counts: Partial<Record<WorkItemType, number>> | Record<WorkItemType, number>, testDate?: Date | null): Promise<boolean>;
    updateStory(projectId: string, storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>, testDate?: Date | null, stories?: Story[]): Promise<boolean>;
    deleteStory(projectId: string, storyId: string, testDate?: Date | null): Promise<boolean>;
    moveStoryToSprint(projectId: string, storyId: string, sprintId: string | null): Promise<boolean>;
    moveStoryStatus(projectId: string, storyId: string, newStatus: StoryStatus, testDate?: Date | null, stories?: Story[]): Promise<boolean>;
    moveStoryToEpic(projectId: string, storyId: string, epicId: string | null): Promise<boolean>;
    bulkUpdateSubTaskReleases(projectId: string, releaseId: string, stories?: Story[]): Promise<boolean>;
    bulkDeleteStories(projectId: string, storyIds: string[], testDate?: Date | null): Promise<boolean>;
    bulkMoveStories(projectId: string, storyIds: string[], targetEpicId?: string | null, targetReleaseId?: string | null): Promise<boolean>;
    bulkAssignSubTasks(projectId: string, taskIds: string[], assigneeId: string | null): Promise<boolean>;

    // Epic actions
    addEpic(projectId: string, epic: Omit<Epic, 'id'>): Promise<boolean>;
    updateEpic(projectId: string, epicId: string, data: Partial<Omit<Epic, 'id'>>): Promise<boolean>;
    deleteEpic(projectId: string, epicId: string, deleteItems?: boolean): Promise<boolean>;

    // Sprint actions
    addSprint(projectId: string, sprint: { sprintId?: string, title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }): Promise<boolean>;
    updateSprint(projectId: string, sprintId: string, data: { sprintId?: string, title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }): Promise<boolean>;
    deleteSprint(projectId: string, sprintId: string): Promise<boolean>;

    // Employee actions
    addUserToProject(projectId: string, employee: Employee): Promise<boolean>;
    updateProjectUser(projectId: string, employeeId: string, data: Partial<Omit<Employee, 'id' | 'empId' | 'firstName' | 'lastName' | 'email' | 'phone'>>): Promise<boolean>;
    deleteEmployee(projectId: string, employeeId: string): Promise<boolean>;
    addLeavePeriod(projectId: string, employeeId: string, leavePeriod: Omit<LeavePeriod, 'id'>): Promise<boolean>;
    deleteLeavePeriod(projectId: string, employeeId: string, leavePeriodId: string): Promise<boolean>;

    // TestCase actions
    addTestCase(projectId: string, testCase: Omit<TestCase, 'id' | 'testCaseId'>, testDate?: Date | null): Promise<boolean>;
    updateTestCase(projectId: string, testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>): Promise<boolean>;
    autoGenerateTestCases(projectId: string, counts: Record<string, number>, stories?: Story[], testDate?: Date | null): Promise<boolean>;
    deleteTestCase(projectId: string, testCaseId: string): Promise<boolean>;
    addTestPlan(projectId: string, plan: Omit<TestPlan, 'id' | 'testPlanId' | 'testCycleId'>): Promise<boolean>;
    updateTestPlan(projectId: string, id: string, data: Partial<Omit<TestPlan, 'id' | 'testPlanId' | 'testCycleId'>>): Promise<boolean>;
    deleteTestPlan(projectId: string, id: string, deleteTestCases?: boolean): Promise<boolean>;
    addTestCasesToPlan(projectId: string, planId: string, testCaseIds: string[], executionDate?: string, allTestCases?: TestCase[]): Promise<boolean>;
    updateTestPlanTestCase(projectId: string, planId: string, tcId: string, data: Partial<Omit<TestPlanTestCase, 'id' | 'originalTestCaseId' | 'testCaseId'>>, testDate?: Date | null): Promise<boolean>;
    removeTestCasesFromPlan(projectId: string, planId: string, tcIds: string[]): Promise<boolean>;
    subscribeToTestPlanTestCases(projectId: string, planId: string, callback: (data: TestPlanTestCase[]) => void): () => void;
    addTestCycle(projectId: string, cycle: Omit<TestCycle, 'id' | 'testCycleId' | 'testPlanId'>): Promise<boolean>;
    updateTestCycle(projectId: string, id: string, data: Partial<Omit<TestCycle, 'id' | 'testCycleId' | 'testPlanId'>>): Promise<boolean>;
    deleteTestCycle(projectId: string, id: string, deleteTestCases?: boolean): Promise<boolean>;
    addTestCasesToCycle(projectId: string, cycleId: string, testCaseIds: string[], executionDate?: string, allTestCases?: TestCase[]): Promise<boolean>;
    updateTestCycleTestCase(projectId: string, cycleId: string, tcId: string, data: Partial<Omit<TestCycleTestCase, 'id' | 'originalTestCaseId' | 'testCaseId'>>, testDate?: Date | null): Promise<boolean>;
    removeTestCasesFromCycle(projectId: string, cycleId: string, tcIds: string[]): Promise<boolean>;
    subscribeToTestCycleTestCases(projectId: string, cycleId: string, callback: (data: TestCycleTestCase[]) => void): () => void;

    // Risk actions
    addRisk(projectId: string, risk: Omit<Risk, 'id' | 'riskId'>): Promise<boolean>;
    updateRisk(projectId: string, riskId: string, data: Partial<Omit<Risk, 'id' | 'riskId'>>): Promise<boolean>;
    deleteRisk(projectId: string, riskId: string): Promise<boolean>;
    autoGenerateRisks(projectId: string, count: number): Promise<boolean>;

    // Assumption actions
    addAssumption(projectId: string, assumption: Omit<Assumption, 'id' | 'assumptionId' | 'validationDate'> & { validationDate?: Date | string }): Promise<boolean>;
    updateAssumption(projectId: string, assumptionId: string, data: Partial<Omit<Assumption, 'id' | 'assumptionId' | 'validationDate'> & { validationDate?: Date | string }>): Promise<boolean>;
    deleteAssumption(projectId: string, assumptionId: string): Promise<boolean>;
    autoGenerateAssumptions(projectId: string, count: number): Promise<boolean>;

    // Issue actions
    addIssue(projectId: string, issue: Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { reportedDate: Date, resolvedDate?: Date }): Promise<boolean>;
    updateIssue(projectId: string, issueId: string, data: Partial<Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { resolvedDate?: Date }>): Promise<boolean>;
    deleteIssue(projectId: string, issueId: string): Promise<boolean>;

    // Dependency actions
    addDependency(projectId: string, dependency: Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate: Date }): Promise<boolean>;
    updateDependency(projectId: string, dependencyId: string, data: Partial<Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate?: Date }>): Promise<boolean>;
    deleteDependency(projectId: string, dependencyId: string): Promise<boolean>;
    autoGenerateDependencies(projectId: string, count: number): Promise<boolean>;

    // Release & Milestone actions
    addReleaseOrMilestone(projectId: string, item: Omit<Release, 'id' | 'releaseId'>): Promise<boolean>;
    updateReleaseOrMilestone(projectId: string, id: string, data: Partial<Omit<Release, 'id' | 'releaseId' | 'itemType'>>): Promise<boolean>;
    deleteReleaseOrMilestone(projectId: string, id: string): Promise<boolean>;

    // Kanban Column actions
    addKanbanColumn(projectId: string, column: Omit<KanbanColumn, 'id' | 'isDefault' | 'isDoneColumn'>): Promise<boolean>;
    updateKanbanColumn(projectId: string, columnId: string, data: Partial<Omit<KanbanColumn, 'id'>>): Promise<boolean>;
    deleteKanbanColumn(projectId: string, columnId: string): Promise<boolean>;
    updateKanbanColumnOrder(projectId: string, oldIndex: number, newIndex: number, kanbanColumns?: KanbanColumn[]): Promise<boolean>;

    // Settings actions
    updateProjectSettings(projectId: string, settings: Partial<Omit<ProjectSettings, 'id'>>): Promise<boolean>;
    setWeeklyOffDays(projectId: string, days: number[]): Promise<boolean>;
    updateSprintSettings(projectId: string, settings: Pick<ProjectSettings, 'sprintDurationInWeeks' | 'sprintStartDay'>): Promise<boolean>;
    updateEffortSettings(projectId: string, settings: Pick<ProjectSettings, 'manMonthToDays' | 'manDayToHours' | 'storyPointToHours'>): Promise<boolean>;
    addHoliday(projectId: string, holiday: Omit<Holiday, 'id'>, isGlobal?: boolean): Promise<boolean>;
    updateHoliday(projectId: string, id: string, data: Partial<Omit<Holiday, 'id'>>, isGlobal?: boolean): Promise<boolean>;
    deleteHoliday(projectId: string, id: string, isGlobal?: boolean): Promise<boolean>;

    // Impacted System Actions (live)
    addImpactedSystem(projectId: string, system: Omit<ImpactedSystem, 'id'>): Promise<boolean>;
    updateImpactedSystem(projectId: string, systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>): Promise<boolean>;
    deleteImpactedSystem(projectId: string, systemId: string): Promise<boolean>;
    replaceImpactedSystems(projectId: string, systems: Omit<ImpactedSystem, 'id'>[]): Promise<boolean>;

    // Initial Estimation Actions
    addInitialImpactedSystem(projectId: string, system: Omit<ImpactedSystem, 'id'>): Promise<boolean>;
    updateInitialImpactedSystem(projectId: string, systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>): Promise<boolean>;
    deleteInitialImpactedSystem(projectId: string, systemId: string): Promise<boolean>;
    replaceInitialImpactedSystems(projectId: string, systems: Omit<ImpactedSystem, 'id'>[]): Promise<boolean>;
    addInitialHorizontal(projectId: string, horizontal: Omit<Horizontal, 'id'>): Promise<boolean>;
    updateInitialHorizontal(projectId: string, horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>): Promise<boolean>;
    deleteInitialHorizontal(projectId: string, horizontalId: string): Promise<boolean>;
    replaceInitialHorizontals(projectId: string, horizontals: Omit<Horizontal, 'id'>[]): Promise<boolean>;
    confirmInitialEstimation(projectId: string, initialImpactedSystems?: ImpactedSystem[], initialHorizontals?: Horizontal[]): Promise<boolean>;

    // Horizontal Actions (live)
    addHorizontal(projectId: string, horizontal: Omit<Horizontal, 'id'>): Promise<boolean>;
    updateHorizontal(projectId: string, horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>): Promise<boolean>;
    deleteHorizontal(projectId: string, horizontalId: string): Promise<boolean>;
    replaceHorizontals(projectId: string, horizontals: Omit<Horizontal, 'id'>[]): Promise<boolean>;

    // Environment actions
    addEnvironment(projectId: string, environment: Omit<Environment, 'id' | 'order'>, environments?: Environment[]): Promise<boolean>;
    updateEnvironment(projectId: string, environmentId: string, data: Partial<Omit<Environment, 'id' | 'order'>>): Promise<boolean>;
    deleteEnvironment(projectId: string, environmentId: string): Promise<boolean>;
    updateEnvironmentOrder(projectId: string, oldIndex: number, newIndex: number, environments?: Environment[]): Promise<boolean>;

    // Worklog actions
    saveWorklog(projectId: string, worklog: Omit<Worklog, 'id'>): Promise<boolean>;

    // Document actions
    addDocument(projectId: string, doc: Omit<ProjectDocument, 'id' | 'createdAt'>): Promise<boolean>;
    updateDocument(projectId: string, docId: string, data: Partial<Omit<ProjectDocument, 'id' | 'createdAt'>>): Promise<boolean>;
    deleteDocument(projectId: string, docId: string): Promise<boolean>;

    // Payment Milestone actions
    addPaymentMilestone(projectId: string, milestone: Omit<PaymentMilestone, 'id' | 'milestoneId'>): Promise<boolean>;
    updatePaymentMilestone(projectId: string, milestoneId: string, data: Partial<Omit<PaymentMilestone, 'id' | 'milestoneId'>>): Promise<boolean>;
    deletePaymentMilestone(projectId: string, milestoneId: string): Promise<boolean>;

    // Code Repository actions
    addCodeRepository(projectId: string, repo: Omit<CodeRepository, 'id'>): Promise<boolean>;
    updateCodeRepository(projectId: string, repoId: string, data: Partial<Omit<CodeRepository, 'id'>>): Promise<boolean>;
    deleteCodeRepository(projectId: string, repoId: string): Promise<boolean>;

    // Fixed Cost actions
    addFixedCost(projectId: string, cost: Omit<FixedCost, 'id'>): Promise<boolean>;
    updateFixedCost(projectId: string, id: string, data: Partial<Omit<FixedCost, 'id'>>): Promise<boolean>;
    deleteFixedCost(projectId: string, id: string): Promise<boolean>;

    // Trash actions
    restoreItem(projectId: string, id: string, collection: string): Promise<boolean>;
    permanentlyDeleteItem(projectId: string, id: string, collection: string): Promise<boolean>;
    
    // Setup / default actions if empty
    setupDefaultKanbanColumns(projectId: string): Promise<void>;
    setupDefaultFixedCosts(projectId: string): Promise<void>;
    setupDefaultDocuments(projectId: string): Promise<void>;
    setupDefaultProjectSettings(projectId: string): Promise<void>;
    autoRepairEmployeeCapabilities(projectId: string, employees: Employee[], impactedSystems: ImpactedSystem[]): Promise<void>;
}
