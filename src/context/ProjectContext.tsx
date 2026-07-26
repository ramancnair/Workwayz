'use client';

import { createContext, useContext, type PropsWithChildren } from 'react';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase, Risk, Assumption, Issue, Dependency, KanbanColumn, Holiday, ProjectSettings, ImpactedSystem, Release, Worklog, WorklogItem, WorklogSubmission, LeavePeriod, Project, Horizontal, User, Environment, WorkItemType, BugSeverity, RiskSeverity, RiskProbability, AssumptionCategory, AssumptionStatus, IssuePriority, IssueStatus, DependencyStatus, DependencyType, ProjectDocument, PaymentMilestone, CodeRepository, StatusHistoryItem, SprintStatus, FixedCost, TestPlan, TestPlanTestCase } from '@/types';

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
  projectSettings: ProjectSettings | null,
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
  addStory: (story: Omit<Story, 'id' | 'storyId'>, prefix?: string) => Promise<{id: string, storyId: string} | null>;
  autoGenerateStories: (counts: Record<WorkItemType, number>) => Promise<boolean>;
  updateStory: (storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>) => Promise<boolean>;
  deleteStory: (storyId: string) => Promise<boolean>;
  moveStoryToSprint: (storyId: string, sprintId: string | null) => Promise<boolean>;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => Promise<boolean>;
  moveStoryToEpic: (storyId: string, epicId: string | null) => Promise<boolean>;
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
  
  // Bug actions


  // Risk actions
  addRisk: (risk: Omit<Risk, 'id' | 'riskId'>) => Promise<boolean>;
  updateRisk: (riskId: string, data: Partial<Omit<Risk, 'id' | 'riskId'>>) => Promise<boolean>;
  deleteRisk: (riskId: string) => Promise<boolean>;
  autoGenerateRisks: (count: number) => Promise<boolean>;
  
  // Assumption actions
  addAssumption: (assumption: Omit<Assumption, 'id' | 'assumptionId' | 'validationDate'> & { validationDate?: Date }) => Promise<boolean>;
  updateAssumption: (assumptionId: string, data: Partial<Omit<Assumption, 'id' | 'assumptionId'| 'validationDate'> & { validationDate?: Date }>) => Promise<boolean>;
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


    } catch(e) {
      console.error("Firebase Error: Failed to auto-generate test cases.", e);
      return false;
    }
  };

  const updateTestCase = async (testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const testCaseRef = doc(db, 'projects', projectId, 'testCases', testCaseId);
      await updateDoc(testCaseRef, sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update test case.", { id: testCaseId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteTestCase = async (testCaseId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const testCaseRef = doc(db, 'projects', projectId, 'testCases', testCaseId);
      await updateDoc(testCaseRef, { isDeleted: true, deletedAt: Timestamp.now() });
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to soft-delete test case.", { id: testCaseId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const addTestPlan = async (plan: Omit<TestPlan, 'id' | 'testPlanId'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
        const testPlansSnapshot = await getDocs(collection(db, 'projects', projectId, 'testPlans'));
        const newIdNumber = testPlansSnapshot.size > 0
            ? Math.max(0, ...testPlansSnapshot.docs
                .map(doc => doc.data().testPlanId)
                .filter((id: string | undefined) => id && typeof id === 'string')
                .map((id: string) => parseInt(id.replace('TP-', ''), 10) || 0)
            ) + 1
            : 1;

        const payload = {
            ...plan,
            testPlanId: `TP-${newIdNumber}`,
            startDate: new Date(plan.startDate).toISOString(),
            endDate: new Date(plan.endDate).toISOString(),
        };
        await addDoc(collection(db, 'projects', projectId, 'testPlans'), sanitizeForFirestore(payload));
        return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add test plan.", e);
      return false;
    }
  };
  
  const updateTestPlan = async (id: string, data: Partial<Omit<TestPlan, 'id' | 'testPlanId'>>) => {
    if (!db || !projectId) return false;
    try {
      const payload = { ...data };
      if (data.startDate) payload.startDate = new Date(data.startDate).toISOString();
      if (data.endDate) payload.endDate = new Date(data.endDate).toISOString();
      await updateDoc(doc(db, 'projects', projectId, 'testPlans', id), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update test plan.", e);
      return false;
    }
  };

  const deleteTestPlan = async (id: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      // Delete the plan document
      batch.delete(doc(db, 'projects', projectId, 'testPlans', id));

      // Delete all test case copies in this plan's subcollection
      const planTCsSnapshot = await getDocs(collection(db, 'projects', projectId, 'testPlans', id, 'testCases'));
      planTCsSnapshot.docs.forEach(tcDoc => {
        batch.delete(tcDoc.ref);
      });

      await batch.commit();
      // Clean up local state
      setTestPlanTestCases(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete test plan.", e);
      return false;
    }
  };

  // Test Plan Test Case Actions (copies in subcollection)
  const addTestCasesToPlan = async (planId: string, testCaseIds: string[], executionDate?: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      const existingPlanTCs = testPlanTestCases[planId] || [];
      const existingOrigIds = new Set(existingPlanTCs.map(tc => tc.originalTestCaseId));

      for (const tcId of testCaseIds) {
        if (existingOrigIds.has(tcId)) continue; // Already in plan
        const originalTC = testCases.find(tc => tc.id === tcId);
        if (!originalTC) continue;

        const newRef = doc(collection(db, 'projects', projectId, 'testPlans', planId, 'testCases'));
        const copy: Omit<TestPlanTestCase, 'id'> = {
          originalTestCaseId: originalTC.id,
          testCaseId: originalTC.testCaseId,
          title: originalTC.title,
          type: originalTC.type,
          description: originalTC.description,
          expectedResult: originalTC.expectedResult,
          storyId: originalTC.storyId,
          releaseId: originalTC.releaseId,
          sprintId: originalTC.sprintId,
          status: 'Not Run',
          executionDate: executionDate,
          attachment: originalTC.attachment || '',
        };
        batch.set(newRef, sanitizeForFirestore(copy));
      }

      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add test cases to plan.", e);
      return false;
    }
  };

  const updateTestPlanTestCase = async (planId: string, tcId: string, data: Partial<Omit<TestPlanTestCase, 'id' | 'originalTestCaseId' | 'testCaseId'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const tcRef = doc(db, 'projects', projectId, 'testPlans', planId, 'testCases', tcId);
      const existingTC = (testPlanTestCases[planId] || []).find(tc => tc.id === tcId);
      
      const payload: any = { ...data };

      // Auto-manage closeDate based on status
      if (data.status === 'Passed') {
        payload.closeDate = (testDate || new Date()).toISOString();
      } else if (data.status && data.status !== 'Passed') {
        payload.closeDate = null; // Clear close date when not Passed
      }

      // Track status history
      if (existingTC && data.status && data.status !== existingTC.status) {
        const newHistoryEntry: StatusHistoryItem = {
          fromStatus: existingTC.status,
          toStatus: data.status,
          date: (testDate || new Date()).toISOString(),
        };
        payload.statusHistory = [...(existingTC.statusHistory || []), newHistoryEntry];
      }

      await updateDoc(tcRef, sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update test plan test case.", { planId, tcId, code: e.code, message: e.message });
      return false;
    }
  };

  const removeTestCasesFromPlan = async (planId: string, tcIds: string[]): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      for (const tcId of tcIds) {
        batch.delete(doc(db, 'projects', projectId, 'testPlans', planId, 'testCases', tcId));
      }
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to remove test cases from plan.", e);
      return false;
    }
  };

  const subscribeToTestPlanTestCases = useCallback((planId: string): (() => void) => {
    if (!db || !projectId || !planId) return () => {};
    const colRef = collection(db, 'projects', projectId, 'testPlans', planId, 'testCases');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const convertTimestamp = (field: any) => field?.toDate ? field.toDate().toISOString() : field;
      const data = snapshot.docs.map(d => {
        const docData = d.data();
        // Convert timestamps
        ['executionDate', 'closeDate'].forEach(f => {
          if (docData[f]) docData[f] = convertTimestamp(docData[f]);
        });
        if (docData.statusHistory) {
          docData.statusHistory = docData.statusHistory.map((sh: any) => ({
            ...sh,
            date: convertTimestamp(sh.date),
          }));
        }
        return { id: d.id, ...docData } as TestPlanTestCase;
      });
      setTestPlanTestCases(prev => ({ ...prev, [planId]: data }));
    });
    return unsubscribe;
  }, [db, projectId]);

  // Risk Actions
  const addRisk = async (risk: Omit<Risk, 'id' | 'riskId'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const risksSnapshot = await getDocs(collection(db, 'projects', projectId, 'risks'));
      const newIdNumber = risksSnapshot.size > 0
        ? Math.max(0, ...risksSnapshot.docs
            .map(doc => doc.data().riskId)
            .filter((id: string | undefined) => id && typeof id === 'string')
            .map((id: string) => parseInt(id.replace('R-', ''), 10) || 0)
        ) + 1
        : 1;

      const payload = { ...risk, riskId: `R-${newIdNumber}`, isDeleted: false, deletedAt: null };
      await addDoc(collection(db, 'projects', projectId, 'risks'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add risk.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateRisk = async (riskId: string, data: Partial<Omit<Risk, 'id' | 'riskId'>>) => {
    if (!db || !projectId) return false;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'risks', riskId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update risk.", { id: riskId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteRisk = async (riskId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const riskRef = doc(db, 'projects', projectId, 'risks', riskId);
      await updateDoc(riskRef, { isDeleted: true, deletedAt: Timestamp.now() });
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete risk.", { id: riskId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const autoGenerateRisks = async (count: number): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      const risksSnapshot = await getDocs(collection(db, 'projects', projectId, 'risks'));
      let currentIdCounter = risksSnapshot.size > 0 ? Math.max(0, ...risksSnapshot.docs.map(doc => parseInt(doc.data().riskId.replace('R-', ''), 10) || 0)) + 1 : 1;
      
      const riskSamples = [
        { desc: 'Unexpected third-party API changes', mitigation: 'Regularly review API documentation and maintain a wrapper.', contingency: 'Temporarily switch to a fallback service.' },
        { desc: 'Key team member unavailability', mitigation: 'Implement knowledge sharing sessions and pair programming.', contingency: 'Re-assign critical tasks to another senior member.' },
        { desc: 'Scope creep from stakeholders', mitigation: 'Establish a formal change control process.', contingency: 'Negotiate for additional time or resources.' },
        { desc: 'Performance bottlenecks under load', mitigation: 'Conduct regular load testing.', contingency: 'Scale up server resources vertically or horizontally.' },
      ];

      for (let i = 0; i < count; i++) {
        const riskRef = doc(collection(db, 'projects', projectId, 'risks'));
        const sample = riskSamples[i % riskSamples.length];
        const newRisk: Omit<Risk, 'id'> = {
          riskId: `R-${currentIdCounter++}`,
          description: `${sample.desc} #${i+1}`,
          severity: (Math.floor(Math.random() * 3) + 1) as RiskSeverity,
          probability: (Math.floor(Math.random() * 3) + 1) as RiskProbability,
          mitigationPlan: sample.mitigation,
          residualRisk: 'Some level of risk may remain, requires monitoring.',
          contingencyPlan: sample.contingency,
          isDeleted: false, 
          deletedAt: null
        };
        batch.set(riskRef, newRisk);
      }
      await batch.commit();
      return true;
    } catch(e) {
      console.error("Firebase error generating risks", e);
      return false;
    }
  };
  
  // Assumption Actions
  const addAssumption = async (assumption: Omit<Assumption, 'id' | 'assumptionId' | 'validationDate'> & { validationDate?: Date }): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const snapshot = await getDocs(collection(db, 'projects', projectId, 'assumptions'));
      const newId = `A-${snapshot.size + 1}`;
      const payload: any = { ...assumption, assumptionId: newId, isDeleted: false, deletedAt: null };
      if (assumption.validationDate) payload.validationDate = Timestamp.fromDate(assumption.validationDate);
      await addDoc(collection(db, 'projects', projectId, 'assumptions'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add assumption.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateAssumption = async (id: string, data: Partial<Omit<Assumption, 'id' | 'assumptionId'| 'validationDate'> & { validationDate?: Date }>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const { validationDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('validationDate')) payload.validationDate = validationDate ? Timestamp.fromDate(validationDate) : null;
      await updateDoc(doc(db, 'projects', projectId, 'assumptions', id), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update assumption.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteAssumption = async (id: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const assumptionRef = doc(db, 'projects', projectId, 'assumptions', id);
      await updateDoc(assumptionRef, { isDeleted: true, deletedAt: Timestamp.now() });
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete assumption.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const autoGenerateAssumptions = async (count: number): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'projects', projectId, 'assumptions'));
      let currentIdCounter = snapshot.size > 0 ? Math.max(0, ...snapshot.docs.map(doc => parseInt(doc.data().assumptionId.replace('A-', ''), 10) || 0)) + 1 : 1;
      
      const assumptionSamples = [
        'Necessary hardware will be available on time.',
        'Third-party APIs will be stable and reliable.',
        'Project funding will remain consistent throughout the lifecycle.',
        'Key stakeholders will be available for feedback sessions.',
      ];
      const categories: AssumptionCategory[] = ['Technical', 'Resource', 'Business', 'External'];
      const statuses: AssumptionStatus[] = ['Active', 'Validated', 'Invalidated'];

      for (let i = 0; i < count; i++) {
        const assumptionRef = doc(collection(db, 'projects', projectId, 'assumptions'));
        const newAssumption: Omit<Assumption, 'id'> = {
          assumptionId: `A-${currentIdCounter++}`,
          description: `${assumptionSamples[i % assumptionSamples.length]}`,
          category: categories[Math.floor(Math.random() * categories.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          isDeleted: false,
          deletedAt: null
        };
        
        if (employees.length > 0) {
            newAssumption.ownerId = employees[Math.floor(Math.random() * employees.length)].id;
        }

        batch.set(assumptionRef, newAssumption);
      }
      await batch.commit();
      return true;
    } catch(e) {
      console.error("Firebase error generating assumptions", e);
      return false;
    }
  };

  // Issue Actions
  const addIssue = async (issue: Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { reportedDate: Date, resolvedDate?: Date }): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const snapshot = await getDocs(collection(db, 'projects', projectId, 'issues'));
      const newId = `I-${snapshot.size + 1}`;
      const payload: any = { ...issue, issueId: newId, isDeleted: false, deletedAt: null };
      payload.reportedDate = Timestamp.fromDate(issue.reportedDate);
      if (issue.resolvedDate) payload.resolvedDate = Timestamp.fromDate(issue.resolvedDate);
      await addDoc(collection(db, 'projects', projectId, 'issues'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add issue.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateIssue = async (id: string, data: Partial<Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { resolvedDate?: Date }>) => {
    if (!db || !projectId) return false;
    try {
      const { resolvedDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('resolvedDate')) payload.resolvedDate = resolvedDate ? Timestamp.fromDate(resolvedDate) : null;
      await updateDoc(doc(db, 'projects', projectId, 'issues', id), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update issue.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const deleteIssue = async (id: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const issueRef = doc(db, 'projects', projectId, 'issues', id);
      await updateDoc(issueRef, { isDeleted: true, deletedAt: Timestamp.now() });
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete issue.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  // Dependency Actions
  const addDependency = async (dependency: Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate: Date }): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const snapshot = await getDocs(collection(db, 'projects', projectId, 'dependencies'));
      const newId = `D-${snapshot.size + 1}`;
      const payload: any = { ...dependency, dependencyId: newId, isDeleted: false, deletedAt: null };
      payload.expectedByDate = Timestamp.fromDate(dependency.expectedByDate);
      await addDoc(collection(db, 'projects', projectId, 'dependencies'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add dependency.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const updateDependency = async (id: string, data: Partial<Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate?: Date }>) => {
    if (!db || !projectId) return false;
    try {
      const { expectedByDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('expectedByDate')) payload.expectedByDate = expectedByDate ? Timestamp.fromDate(expectedByDate) : null;
      await updateDoc(doc(db, 'projects', projectId, 'dependencies', id), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update dependency.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteDependency = async (id: string): Promise<boolean> => {
     if (!db || !projectId) return false;
    try {
      const depRef = doc(db, 'projects', projectId, 'dependencies', id);
      await updateDoc(depRef, { isDeleted: true, deletedAt: Timestamp.now() });
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete dependency.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const autoGenerateDependencies = async (count: number): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'projects', projectId, 'dependencies'));
      let currentIdCounter = snapshot.size > 0 ? Math.max(0, ...snapshot.docs.map(doc => parseInt(doc.data().dependencyId.replace('D-', ''), 10) || 0)) + 1 : 1;
      
      const dependencySamples = [
        { on: 'Marketing Team', desc: 'Finalized ad copy for the new feature.' },
        { on: 'External Payments API', desc: 'Availability of sandbox environment for testing.' },
        { on: 'Legal Department', desc: 'Approval of updated Terms of Service.' },
        { on: 'Team Alpha (Another Project)', desc: 'Completion of shared user-profile microservice.' },
      ];
      const statuses: DependencyStatus[] = ['On Track', 'At Risk', 'Blocked'];
      const types: DependencyType[] = ['Internal', 'External'];

      for (let i = 0; i < count; i++) {
        const dependencyRef = doc(collection(db, 'projects', projectId, 'dependencies'));
        const sample = dependencySamples[i % dependencySamples.length];
        const newDependency: Omit<Dependency, 'id' | 'expectedByDate'> = {
          dependencyId: `D-${currentIdCounter++}`,
          description: sample.desc,
          dependencyOn: sample.on,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          type: types[Math.floor(Math.random() * types.length)],
          isDeleted: false,
          deletedAt: null
        };
        
        if (employees.length > 0) {
          newDependency.ownerId = employees[Math.floor(Math.random() * employees.length)].id;
        }

        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + Math.floor(Math.random() * 30) + 7);
        const payload = { ...newDependency, expectedByDate: Timestamp.fromDate(expectedDate) };
        batch.set(dependencyRef, payload);
      }
      await batch.commit();
      return true;
    } catch(e) {
      console.error("Firebase error generating dependencies", e);
      return false;
    }
  };

  // Release & Milestone Actions
  const addReleaseOrMilestone = async (item: Omit<Release, 'id' | 'releaseId'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const { startDate, endDate, milestoneDate, ...rest } = item;
      const prefixMap: Record<string, string> = {
        'Release': 'REL',
        'Stage': 'S',
        'Milestone': 'M',
      }
      const prefix = prefixMap[item.itemType] || 'ITEM';
      const itemsOfType = releasesAndMilestones.filter(i => i.itemType === item.itemType);
      const newId = `${prefix}-${itemsOfType.length + 1}`;
      
      const payload: any = { ...rest, releaseId: newId };
      if(startDate) payload.startDate = Timestamp.fromDate(new Date(startDate));
      if(endDate) payload.endDate = Timestamp.fromDate(new Date(endDate));
      if(milestoneDate) payload.milestoneDate = Timestamp.fromDate(new Date(milestoneDate));
      
      await addDoc(collection(db, 'projects', projectId, 'releases'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add release or milestone.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateReleaseOrMilestone = async (id: string, data: Partial<Omit<Release, 'id' | 'releaseId' | 'itemType' >>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const { startDate, endDate, milestoneDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('startDate') && startDate) payload.startDate = Timestamp.fromDate(new Date(startDate));
      if (data.hasOwnProperty('endDate') && endDate) payload.endDate = Timestamp.fromDate(new Date(endDate));
      if (data.hasOwnProperty('milestoneDate') && milestoneDate) payload.milestoneDate = Timestamp.fromDate(new Date(milestoneDate));

      await updateDoc(doc(db, 'projects', projectId, 'releases', id), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update release or milestone.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteReleaseOrMilestone = async (id: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'releases', id));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete release or milestone.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Kanban Column Actions
  const addKanbanColumn = async (column: Omit<KanbanColumn, 'id' | 'isDefault' | 'isDoneColumn'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const payload = { ...column, isDefault: false, isDoneColumn: false };
      await addDoc(collection(db, 'projects', projectId, 'kanbanColumns'), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add Kanban column.", e);
      return false;
    }
  };
  
  const updateKanbanColumn = async (columnId: string, data: Partial<Omit<KanbanColumn, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      const columnRef = doc(db, 'projects', projectId, 'kanbanColumns', columnId);
      await updateDoc(columnRef, sanitizeForFirestore(data));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update Kanban column.", e);
      return false;
    }
  };

  const deleteKanbanColumn = async (columnId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'kanbanColumns', columnId));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete Kanban column.", e);
      return false;
    }
  };

  const updateKanbanColumnOrder = async (oldIndex: number, newIndex: number): Promise<boolean> => {
    if (!db || !projectId) return false;
    const sortedColumns = [...kanbanColumns].sort((a, b) => a.order - b.order);
    const movedColumns = arrayMove(sortedColumns, oldIndex, newIndex);
    
    // Optimistically update local state
    setKanbanColumns(movedColumns.map((col, index) => ({ ...col, order: index })));

    try {
        const batch = writeBatch(db);
        movedColumns.forEach((column, index) => {
            const docRef = doc(db, 'projects', projectId, 'kanbanColumns', column.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
        return true;
    } catch (e) {
        console.error("Firebase Error: Failed to update Kanban column order.", e);
        // Revert local state on error
        setKanbanColumns(sortedColumns);
        return false;
    }
  };
  
  // Settings Actions
  const updateProjectSettings = async (settings: Partial<Omit<ProjectSettings, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      const settingsRef = doc(db, 'projects', projectId, 'settings', 'main');
      await setDoc(settingsRef, sanitizeForFirestore(settings), { merge: true });
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update project settings.", e);
      return false;
    }
  };
  
  const setWeeklyOffDays = async (days: number[]) => {
    if (!db || !projectId) return false;
    return updateProjectSettings({ weeklyOffDays: days });
  };
  
  const updateSprintSettings = async (settings: Pick<ProjectSettings, 'sprintDurationInWeeks' | 'sprintStartDay'>) => {
     if (!db || !projectId) return false;
     return updateProjectSettings(settings);
  };

  const updateEffortSettings = async (settings: Pick<ProjectSettings, 'manMonthToDays' | 'manDayToHours' | 'storyPointToHours'>) => {
    if (!db || !projectId) return false;
    return updateProjectSettings(settings);
  };

  const addHoliday = async (holiday: Omit<Holiday, 'id'>) => {
    if (!db || !projectId) return false;
    try {
      const payload: any = { ...holiday };
      if (holiday.date) payload.date = Timestamp.fromDate(new Date(holiday.date));
      await addDoc(collection(db, 'projects', projectId, 'holidays'), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add holiday.", e);
      return false;
    }
  };

  const updateHoliday = async (id: string, data: Partial<Omit<Holiday, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      const payload: any = { ...data };
      if (data.date) payload.date = Timestamp.fromDate(new Date(data.date));
      await updateDoc(doc(db, 'projects', projectId, 'holidays', id), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update holiday.", e);
      return false;
    }
  };

  const deleteHoliday = async (id: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'holidays', id));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete holiday.", e);
      return false;
    }
  };

  // Impacted System Actions (live)
  const addImpactedSystem = async (system: Omit<ImpactedSystem, 'id'>) => {
    if (!db || !projectId) return false;
    try {
      await addDoc(collection(db, 'projects', projectId, 'impactedSystems'), sanitizeForFirestore(system));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const updateImpactedSystem = async (systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      const safeId = systemId.replace(/\//g, '-');
      await setDoc(doc(db, 'projects', projectId, 'impactedSystems', safeId), sanitizeForFirestore(data), { merge: true });
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteImpactedSystem = async (systemId: string) => {
    if (!db || !projectId) return false;
    try {
      const safeId = systemId.replace(/\//g, '-');
      await deleteDoc(doc(db, 'projects', projectId, 'impactedSystems', safeId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const replaceImpactedSystems = async (systems: Omit<ImpactedSystem, 'id'>[]) => {
    if (!db || !projectId) return false;
    try {
        const batch = writeBatch(db);
        const projectDocRef = doc(db, 'projects', projectId);
        const existingSnapshot = await getDocs(collection(projectDocRef, 'impactedSystems'));
        existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        systems.forEach(sys => {
            const newRef = doc(collection(projectDocRef, 'impactedSystems'));
            batch.set(newRef, sanitizeForFirestore(sys));
        });

        await batch.commit();
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to replace impacted systems.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  // Initial Estimation Actions
  const addInitialImpactedSystem = async (system: Omit<ImpactedSystem, 'id'>) => {
    if (!db || !projectId) return false;
    try {
      await addDoc(collection(db, 'projects', projectId, 'initialImpactedSystems'), sanitizeForFirestore(system));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const updateInitialImpactedSystem = async (systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      const safeId = systemId.replace(/\//g, '-');
      await setDoc(doc(db, 'projects', projectId, 'initialImpactedSystems', safeId), sanitizeForFirestore(data), { merge: true });
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteInitialImpactedSystem = async (systemId: string) => {
    if (!db || !projectId) return false;
    try {
      const safeId = systemId.replace(/\//g, '-');
      await deleteDoc(doc(db, 'projects', projectId, 'initialImpactedSystems', safeId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const replaceInitialImpactedSystems = async (systems: Omit<ImpactedSystem, 'id'>[]) => {
    if (!db || !projectId) return false;
    try {
        const batch = writeBatch(db);
        const projectDocRef = doc(db, 'projects', projectId);
        const existingSnapshot = await getDocs(collection(projectDocRef, 'initialImpactedSystems'));
        existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        systems.forEach(sys => {
            const newRef = doc(collection(projectDocRef, 'initialImpactedSystems'));
            batch.set(newRef, sanitizeForFirestore(sys));
        });

        await batch.commit();
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to replace initial impacted systems.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };
  
  const confirmInitialEstimation = async (): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      const projectDocRef = doc(db, 'projects', projectId);

      // 1. Copy Impacted Systems
      const initialSystemsSnapshot = await getDocs(collection(projectDocRef, 'initialImpactedSystems'));
      const liveSystemsSnapshot = await getDocs(collection(projectDocRef, 'impactedSystems'));
      liveSystemsSnapshot.docs.forEach(liveDoc => batch.delete(liveDoc.ref));
      initialSystemsSnapshot.docs.forEach(initialDoc => {
          const newDocRef = doc(collection(projectDocRef, 'impactedSystems'));
          batch.set(newDocRef, initialDoc.data());
      });

      // 2. Copy enabled Horizontals
      const initialHorizontalsSnapshot = await getDocs(collection(projectDocRef, 'initialHorizontals'));
      const liveHorizontalsSnapshot = await getDocs(collection(projectDocRef, 'horizontals'));
      liveHorizontalsSnapshot.docs.forEach(liveDoc => batch.delete(liveDoc.ref));
      initialHorizontalsSnapshot.docs.forEach(initialDoc => {
          if (initialDoc.data().isEnabled) {
              const newDocRef = doc(collection(projectDocRef, 'horizontals'));
              batch.set(newDocRef, initialDoc.data());
          }
      });
      
      // 3. Update project status
      batch.update(projectDocRef, { status: 'Not Started' });

      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to confirm initial estimation.", e);
      return false;
    }
  };

  // Horizontal Actions (live)
  const addHorizontal = async (horizontal: Omit<Horizontal, 'id'>) => {
    if (!db || !projectId) return false;
    try {
      await addDoc(collection(db, 'projects', projectId, 'horizontals'), sanitizeForFirestore(horizontal));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const updateHorizontal = async (horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      const safeId = horizontalId.replace(/\//g, '-');
      await setDoc(doc(db, 'projects', projectId, 'horizontals', safeId), sanitizeForFirestore(data), { merge: true });
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteHorizontal = async (horizontalId: string) => {
    if (!db || !projectId) return false;
    try {
      const safeId = horizontalId.replace(/\//g, '-');
      await deleteDoc(doc(db, 'projects', projectId, 'horizontals', safeId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const replaceHorizontals = async (horizontals: Omit<Horizontal, 'id'>[]) => {
    if (!db || !projectId) return false;
    try {
        const batch = writeBatch(db);
        const projectDocRef = doc(db, 'projects', projectId);
        const existingSnapshot = await getDocs(collection(projectDocRef, 'horizontals'));
        existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        horizontals.forEach(hor => {
            const newRef = doc(collection(projectDocRef, 'horizontals'));
            batch.set(newRef, sanitizeForFirestore(hor));
        });

        await batch.commit();
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to replace horizontals.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  // Initial Horizontal Actions
  const addInitialHorizontal = async (horizontal: Omit<Horizontal, 'id'>) => {
    if (!db || !projectId) return false;
    try {
      await addDoc(collection(db, 'projects', projectId, 'initialHorizontals'), sanitizeForFirestore(horizontal));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const updateInitialHorizontal = async (horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      const safeId = horizontalId.replace(/\//g, '-');
      await setDoc(doc(db, 'projects', projectId, 'initialHorizontals', safeId), sanitizeForFirestore(data), { merge: true });
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteInitialHorizontal = async (horizontalId: string) => {
    if (!db || !projectId) return false;
    try {
      const safeId = horizontalId.replace(/\//g, '-');
      await deleteDoc(doc(db, 'projects', projectId, 'initialHorizontals', safeId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const replaceInitialHorizontals = async (horizontals: Omit<Horizontal, 'id'>[]) => {
    if (!db || !projectId) return false;
    try {
        const batch = writeBatch(db);
        const projectDocRef = doc(db, 'projects', projectId);
        const existingSnapshot = await getDocs(collection(projectDocRef, 'initialHorizontals'));
        existingSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        horizontals.forEach(hor => {
            const newRef = doc(collection(projectDocRef, 'initialHorizontals'));
            batch.set(newRef, sanitizeForFirestore(hor));
        });

        await batch.commit();
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to replace initial horizontals.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  // Environment Actions
  const addEnvironment = async (environment: Omit<Environment, 'id' | 'order'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const newOrder = environments.length > 0 ? Math.max(...environments.map(e => e.order)) + 1 : 0;
      const payload = { ...environment, order: newOrder };
      await addDoc(collection(db, 'projects', projectId, 'environments'), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add environment.", e);
      return false;
    }
  };

  const updateEnvironment = async (environmentId: string, data: Partial<Omit<Environment, 'id' | 'order'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'environments', environmentId), sanitizeForFirestore(data));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update environment.", e);
      return false;
    }
  };

  const deleteEnvironment = async (environmentId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'environments', environmentId));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete environment.", e);
      return false;
    }
  };
  
  const updateEnvironmentOrder = async (oldIndex: number, newIndex: number): Promise<boolean> => {
    if (!db || !projectId) return false;
    const sortedEnvironments = [...environments].sort((a, b) => a.order - b.order);
    const movedEnvironments = arrayMove(sortedEnvironments, oldIndex, newIndex);
    
    setEnvironments(movedEnvironments.map((env, index) => ({ ...env, order: index })));

    try {
        const batch = writeBatch(db);
        movedEnvironments.forEach((env, index) => {
            const docRef = doc(db, 'projects', projectId, 'environments', env.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
        return true;
    } catch (e) {
        console.error("Firebase Error: Failed to update environment order.", e);
        setEnvironments(sortedEnvironments);
        return false;
    }
  };

  // Worklog Actions
  const saveWorklog = async (worklog: Omit<Worklog, 'id'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
        const { date, employeeId, ...rest } = worklog;
        const worklogId = `${employeeId}-${date}`;
        const worklogRef = doc(db, 'projects', projectId, 'worklogs', worklogId);

        const payload = {
            ...rest,
            employeeId,
            date: Timestamp.fromDate(new Date(date)),
        };

        await setDoc(worklogRef, sanitizeForFirestore(payload), { merge: true });
        return true;
    } catch(e) {
        console.error("Firebase Error: Failed to save worklog.", e);
        return false;
    }
  };
  

  // Document Actions
  const addDocument = async (docData: Omit<ProjectDocument, 'id' | 'createdAt'>) => {
    if (!db || !projectId) return false;
    try {
        await addDoc(collection(db, 'projects', projectId, 'documents'), {
            ...docData,
            createdAt: Timestamp.now(),
        });
        return true;
    } catch(e) {
        console.error("Failed to add document", e);
        return false;
    }
  };
  const updateDocument = async (docId: string, data: Partial<Omit<ProjectDocument, 'id' | 'createdAt'>>) => {
    if (!db || !projectId) return false;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'documents', docId), data);
      return true;
    } catch (e) {
      console.error("Failed to update document", e);
      return false;
    }
  };
  const deleteDocument = async (docId: string) => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'documents', docId));
      return true;
    } catch (e) {
      console.error("Failed to delete document", e);
      return false;
    }
  };

  // Payment Milestone actions
    const addPaymentMilestone = async (milestone: Omit<PaymentMilestone, 'id' | 'milestoneId'>): Promise<boolean> => {
        if (!db || !projectId) return false;
        try {
            const snapshot = await getDocs(collection(db, 'projects', projectId, 'paymentMilestones'));
            const newIdNumber = snapshot.size > 0
                ? Math.max(0, ...snapshot.docs
                    .map(doc => doc.data().milestoneId)
                    .filter((id: string | undefined) => id && typeof id === 'string')
                    .map((id: string) => parseInt(id.replace('PM-', ''), 10) || 0)
                ) + 1
                : 1;

            const payload = { ...milestone, milestoneId: `PM-${newIdNumber}` };
            await addDoc(collection(db, 'projects', projectId, 'paymentMilestones'), sanitizeForFirestore(payload));
            return true;
        } catch (e) {
            console.error("Firebase error adding payment milestone", e);
            return false;
        }
    };
    const updatePaymentMilestone = async (milestoneId: string, data: Partial<Omit<PaymentMilestone, 'id' | 'milestoneId'>>) => {
        if (!db || !projectId) return false;
        try {
            await updateDoc(doc(db, 'projects', projectId, 'paymentMilestones', milestoneId), sanitizeForFirestore(data));
            return true;
        } catch (e) {
            console.error("Firebase error updating payment milestone", e);
            return false;
        }
    };
    const deletePaymentMilestone = async (milestoneId: string): Promise<boolean> => {
        if (!db || !projectId) return false;
        try {
            await deleteDoc(doc(db, 'projects', projectId, 'paymentMilestones', milestoneId));
            return true;
        } catch (e) {
            console.error("Firebase error deleting payment milestone", e);
            return false;
        }
    };

  // Code Repository actions
  const addCodeRepository = async (repo: Omit<CodeRepository, 'id'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const { expiryDate, ...rest } = repo;
      const payload: any = { ...rest };
      if (expiryDate) payload.expiryDate = Timestamp.fromDate(new Date(expiryDate));
      await addDoc(collection(db, 'projects', projectId, 'codeRepositories'), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase error adding code repository", e);
      return false;
    }
  };
  const updateCodeRepository = async (repoId: string, data: Partial<Omit<CodeRepository, 'id'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const { expiryDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('expiryDate') && expiryDate) payload.expiryDate = Timestamp.fromDate(new Date(expiryDate));
      else if (data.hasOwnProperty('expiryDate')) payload.expiryDate = null;
      
      await updateDoc(doc(db, 'projects', projectId, 'codeRepositories', repoId), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase error updating code repository", e);
      return false;
    }
  };
  const deleteCodeRepository = async (repoId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'codeRepositories', repoId));
      return true;
    } catch (e) {
      console.error("Firebase error deleting code repository", e);
      return false;
    }
  };
  
  // Fixed Cost Actions
  const addFixedCost = async (cost: Omit<FixedCost, 'id'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await addDoc(collection(db, 'projects', projectId, 'fixedCosts'), cost);
      return true;
    } catch (e) {
      console.error("Firebase error adding fixed cost", e);
      return false;
    }
  };
  const updateFixedCost = async (id: string, data: Partial<Omit<FixedCost, 'id'>>) => {
    if (!db || !projectId) return false;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'fixedCosts', id), data);
      return true;
    } catch (e) {
      console.error("Firebase error updating fixed cost", e);
      return false;
    }
  };
  const deleteFixedCost = async (id: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'fixedCosts', id));
      return true;
    } catch (e) {
      console.error("Firebase error deleting fixed cost", e);
      return false;
    }
  };

  // Trash actions
  const restoreItem = async (id: string, collectionName: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const itemRef = doc(db, 'projects', projectId, collectionName, id);
      await updateDoc(itemRef, { isDeleted: false, deletedAt: null });
      return true;
    } catch (e) {
      console.error(`Firebase Error: Failed to restore item from ${collectionName}.`, e);
      return false;
    }
  };

  const permanentlyDeleteItem = async (id: string, collectionName: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const itemRef = doc(db, 'projects', projectId, collectionName, id);
      await deleteDoc(itemRef);
      return true;
    } catch (e) {
      console.error(`Firebase Error: Failed to permanently delete item from ${collectionName}.`, e);
      return false;
    }
  };


  const employeesWithGlobalLeaves = useMemo(() => {
    return employees.map(emp => {
      const globalUser = allUsers.find(u => u.id === emp.id);
      return {
        ...emp,
        leavePeriods: globalUser?.leavePeriods || []
      };
    });
  }, [employees, allUsers]);

  const value: ProjectContextType = {
    project,
    epics,
    stories: pathname.endsWith('/trash') ? stories : stories.filter(s => !s.isDeleted),
    sprints,
    employees: employeesWithGlobalLeaves,
    allUsers,
    testCases: pathname.endsWith('/trash') ? testCases : testCases.filter(tc => !tc.isDeleted),
    risks: pathname.endsWith('/trash') ? risks : risks.filter(r => !r.isDeleted),
    assumptions: pathname.endsWith('/trash') ? assumptions : assumptions.filter(a => !a.isDeleted),
    issues: pathname.endsWith('/trash') ? issues : issues.filter(i => !i.isDeleted),
    dependencies: pathname.endsWith('/trash') ? dependencies : dependencies.filter(d => !d.isDeleted),
    documents,
    paymentMilestones,
    kanbanColumns,
    holidays,
    releasesAndMilestones,
    worklogs,
    worklogSubmissions,
    projectSettings,
    weeklyOffDays,
    impactedSystems,
    horizontals,
    initialImpactedSystems,
    initialHorizontals,
    fixedCosts,
    environments,
    codeRepositories,
    testPlans,
    testDate,
    setTestDate,
    isLoading,
    error,
    updateProject,
    addStory,
    autoGenerateStories,
    updateStory,
    deleteStory,
    moveStoryToSprint,
    moveStoryStatus,
    moveStoryToEpic,
    bulkUpdateSubTaskReleases,
    bulkDeleteStories,
    bulkMoveStories,
    bulkAssignSubTasks,
    addEpic,
    updateEpic,
    deleteEpic,
    addSprint,
    updateSprint,
    deleteSprint,
    addLeavePeriod,
    deleteLeavePeriod,
    addUserToProject,
    updateProjectUser,
    deleteEmployee,
    addTestCase,
    updateTestCase,
    autoGenerateTestCases,
    deleteTestCase,
    addTestPlan,
    updateTestPlan,
    deleteTestPlan,
    testPlanTestCases,
    addTestCasesToPlan,
    updateTestPlanTestCase,
    removeTestCasesFromPlan,
    subscribeToTestPlanTestCases,

    addRisk,
    updateRisk,
    deleteRisk,
    autoGenerateRisks,
    addAssumption,
    updateAssumption,
    deleteAssumption,
    autoGenerateAssumptions,
    addIssue,
    updateIssue,
    deleteIssue,

    addDependency,
    updateDependency,
    deleteDependency,
    autoGenerateDependencies,
    addReleaseOrMilestone,
    updateReleaseOrMilestone,
    deleteReleaseOrMilestone,
    addKanbanColumn,
    updateKanbanColumn,
    deleteKanbanColumn,
    updateKanbanColumnOrder,
    updateProjectSettings,
    setWeeklyOffDays,
    updateSprintSettings,
    updateEffortSettings,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addImpactedSystem,
    updateImpactedSystem,
    deleteImpactedSystem,
    replaceImpactedSystems,
    addInitialImpactedSystem,
    updateInitialImpactedSystem,
    deleteInitialImpactedSystem,
    replaceInitialImpactedSystems,
    addInitialHorizontal,
    updateInitialHorizontal,
    deleteInitialHorizontal,
    replaceInitialHorizontals,
    confirmInitialEstimation,
    addHorizontal,
    updateHorizontal,
    deleteHorizontal,
    replaceHorizontals,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    updateEnvironmentOrder,
    saveWorklog,

    addDocument,
    updateDocument,
    deleteDocument,
    addPaymentMilestone,
    updatePaymentMilestone,
    deletePaymentMilestone,
    addCodeRepository,
    updateCodeRepository,
    deleteCodeRepository,
    addFixedCost,
    updateFixedCost,
    deleteFixedCost,
    restoreItem,
    permanentlyDeleteItem,
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading project data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-8">
        <div className="max-w-2xl rounded-lg border border-destructive bg-destructive/10 p-6 text-center text-destructive">
          <h2 className="text-2xl font-bold">Database Connection Error</h2>
          <p className="mt-2 text-destructive/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

import { FirebaseProjectProvider } from './FirebaseProjectProvider';
import { PostgresProjectProvider } from './PostgresProjectProvider';

export function ProjectProvider({ children, projectId }: PropsWithChildren<{ projectId: string }>) {
   const isPostgres = process.env.NEXT_PUBLIC_DB_PROVIDER === 'postgres';
   if (isPostgres) {
       return <PostgresProjectProvider projectId={projectId}>{children}</PostgresProjectProvider>;
   }
   return <FirebaseProjectProvider projectId={projectId}>{children}</FirebaseProjectProvider>;
}
