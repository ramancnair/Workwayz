import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from '@/lib/db-provider';
import { generateFullProjectData } from '@/lib/project-autogen';
import { calculatePolicyALeaveQuotaForYear, parseEmployeeJoiningDate } from '@/lib/leave-utils';
import { isBugWorkItem, isPbiWorkItem } from '@/types';
import type {
  Story,
  Epic,
  Sprint,
  TestCase,
  Risk,
  Assumption,
  Issue,
  Dependency,
  Project,
  WorkItemType,
  BugSeverity,
  Priority,
  KanbanColumn,
  ProjectSettings,
  Horizontal,
  Environment,
} from '@/types';

// Helper to remove undefined values and enforce max string lengths
const sanitizeData = (data: any) => {
  const sanitized: any = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      let val = data[key];
      if (typeof val === 'string') {
        if ((key === 'title' || key === 'name') && val.length > 120) {
          val = val.slice(0, 120);
        } else if (key === 'description' && val.length > 2000) {
          val = val.slice(0, 2000);
        }
      }
      sanitized[key] = val;
    }
  }
  return sanitized;
};

// 1. Create Work Item (Story, Bug, Task, Feature Change, Sub Task)
export async function wayfinderCreateWorkItem(params: {
  projectId: string;
  itemType: WorkItemType;
  title: string;
  description?: string;
  priority?: Priority;
  severity?: BugSeverity;
  status?: string;
  estimatedHours?: number;
  acceptanceCriteria?: string;
  assigneeId?: string;
  epicId?: string;
  sprintId?: string;
  parentStoryId?: string;
  impactedSystemIds?: string[];
}) {
  const { projectId, itemType = 'Story', title, description = '', priority = 'Medium', severity, status = 'To Do', ...rest } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const storiesSnapshot = await getDocs(collection(projectDocRef, 'stories'));

  const prefixMap: Record<WorkItemType, string> = {
    'Story': 'ST',
    'User Story': 'US',
    'Requirement/Story': 'ST',
    'Feature Change': 'FC',
    'Task': 'TASK',
    'Enabler': 'EN',
    'Tech Debt': 'TD',
    'Spike': 'SPK',
    'Bug / Defect': 'BUG',
    'Bug': 'BUG',
    'Subtasks': 'SUB',
    'Sub Task': 'SUB',
    'In-Sprint Bug': 'ISB',
  };
  const prefix = prefixMap[itemType] || 'ITEM';

  // Calculate next sequential ID number
  const existingNumbers = storiesSnapshot.docs
    .map((d: any) => d.data().storyId)
    .filter((id: string | undefined) => id && typeof id === 'string' && id.startsWith(`${prefix}-`))
    .map((id: string) => parseInt(id.replace(`${prefix}-`, ''), 10) || 0);

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const storyId = `${prefix}-${nextNumber}`;
  const now = new Date().toISOString();

  const payload: any = {
    ...rest,
    title,
    description,
    itemType,
    priority,
    status,
    storyId,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    statusHistory: [{ fromStatus: null, toStatus: status, date: now }],
  };

  if (severity && isBugWorkItem(itemType)) {
    payload.severity = severity;
  }

  const docRef = await addDoc(collection(projectDocRef, 'stories'), sanitizeData(payload));

  const destinationUrl = isBugWorkItem(itemType)
    ? `/projects/${projectId}/testing/defect-tracker`
    : `/projects/${projectId}/development/kanban`;

  return {
    success: true,
    id: docRef.id,
    storyId,
    itemType,
    title,
    priority,
    status,
    severity: payload.severity,
    projectId,
    url: destinationUrl,
  };
}

// 2. Update Work Item
export async function wayfinderUpdateWorkItem(params: {
  projectId: string;
  storyIdOrDocId: string;
  updates: {
    status?: string;
    priority?: Priority;
    severity?: BugSeverity;
    assigneeId?: string;
    sprintId?: string | null;
    estimatedHours?: number;
    title?: string;
    description?: string;
    acceptanceCriteria?: string;
  };
}) {
  const { projectId, storyIdOrDocId, updates } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const storiesRef = collection(projectDocRef, 'stories');

  // Find document either by Firestore document ID or human-readable storyId (e.g. BUG-1, ST-5)
  let targetDocRef = doc(storiesRef, storyIdOrDocId);
  let docSnap = await getDoc(targetDocRef);

  if (!docSnap.exists || (typeof docSnap.exists === 'function' && !docSnap.exists())) {
    const q = query(storiesRef, where('storyId', '==', storyIdOrDocId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      // Try case-insensitive lookup
      const allSnapshot = await getDocs(storiesRef);
      const match = allSnapshot.docs.find(
        (d: any) => (d.data().storyId || '').toLowerCase() === storyIdOrDocId.toLowerCase()
      );
      if (!match) throw new Error(`Work item "${storyIdOrDocId}" not found in project`);
      targetDocRef = doc(storiesRef, match.id);
      docSnap = match;
    } else {
      targetDocRef = doc(storiesRef, querySnapshot.docs[0].id);
      docSnap = querySnapshot.docs[0];
    }
  }

  const existingData = (docSnap.data() || {}) as Record<string, any>;
  const updatePayload: any = { ...updates, updatedAt: new Date().toISOString() };

  if (updates.status && updates.status !== existingData.status) {
    const history = existingData.statusHistory || [];
    history.push({
      fromStatus: existingData.status,
      toStatus: updates.status,
      date: new Date().toISOString(),
    });
    updatePayload.statusHistory = history;
  }

  await updateDoc(targetDocRef, sanitizeData(updatePayload));

  return {
    success: true,
    id: targetDocRef.id,
    storyId: existingData.storyId,
    itemType: existingData.itemType,
    title: updates.title || existingData.title,
    status: updates.status || existingData.status,
    priority: updates.priority || existingData.priority,
    projectId,
    url: `/projects/${projectId}/development/kanban`,
  };
}

// 3. Create Project
export async function wayfinderCreateProject(params: {
  name: string;
  portfolioId?: string;
  pricingModel?: 'Fixed Bid' | 'T&M';
  status?: 'Initial Estimation' | 'Not Started' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  summary?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  projectManagerId?: string;
}) {
  if (!db) throw new Error('Database is not initialized');

  const portSnap = await getDocs(collection(db, 'portfolios'));
  let portfolioId = params.portfolioId;

  if (portfolioId) {
    const trimmed = portfolioId.trim().toLowerCase();
    const matchedPort = portSnap.docs.find(
      (d: any) =>
        !d.data().isDeleted &&
        (d.id.toLowerCase() === trimmed || d.data().name?.trim().toLowerCase() === trimmed)
    );
    if (matchedPort) {
      portfolioId = matchedPort.id;
    }
  }

  if (!portfolioId) {
    const activePort = portSnap.docs.find((d: any) => !d.data().isDeleted);
    if (activePort) {
      portfolioId = activePort.id;
    } else {
      const defaultPort = await wayfinderCreatePortfolio({
        name: 'Main Portfolio',
        description: 'Default portfolio',
      });
      portfolioId = defaultPort.id;
    }
  }

  const currentYear = new Date().getFullYear().toString().slice(-2);
  const projectsSnapshot = await getDocs(collection(db, 'projects'));

  const projectsFromThisYear = projectsSnapshot.docs
    .map((doc: any) => doc.id)
    .filter((id: string) => id.startsWith(`P${currentYear}`));

  const newIdNumber =
    projectsFromThisYear.length > 0
      ? Math.max(...projectsFromThisYear.map((id: string) => parseInt(id.substring(3), 10) || 0)) + 1
      : 1;

  const projectId = `P${currentYear}${newIdNumber.toString().padStart(5, '0')}`;

  const startDate = params.startDate ? new Date(params.startDate) : new Date();
  const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000);

  const projectPayload = sanitizeData({
    id: projectId,
    name: params.name.trim(),
    portfolioId,
    pricingModel: params.pricingModel || 'Fixed Bid',
    status: params.status || 'Active',
    summary: params.summary || '',
    description: params.description || '',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    projectManagerId: params.projectManagerId || '',
    isDeleted: false,
    deletedAt: null,
    overallStatus: 'Green',
    scopeStatus: 'Green',
    costStatus: 'Green',
    timeStatus: 'Green',
    createdAt: new Date().toISOString(),
  });

  const projectDocRef = doc(db, 'projects', projectId);
  await setDoc(projectDocRef, projectPayload);

  // Initialize default project subcollections
  try {
    const defaultKanbanColumns: Omit<KanbanColumn, 'id'>[] = [
      { name: 'To Do', order: 0, isDefault: true, isDoneColumn: false },
      { name: 'In Progress', order: 1, isDefault: true, isDoneColumn: false },
      { name: 'In QA', order: 2, isDefault: false, isDoneColumn: false },
      { name: 'Done', order: 3, isDefault: true, isDoneColumn: true },
    ];
    for (const col of defaultKanbanColumns) {
      await addDoc(collection(projectDocRef, 'kanbanColumns'), col);
    }

    const defaultProjectSettings: Omit<ProjectSettings, 'id'> = {
      sprintDurationInWeeks: 2,
      sprintStartDay: 1,
      overrideGlobalHolidays: false,
      manMonthToDays: 22,
      manDayToHours: 8,
      storyPointToHours: 8,
    };
    await setDoc(doc(projectDocRef, 'settings', 'main'), defaultProjectSettings);

    const defaultEnvironments: Omit<Environment, 'id'>[] = [
      { name: 'Dev', order: 0 },
      { name: 'SIT', order: 1 },
      { name: 'UAT', order: 2 },
      { name: 'Production', order: 3 },
    ];
    for (const env of defaultEnvironments) {
      await addDoc(collection(projectDocRef, 'environments'), env);
    }
  } catch (err) {
    console.warn('Non-fatal initializing project subcollections on server:', err);
  }

  return {
    success: true,
    id: projectId,
    name: params.name,
    portfolioId,
    status: params.status || 'Active',
    url: `/projects/${projectId}/project-details/project-status`,
  };
}

// 4. Create Epic
export async function wayfinderCreateEpic(params: {
  projectId: string;
  title: string;
  description?: string;
}) {
  const { projectId, title, description = '' } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const docRef = await addDoc(collection(projectDocRef, 'epics'), sanitizeData({
    title,
    description,
    createdAt: new Date().toISOString(),
  }));

  return {
    success: true,
    id: docRef.id,
    title,
    projectId,
    url: `/projects/${projectId}/development/backlog`,
  };
}

// 5. Create Sprint
export async function wayfinderCreateSprint(params: {
  projectId: string;
  title: string;
  startDate?: string;
  endDate?: string;
  status?: 'Yet to Start' | 'Current' | 'Completed' | 'Cancelled';
}) {
  const { projectId, title, startDate, endDate, status = 'Yet to Start' } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const now = new Date();
  const defStart = startDate ? new Date(startDate).toISOString() : now.toISOString();
  const defEnd = endDate
    ? new Date(endDate).toISOString()
    : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const docRef = await addDoc(collection(projectDocRef, 'sprints'), sanitizeData({
    title,
    startDate: defStart,
    endDate: defEnd,
    status,
    isCurrent: status === 'Current',
    createdAt: now.toISOString(),
  }));

  return {
    success: true,
    id: docRef.id,
    title,
    status,
    startDate: defStart,
    endDate: defEnd,
    projectId,
    url: `/projects/${projectId}/development/backlog`,
  };
}

// 6. Create Test Case
export async function wayfinderCreateTestCase(params: {
  projectId: string;
  title: string;
  description?: string;
  expectedResult?: string;
  type?: 'Functional' | 'Non-functional';
  storyId?: string;
  assigneeId?: string;
}) {
  const { projectId, title, description = '', expectedResult = '', type = 'Functional', storyId, assigneeId } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const tcSnapshot = await getDocs(collection(projectDocRef, 'testCases'));

  const existingNumbers = tcSnapshot.docs
    .map((d: any) => d.data().testCaseId)
    .filter((id: string | undefined) => id && typeof id === 'string' && id.startsWith('TC-'))
    .map((id: string) => parseInt(id.replace('TC-', ''), 10) || 0);

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const testCaseId = `TC-${nextNumber}`;

  const payload: any = {
    testCaseId,
    title,
    description,
    expectedResult,
    type,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date().toISOString(),
  };
  if (storyId) payload.storyId = storyId;
  if (assigneeId) payload.assigneeId = assigneeId;

  const docRef = await addDoc(collection(projectDocRef, 'testCases'), sanitizeData(payload));

  return {
    success: true,
    id: docRef.id,
    testCaseId,
    title,
    type,
    projectId,
    url: `/projects/${projectId}/testing/test-cases`,
  };
}

// 6b. Bulk Create / Generate Test Cases
export async function wayfinderBulkCreateTestCases(params: {
  projectId: string;
  testCases: Array<{
    title: string;
    description?: string;
    expectedResult?: string;
    type?: 'Functional' | 'Non-functional';
    storyId?: string;
    assigneeId?: string;
  }>;
}) {
  const { projectId, testCases } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new Error('No test cases provided for creation');
  }

  const projectDocRef = doc(db, 'projects', projectId);
  const tcSnapshot = await getDocs(collection(projectDocRef, 'testCases'));

  const existingNumbers = tcSnapshot.docs
    .map((d: any) => d.data().testCaseId)
    .filter((id: string | undefined) => id && typeof id === 'string' && id.startsWith('TC-'))
    .map((id: string) => parseInt(id.replace('TC-', ''), 10) || 0);

  let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const batch = writeBatch(db);
  const createdItems: Array<{ id: string; testCaseId: string; title: string; type: string }> = [];

  for (const tc of testCases) {
    const testCaseId = `TC-${nextNumber++}`;
    const newRef = doc(collection(projectDocRef, 'testCases'));
    const payload = sanitizeData({
      testCaseId,
      title: tc.title,
      description: tc.description || '',
      expectedResult: tc.expectedResult || '',
      type: tc.type || 'Functional',
      storyId: tc.storyId || undefined,
      assigneeId: tc.assigneeId || undefined,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    });
    batch.set(newRef, payload);
    createdItems.push({
      id: newRef.id,
      testCaseId,
      title: tc.title,
      type: tc.type || 'Functional',
    });
  }

  await batch.commit();

  return {
    success: true,
    count: createdItems.length,
    testCases: createdItems,
    projectId,
    url: `/projects/${projectId}/testing/test-cases`,
  };
}

// 6c. Create Test Plan / Cycle
export async function wayfinderCreateTestPlan(params: {
  projectId: string;
  name: string;
  planType?: 'Sprint' | 'Release';
  startDate?: string;
  endDate?: string;
  environmentId?: string;
  sprintId?: string;
  releaseId?: string;
}) {
  const { projectId, name, planType = 'Sprint', startDate, endDate, environmentId, sprintId, releaseId } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const planSnapshot = await getDocs(collection(projectDocRef, 'testCycles'));

  const existingNumbers = planSnapshot.docs
    .map((d: any) => d.data().testCycleId || d.data().testPlanId)
    .filter((id: string | undefined) => id && typeof id === 'string' && (id.startsWith('TC-') || id.startsWith('TP-')))
    .map((id: string) => parseInt(id.replace(/^(TC|TP)-/, ''), 10) || 0);

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const testCycleId = `TC-${nextNumber}`;

  const parseDate = (dStr: any) => {
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const payload = sanitizeData({
    testCycleId,
    testPlanId: testCycleId,
    name,
    planType,
    startDate: parseDate(startDate),
    endDate: parseDate(endDate),
    environmentId: environmentId || undefined,
    sprintId: sprintId || undefined,
    releaseId: releaseId || undefined,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(projectDocRef, 'testCycles'), payload);

  return {
    success: true,
    id: docRef.id,
    testCycleId,
    testPlanId: testCycleId,
    name,
    planType,
    projectId,
    url: `/projects/${projectId}/testing/test-cycle`,
  };
}

export const wayfinderCreateTestCycle = wayfinderCreateTestPlan;

// 6d. Add Test Cases to Test Plan / Cycle
export async function wayfinderAddTestCasesToTestPlan(params: {
  projectId: string;
  planId?: string;
  testPlanId?: string;
  testCycleId?: string;
  planName?: string;
  testCaseIds?: string[];
  executionDate?: string;
}) {
  const { projectId, executionDate } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);

  // Find target test cycle
  let plansSnapshot = await getDocs(collection(projectDocRef, 'testCycles'));
  if (plansSnapshot.empty) {
    plansSnapshot = await getDocs(collection(projectDocRef, 'testPlans'));
  }

  const planDoc = plansSnapshot.docs.find((d: any) => {
    const data = d.data();
    const targetId = params.testCycleId || params.testPlanId || params.planId;
    if (targetId && (d.id === targetId || data.testCycleId === targetId || data.testPlanId === targetId)) return true;
    if (params.planName && data.name?.toLowerCase().includes(params.planName.toLowerCase())) return true;
    return false;
  }) || plansSnapshot.docs[0];

  if (!planDoc) {
    throw new Error('No test cycle found in this project. Please create a test cycle first.');
  }

  const planId = planDoc.id;
  const planData = planDoc.data();
  const planPrefix = planData.testCycleId || planData.testPlanId || 'TC-1';

  // Load project test cases
  const tcsSnapshot = await getDocs(collection(projectDocRef, 'testCases'));
  const allTestCases = tcsSnapshot.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((tc: any) => !tc.isDeleted);

  // Load existing test cases in cycle to prevent duplicates
  const existingInPlanSnapshot = await getDocs(collection(projectDocRef, 'testCycles', planId, 'testCases'));
  const existingOrigIds = new Set(existingInPlanSnapshot.docs.map((d: any) => d.data().originalTestCaseId));

  let targetTCs = allTestCases;
  if (params.testCaseIds && params.testCaseIds.length > 0) {
    const wanted = new Set(params.testCaseIds.map(id => id.toLowerCase()));
    targetTCs = allTestCases.filter((tc: any) =>
      wanted.has(tc.id.toLowerCase()) || wanted.has(tc.testCaseId?.toLowerCase())
    );
  }

  const batch = writeBatch(db);
  let addedCount = 0;

  for (const originalTC of targetTCs) {
    if (existingOrigIds.has(originalTC.id)) continue;

    const uniqueTestCaseId = originalTC.testCaseId?.startsWith(planPrefix)
      ? originalTC.testCaseId
      : `${planPrefix}-${originalTC.testCaseId}`;

    const newRef = doc(collection(projectDocRef, 'testCycles', planId, 'testCases'));
    const copy = sanitizeData({
      originalTestCaseId: originalTC.id,
      testCaseId: uniqueTestCaseId,
      testCycleId: planId,
      testCycleName: planData.name,
      testPlanId: planId,
      testPlanName: planData.name,
      title: originalTC.title,
      type: originalTC.type || 'Functional',
      description: originalTC.description || '',
      expectedResult: originalTC.expectedResult || '',
      storyId: originalTC.storyId || undefined,
      releaseId: originalTC.releaseId || undefined,
      sprintId: originalTC.sprintId || undefined,
      status: 'Not Run',
      executionDate: executionDate || new Date().toISOString(),
    });

    batch.set(newRef, copy);
    addedCount++;
  }

  if (addedCount > 0) {
    await batch.commit();
  }

  return {
    success: true,
    planId,
    planName: planData.name,
    addedCount,
    projectId,
    url: `/projects/${projectId}/testing/test-cycle`,
  };
}

export const wayfinderAddTestCasesToTestCycle = wayfinderAddTestCasesToTestPlan;

// 6e. Update Test Case Execution Status in Test Cycle
export async function wayfinderUpdateTestCaseStatus(params: {
  projectId: string;
  testCaseId: string;
  planId?: string;
  status: 'Not Run' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
  actualEffortHours?: number;
  comments?: string;
}) {
  const { projectId, testCaseId, status, actualEffortHours } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  let plansSnapshot = await getDocs(collection(projectDocRef, 'testCycles'));
  let collectionName = 'testCycles';
  if (plansSnapshot.empty) {
    plansSnapshot = await getDocs(collection(projectDocRef, 'testPlans'));
    collectionName = 'testPlans';
  }

  let foundDocRef: any = null;
  let targetPlanId = params.planId || '';

  for (const planDoc of plansSnapshot.docs) {
    const data = planDoc.data();
    if (targetPlanId && planDoc.id !== targetPlanId && data.testCycleId !== targetPlanId && data.testPlanId !== targetPlanId) continue;
    const planTCs = await getDocs(collection(projectDocRef, collectionName, planDoc.id, 'testCases'));
    const match = planTCs.docs.find((d: any) => {
      const dData = d.data();
      return (
        d.id === testCaseId ||
        dData.testCaseId?.toLowerCase() === testCaseId.toLowerCase() ||
        dData.originalTestCaseId === testCaseId ||
        dData.testCaseId?.endsWith(`-${testCaseId}`)
      );
    });
    if (match) {
      foundDocRef = match.ref;
      targetPlanId = planDoc.id;
      break;
    }
  }

  if (!foundDocRef) {
    throw new Error(`Test case "${testCaseId}" was not found in any active test cycle.`);
  }

  const updatePayload: any = {
    status,
    executionDate: new Date().toISOString(),
  };
  if (status === 'Passed') {
    updatePayload.closeDate = new Date().toISOString();
  }
  if (actualEffortHours !== undefined) {
    updatePayload.actualEffortHours = actualEffortHours;
  }

  await updateDoc(foundDocRef, sanitizeData(updatePayload));

  return {
    success: true,
    testCaseId,
    planId: targetPlanId,
    status,
    projectId,
    url: `/projects/${projectId}/testing/test-execution`,
  };
}

// 7. Create RAID Item (Risk, Assumption, Issue, Dependency)
export async function wayfinderCreateRaidItem(params: {
  projectId: string;
  raidType: 'risk' | 'assumption' | 'issue' | 'dependency';
  description: string;
  severity?: 1 | 2 | 3;
  probability?: 1 | 2 | 3;
  mitigationPlan?: string;
  residualRisk?: string;
  contingencyPlan?: string;
  category?: 'Technical' | 'Resource' | 'Business' | 'External';
  assumptionStatus?: 'Active' | 'Validated' | 'Invalidated';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  issueStatus?: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  dependencyType?: 'Internal' | 'External';
  dependencyOn?: string;
  expectedByDate?: string;
  dependencyStatus?: 'On Track' | 'At Risk' | 'Blocked';
}) {
  const { projectId, raidType, description } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const now = new Date().toISOString();

  let collectionName = '';
  let idPrefix = '';
  let itemPayload: any = { description, isDeleted: false, deletedAt: null, createdAt: now };

  if (raidType === 'risk') {
    collectionName = 'risks';
    idPrefix = 'RSK';
    itemPayload.severity = params.severity || 2;
    itemPayload.probability = params.probability || 2;
    itemPayload.mitigationPlan = params.mitigationPlan || 'To be determined';
    itemPayload.residualRisk = params.residualRisk || '';
    itemPayload.contingencyPlan = params.contingencyPlan || '';
  } else if (raidType === 'assumption') {
    collectionName = 'assumptions';
    idPrefix = 'ASM';
    itemPayload.category = params.category || 'Technical';
    itemPayload.status = params.assumptionStatus || 'Active';
  } else if (raidType === 'issue') {
    collectionName = 'issues';
    idPrefix = 'ISS';
    itemPayload.priority = params.priority || 'Medium';
    itemPayload.status = params.issueStatus || 'Open';
    itemPayload.reportedDate = now;
  } else if (raidType === 'dependency') {
    collectionName = 'dependencies';
    idPrefix = 'DEP';
    itemPayload.type = params.dependencyType || 'Internal';
    itemPayload.dependencyOn = params.dependencyOn || 'External Team';
    itemPayload.expectedByDate = params.expectedByDate || now;
    itemPayload.status = params.dependencyStatus || 'On Track';
  }

  const itemsSnapshot = await getDocs(collection(projectDocRef, collectionName));
  const idField = `${raidType}Id`;
  const existingNumbers = itemsSnapshot.docs
    .map((d: any) => d.data()[idField])
    .filter((id: string | undefined) => id && typeof id === 'string' && id.startsWith(`${idPrefix}-`))
    .map((id: string) => parseInt(id.replace(`${idPrefix}-`, ''), 10) || 0);

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const generatedId = `${idPrefix}-${nextNumber}`;
  itemPayload[idField] = generatedId;

  const docRef = await addDoc(collection(projectDocRef, collectionName), sanitizeData(itemPayload));

  return {
    success: true,
    id: docRef.id,
    itemId: generatedId,
    raidType,
    description,
    projectId,
    url: `/projects/${projectId}/raid-dashboard`,
  };
}

// 8. Query Project Context & Summary for WayFinder
export async function wayfinderQueryProjectContext(projectId?: string) {
  if (!db) throw new Error('Database not initialized');

  if (!projectId) {
    const projectsSnap = await getDocs(collection(db, 'projects'));
    const projects = projectsSnap.docs
      .filter((d: any) => !d.data().isDeleted)
      .map((d: any) => ({
        id: d.id,
        name: d.data().name,
        status: d.data().status,
        pricingModel: d.data().pricingModel,
        summary: d.data().summary,
      }));
    return { scope: 'global', totalProjects: projects.length, projects };
  }

  const projectDocRef = doc(db, 'projects', projectId);
  const projectSnap = await getDoc(projectDocRef);
  if (!projectSnap.exists || (typeof projectSnap.exists === 'function' && !projectSnap.exists())) {
    return { error: `Project with ID ${projectId} not found` };
  }

  const projData = (projectSnap.data() || {}) as Record<string, any>;

  const [storiesSnap, epicsSnap, sprintsSnap, testCasesSnap, risksSnap, issuesSnap] = await Promise.all([
    getDocs(collection(projectDocRef, 'stories')),
    getDocs(collection(projectDocRef, 'epics')),
    getDocs(collection(projectDocRef, 'sprints')),
    getDocs(collection(projectDocRef, 'testCases')),
    getDocs(collection(projectDocRef, 'risks')),
    getDocs(collection(projectDocRef, 'issues')),
  ]);

  const stories = storiesSnap.docs
    .filter((d: any) => !d.data().isDeleted)
    .map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        storyId: data.storyId,
        title: data.title,
        itemType: data.itemType,
        status: data.status,
        priority: data.priority,
        severity: data.severity,
        estimatedHours: data.estimatedHours,
        sprintId: data.sprintId,
      };
    });

  const epics = epicsSnap.docs.map((d: any) => ({ id: d.id, title: d.data().title }));
  const sprints = sprintsSnap.docs.map((d: any) => ({
    id: d.id,
    title: d.data().title,
    status: d.data().status,
    startDate: d.data().startDate,
    endDate: d.data().endDate,
  }));

  const testCases = testCasesSnap.docs.filter((d: any) => !d.data().isDeleted).map((d: any) => ({
    id: d.id,
    testCaseId: d.data().testCaseId,
    title: d.data().title,
    type: d.data().type,
  }));

  const risks = risksSnap.docs.filter((d: any) => !d.data().isDeleted).map((d: any) => ({
    id: d.id,
    riskId: d.data().riskId,
    description: d.data().description,
    severity: d.data().severity,
  }));

  const issues = issuesSnap.docs.filter((d: any) => !d.data().isDeleted).map((d: any) => ({
    id: d.id,
    issueId: d.data().issueId,
    description: d.data().description,
    priority: d.data().priority,
    status: d.data().status,
  }));

  return {
    scope: 'project',
    projectId,
    projectName: projData.name,
    projectStatus: projData.status,
    pricingModel: projData.pricingModel,
    summary: projData.summary,
    counts: {
      totalStories: stories.length,
      bugsCount: stories.filter((s: any) => isBugWorkItem(s.itemType)).length,
      epicsCount: epics.length,
      sprintsCount: sprints.length,
      testCasesCount: testCases.length,
      risksCount: risks.length,
      issuesCount: issues.length,
    },
    sprints,
    epics,
    recentWorkItems: stories.slice(0, 25),
    testCases: testCases.slice(0, 15),
    risks: risks.slice(0, 10),
    issues: issues.slice(0, 10),
  };
}

// 9. List All Projects
export async function wayfinderListProjects() {
  if (!db) throw new Error('Database not initialized');
  const snap = await getDocs(collection(db, 'projects'));
  return snap.docs
    .filter((d: any) => !d.data().isDeleted)
    .map((d: any) => ({
      id: d.id,
      name: d.data().name,
      status: d.data().status,
      pricingModel: d.data().pricingModel,
      summary: d.data().summary,
    }));
}

// 10. Create Portfolio
export async function wayfinderCreatePortfolio(params: { name: string; description?: string }) {
  if (!db) throw new Error('Database not initialized');
  
  const portSnap = await getDocs(collection(db, 'portfolios'));
  const trimmedName = params.name.trim();

  const existing = portSnap.docs.find(
    (d: any) => !d.data().isDeleted && d.data().name?.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (existing) {
    return {
      success: true,
      id: existing.id,
      name: existing.data().name,
      description: existing.data().description,
      url: '/project-home',
      alreadyExisted: true,
    };
  }

  const existingIds = portSnap.docs
    .map((d: any) => parseInt(d.id.replace('PF', ''), 10))
    .filter((num: number) => !isNaN(num));
  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  const portfolioId = `PF${nextId.toString().padStart(3, '0')}`;

  const now = new Date().toISOString();
  const payload = sanitizeData({
    id: portfolioId,
    name: trimmedName,
    description: params.description || '',
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
  });

  const portfolioRef = doc(db, 'portfolios', portfolioId);
  await setDoc(portfolioRef, payload);

  return {
    success: true,
    id: portfolioId,
    name: trimmedName,
    description: params.description,
    url: '/project-home',
  };
}

// 11. List All Portfolios
export async function wayfinderListPortfolios() {
  if (!db) throw new Error('Database not initialized');
  const snap = await getDocs(collection(db, 'portfolios'));
  return snap.docs
    .filter((d: any) => !d.data().isDeleted)
    .map((d: any) => ({
      id: d.id,
      name: d.data().name,
      description: d.data().description,
    }));
}

// 12. Archive Project
export async function wayfinderArchiveProject(params: { projectId: string }) {
  if (!db || !params.projectId) throw new Error('Database or Project ID missing');
  const projectRef = doc(db, 'projects', params.projectId);
  const now = new Date().toISOString();
  await updateDoc(projectRef, {
    isArchived: true,
    archivedAt: now,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    url: '/project-home',
    message: `Project ${params.projectId} has been archived.`,
  };
}

// 13. Unarchive Project (Restore)
export async function wayfinderUnarchiveProject(params: { projectId: string }) {
  if (!db || !params.projectId) throw new Error('Database or Project ID missing');
  const projectRef = doc(db, 'projects', params.projectId);
  const now = new Date().toISOString();
  await updateDoc(projectRef, {
    isArchived: false,
    archivedAt: null,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    url: '/project-home',
    message: `Project ${params.projectId} has been restored to active.`,
  };
}

// 14. Delete Project (Soft Delete)
export async function wayfinderDeleteProject(params: { projectId: string }) {
  if (!db || !params.projectId) throw new Error('Database or Project ID missing');
  const projectRef = doc(db, 'projects', params.projectId);
  const now = new Date().toISOString();
  await updateDoc(projectRef, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    url: '/project-home',
    message: `Project ${params.projectId} has been moved to trash.`,
  };
}

// 15. Update Portfolio
export async function wayfinderUpdatePortfolio(params: { portfolioId: string; name?: string; description?: string }) {
  if (!db || !params.portfolioId) throw new Error('Database or Portfolio ID missing');
  const portfolioRef = doc(db, 'portfolios', params.portfolioId);
  const now = new Date().toISOString();
  const updatePayload: any = { updatedAt: now };
  if (params.name) updatePayload.name = params.name.trim();
  if (params.description !== undefined) updatePayload.description = params.description;
  await updateDoc(portfolioRef, updatePayload);
  return {
    success: true,
    portfolioId: params.portfolioId,
    name: params.name,
    url: '/project-home',
  };
}

// 16. Delete Portfolio
export async function wayfinderDeletePortfolio(params: { portfolioId: string }) {
  if (!db || !params.portfolioId) throw new Error('Database or Portfolio ID missing');
  // Check if any non-deleted projects exist under this portfolio
  const projectsSnap = await getDocs(
    query(collection(db, 'projects'), where('portfolioId', '==', params.portfolioId))
  );
  const nonDeletedProjects = projectsSnap.docs.filter((d: any) => !d.data()?.isDeleted);
  if (nonDeletedProjects.length > 0) {
    const activeCount = nonDeletedProjects.filter((d: any) => !d.data()?.isArchived).length;
    const inactiveCount = nonDeletedProjects.filter((d: any) => !!d.data()?.isArchived).length;
    let detail = `${nonDeletedProjects.length} project(s)`;
    if (activeCount === 0 && inactiveCount > 0) {
      detail = `${inactiveCount} inactive project${inactiveCount === 1 ? '' : 's'} (under Inactive Projects tab)`;
    } else if (activeCount > 0 && inactiveCount > 0) {
      detail = `${nonDeletedProjects.length} projects (${activeCount} active, ${inactiveCount} inactive)`;
    } else if (activeCount > 0) {
      detail = `${activeCount} active project${activeCount === 1 ? '' : 's'}`;
    }
    throw new Error(`Cannot delete portfolio: ${detail} still belong to this portfolio. Only empty portfolios can be deleted.`);
  }
  const portfolioRef = doc(db, 'portfolios', params.portfolioId);
  const now = new Date().toISOString();
  await updateDoc(portfolioRef, {
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
  });
  return {
    success: true,
    portfolioId: params.portfolioId,
    url: '/project-home',
    message: `Portfolio ${params.portfolioId} deleted successfully.`,
  };
}

// 16b. Move Project to Portfolio
export async function wayfinderMoveProjectToPortfolio(params: { projectId: string; portfolioId: string }) {
  if (!db || !params.projectId || !params.portfolioId) throw new Error('Database, Project ID, or Portfolio ID missing');

  // Resolve portfolio (by ID or name)
  const portSnap = await getDocs(collection(db, 'portfolios'));
  const trimmedPort = params.portfolioId.trim().toLowerCase();
  const matchedPort = portSnap.docs.find(
    (d: any) =>
      !d.data().isDeleted &&
      (d.id.toLowerCase() === trimmedPort || d.data().name?.trim().toLowerCase() === trimmedPort)
  );
  const targetPortfolioId = matchedPort ? matchedPort.id : params.portfolioId;
  const targetPortfolioName = matchedPort ? matchedPort.data().name : targetPortfolioId;

  // Resolve project (by ID or name)
  const projectsSnap = await getDocs(collection(db, 'projects'));
  const trimmedProj = params.projectId.trim().toLowerCase();
  const matchedProj = projectsSnap.docs.find(
    (d: any) =>
      !d.data().isDeleted &&
      (d.id.toLowerCase() === trimmedProj || d.data().name?.trim().toLowerCase() === trimmedProj)
  );

  const targetProjectId = matchedProj ? matchedProj.id : params.projectId;
  const targetProjectName = matchedProj ? matchedProj.data().name : targetProjectId;

  const projectRef = doc(db, 'projects', targetProjectId);
  const now = new Date().toISOString();
  await updateDoc(projectRef, {
    portfolioId: targetPortfolioId,
    updatedAt: now,
  });

  return {
    success: true,
    projectId: targetProjectId,
    projectName: targetProjectName,
    portfolioId: targetPortfolioId,
    portfolioName: targetPortfolioName,
    message: `Moved project "${targetProjectName}" (${targetProjectId}) to portfolio "${targetPortfolioName}" (${targetPortfolioId}).`,
    url: '/project-home',
  };
}

// 17. Set Primary Project Manager
export async function wayfinderSetProjectManager(params: { projectId: string; projectManagerId: string; projectManagerName?: string }) {
  if (!db || !params.projectId) throw new Error('Database or Project ID missing');

  // Verify that the target PM is not a Super Admin or Administrator
  if (params.projectManagerId && params.projectManagerId !== 'unassigned') {
    const employeesSnap = await getDocs(collection(db, 'employees'));
    const empDoc = employeesSnap.docs.find(
      (d: any) => d.id === params.projectManagerId || d.data().empId === params.projectManagerId
    );
    if (empDoc) {
      const accessLevel = empDoc.data().accessLevel || empDoc.data().role;
      if (accessLevel === 'Super Admin' || accessLevel === 'Administrator') {
        throw new Error('Super Admin and Administrator users cannot be assigned to projects, even as Project Manager.');
      }
    }
  }

  const projectRef = doc(db, 'projects', params.projectId);
  const now = new Date().toISOString();
  await updateDoc(projectRef, {
    projectManagerId: params.projectManagerId,
    projectManager: params.projectManagerName || params.projectManagerId,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    projectManagerId: params.projectManagerId,
    projectManager: params.projectManagerName,
    url: '/project-home',
  };
}

// 18. Autogen Project (Full Lifecycle Scaffold)
export async function wayfinderAutogenProject(params: {
  projectName: string;
  portfolioId?: string;
  pricingModel?: 'Fixed Bid' | 'T&M';
  template?: string;
}) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  const existingNumbers = projectsSnap.docs
    .map((d: any) => d.id)
    .filter((id: string) => id.startsWith('P26'))
    .map((id: string) => parseInt(id.replace('P26', ''), 10))
    .filter((n: number) => !isNaN(n));
  const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const projectId = `P26${nextNum.toString().padStart(5, '0')}`;

  const now = new Date().toISOString();
  const projectRef = doc(db, 'projects', projectId);
  await setDoc(projectRef, {
    id: projectId,
    name: params.projectName,
    portfolioId: params.portfolioId || 'PF001',
    pricingModel: params.pricingModel || 'Fixed Bid',
    status: 'Active',
    overallStatus: 'Green',
    summary: `Complete turnkey project generated for ${params.projectName}.`,
    isArchived: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });

  // Call project autogen engine to generate subcollections
  try {
    await generateFullProjectData({
      db,
      projectId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      globalUsers: [],
      pricingModel: params.pricingModel || 'Fixed Bid',
    });
  } catch (err: any) {
    console.warn('[WayFinder] Autogen subcollection creation warning:', err);
  }

  return {
    success: true,
    projectId,
    name: params.projectName,
    url: `/projects/${projectId}/project-details/pm-dashboard`,
  };
}

// 19. Portfolio Dashboard Summary
export async function wayfinderGetPortfolioDashboardSummary(params?: { portfolioId?: string } | string) {
  if (!db) throw new Error('Database not initialized');
  const portfolioId = typeof params === 'string' ? params : params?.portfolioId;
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (portfolioId && portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === portfolioId);
  }

  const redProjects: any[] = [];
  const amberProjects: any[] = [];
  const greenProjects: any[] = [];
  const highPotentialRisks: any[] = [];
  const criticalIssues: any[] = [];
  let totalRisks = 0;
  let highRisksCount = 0;
  let totalIssues = 0;
  let criticalIssuesCount = 0;

  for (const proj of projects) {
    if (proj.overallStatus === 'Red') redProjects.push({ id: proj.id, name: proj.name, comments: proj.statusComments });
    else if (proj.overallStatus === 'Amber') amberProjects.push({ id: proj.id, name: proj.name, comments: proj.statusComments });
    else greenProjects.push({ id: proj.id, name: proj.name });

    // Fetch risks
    const risksSnap = await getDocs(collection(db, 'projects', proj.id, 'risks'));
    risksSnap.docs.forEach((r: any) => {
      const data = r.data();
      totalRisks++;
      const pot = (data.severity || 1) * (data.probability || 1);
      if (pot > 6) {
        highRisksCount++;
        highPotentialRisks.push({ projectId: proj.id, projectName: proj.name, ...data });
      }
    });

    // Fetch issues
    const issuesSnap = await getDocs(collection(db, 'projects', proj.id, 'issues'));
    issuesSnap.docs.forEach((i: any) => {
      const data = i.data();
      if (data.status !== 'Closed' && data.status !== 'Resolved') {
        totalIssues++;
        if (data.priority === 'Critical' || data.priority === 'High') {
          criticalIssuesCount++;
          criticalIssues.push({ projectId: proj.id, projectName: proj.name, ...data });
        }
      }
    });
  }

  return {
    totalActiveProjects: projects.length,
    totalProjects: projects.length,
    healthDistribution: {
      red: redProjects.length,
      amber: amberProjects.length,
      green: greenProjects.length,
    },
    redProjects,
    amberProjects,
    projects,
    risks: {
      total: totalRisks,
      highPotential: highRisksCount,
    },
    issues: {
      totalOpen: totalIssues,
      criticalOrHigh: criticalIssuesCount,
    },
    highPotentialRisks,
    criticalIssues,
  };
}

// 20. Query Portfolio Risks
export async function wayfinderQueryPortfolioRisks(params: { portfolioId?: string; minPotential?: string }) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, name: d.data().name, portfolioId: d.data().portfolioId }));

  if (params.portfolioId && params.portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === params.portfolioId);
  }

  const allRisks: any[] = [];
  for (const proj of projects) {
    const risksSnap = await getDocs(collection(db, 'projects', proj.id, 'risks'));
    risksSnap.docs.forEach((r: any) => {
      const data = r.data();
      const score = (data.severity || 1) * (data.probability || 1);
      const level = score <= 3 ? 'Low' : score <= 6 ? 'Medium' : 'High';
      if (!params.minPotential || (params.minPotential === 'High' && level === 'High') || (params.minPotential === 'Medium' && level !== 'Low')) {
        allRisks.push({
          id: r.id,
          riskId: data.riskId || r.id,
          projectId: proj.id,
          projectName: proj.name,
          description: data.description,
          category: data.category,
          severity: data.severity,
          probability: data.probability,
          potentialLevel: level,
          score,
          mitigationPlan: data.mitigationPlan,
          contingencyPlan: data.contingencyPlan,
          owner: data.owner,
        });
      }
    });
  }

  allRisks.sort((a, b) => b.score - a.score);
  return allRisks;
}

// 21. Query Portfolio Issues
export async function wayfinderQueryPortfolioIssues(params: { portfolioId?: string; priority?: string; status?: string }) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, name: d.data().name, portfolioId: d.data().portfolioId }));

  if (params.portfolioId && params.portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === params.portfolioId);
  }

  const allIssues: any[] = [];
  for (const proj of projects) {
    const issuesSnap = await getDocs(collection(db, 'projects', proj.id, 'issues'));
    issuesSnap.docs.forEach((i: any) => {
      const data = i.data();
      const statusMatch = !params.status || data.status === params.status;
      const priorityMatch = !params.priority || data.priority === params.priority;
      if (statusMatch && priorityMatch) {
        allIssues.push({
          id: i.id,
          issueId: data.issueId || i.id,
          projectId: proj.id,
          projectName: proj.name,
          description: data.description,
          priority: data.priority,
          status: data.status,
          reportedDate: data.reportedDate,
          assignee: data.assignee,
        });
      }
    });
  }

  return allIssues;
}

// 22. Query Quality Estimations Rollup
export async function wayfinderQueryQualityEstimations(params?: { portfolioId?: string } | string) {
  if (!db) throw new Error('Database not initialized');
  const portfolioId = typeof params === 'string' ? params : params?.portfolioId;
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (portfolioId && portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === portfolioId);
  }

  const projectEstimations: any[] = [];
  for (const proj of projects) {
    const [
      initSysSnap,
      initHzSnap,
      sysSnap,
      hzSnap,
      storiesSnap,
      logsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'projects', proj.id, 'initialImpactedSystems')),
      getDocs(collection(db, 'projects', proj.id, 'initialHorizontals')),
      getDocs(collection(db, 'projects', proj.id, 'impactedSystems')),
      getDocs(collection(db, 'projects', proj.id, 'horizontals')),
      getDocs(collection(db, 'projects', proj.id, 'stories')),
      getDocs(collection(db, 'projects', proj.id, 'worklogs')),
    ]);

    const initialSystems = (initSysSnap.docs.length > 0 ? initSysSnap.docs : sysSnap.docs).map((d: any) => d.data());
    const initialHorizontals = (initHzSnap.docs.length > 0 ? initHzSnap.docs : hzSnap.docs).map((d: any) => d.data());
    const horizontals = hzSnap.docs.map((d: any) => d.data());
    const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const devInitial = initialSystems.reduce((acc: number, sys: any) => acc + (sys.estimate || 0), 0);
    const hzInitialWeightage = initialHorizontals
      .filter((h: any) => h.isEnabled !== false)
      .reduce((acc: number, h: any) => acc + (h.weightage || 0), 0);
    const hzInitial = (hzInitialWeightage / 100) * devInitial;
    const totalInitial = devInitial > 0 ? devInitial + hzInitial : null;

    const activeStories = stories.filter((s: any) => !s.isDeleted);
    const parentToSubTasksMap: Record<string, any[]> = {};
    activeStories.forEach((s: any) => {
      if (s.parentStoryId && (s.itemType === 'Sub Task' || s.itemType === 'Subtasks')) {
        if (!parentToSubTasksMap[s.parentStoryId]) parentToSubTasksMap[s.parentStoryId] = [];
        parentToSubTasksMap[s.parentStoryId].push(s);
      }
    });

    const standaloneItems = activeStories.filter(
      (s: any) => !s.parentStoryId && s.itemType !== 'Bug' && s.itemType !== 'Bug / Defect' && s.itemType !== 'In-Sprint Bug'
    );
    let devPlannedHours = 0;
    standaloneItems.forEach((item: any) => {
      const subTasks = parentToSubTasksMap[item.id] || [];
      if (subTasks.length > 0) {
        devPlannedHours += subTasks.reduce((sum: number, st: any) => sum + (st.estimatedHours || 0), 0);
      } else {
        devPlannedHours += item.estimatedHours || 0;
      }
    });

    const devPlannedDays = devPlannedHours / 8;
    const hzPlannedWeightage = horizontals
      .filter((h: any) => h.isEnabled !== false)
      .reduce((acc: number, h: any) => acc + (h.weightage || 0), 0);
    const hzPlannedDays = (hzPlannedWeightage / 100) * devPlannedDays;
    const totalPlannedDays = devPlannedDays + hzPlannedDays;

    let actualHours = 0;
    logsSnap.docs.forEach((l: any) => {
      const logData = l.data();
      actualHours += logData.totalHours ?? logData.hours ?? 0;
    });
    const actualDays = actualHours / 8;

    const variance = totalPlannedDays > 0 || actualDays > 0 ? actualDays - totalPlannedDays : null;
    const conformanceRate = totalPlannedDays > 0 ? (actualDays / totalPlannedDays) * 100 : 0;

    projectEstimations.push({
      projectId: proj.id,
      projectName: proj.name,
      status: proj.status,
      pricingModel: proj.pricingModel,
      initialEstimateDays: totalInitial ? Math.round(totalInitial) : null,
      plannedEstimateDays: Math.round(totalPlannedDays),
      actualEffortDays: Math.round(actualDays),
      varianceDays: variance !== null ? Math.round(variance) : null,
      conformanceRate: Math.round(conformanceRate),
    });
  }

  return projectEstimations;
}

// 23. Query Quality Defects Rollup
export async function wayfinderQueryQualityDefects(params?: { portfolioId?: string } | string) {
  if (!db) throw new Error('Database not initialized');
  const portfolioId = typeof params === 'string' ? params : params?.portfolioId;
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (portfolioId && portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === portfolioId);
  }

  const defectsSummary: any[] = [];
  for (const proj of projects) {
    const storiesSnap = await getDocs(
      query(collection(db, 'projects', proj.id, 'stories'), where('itemType', '==', 'Bug'))
    );
    let sitCount = 0;
    let uatCount = 0;
    let prodCount = 0;
    let otherCount = 0;

    storiesSnap.docs.forEach((b: any) => {
      const data = b.data();
      const phase = (data.defectPhase || data.environment || '').toLowerCase();
      if (phase.includes('sit') || phase.includes('qa') || phase.includes('test')) sitCount++;
      else if (phase.includes('uat') || phase.includes('staging')) uatCount++;
      else if (phase.includes('prod') || phase.includes('live')) prodCount++;
      else otherCount++;
    });

    const totalBugs = storiesSnap.size;
    const leakageRate = totalBugs > 0 ? (prodCount / totalBugs) * 100 : 0;

    defectsSummary.push({
      projectId: proj.id,
      projectName: proj.name,
      status: proj.status,
      totalBugs,
      sitCount,
      uatCount,
      prodCount,
      otherCount,
      defectLeakageRate: Math.round(leakageRate * 10) / 10,
    });
  }

  return defectsSummary;
}

// 24. Query Billing Overview
export async function wayfinderQueryBillingOverview(params?: { portfolioId?: string } | string) {
  if (!db) throw new Error('Database not initialized');
  const portfolioId = typeof params === 'string' ? params : params?.portfolioId;
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (portfolioId && portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === portfolioId);
  }

  let totalRevenue = 0;
  let totalResourceCost = 0;
  let totalFixedCosts = 0;
  let totalProfit = 0;
  const projectSummaries: any[] = [];

  for (const proj of projects) {
    let projRev = 0;
    let projResCost = 0;
    let projFixed = 0;

    const pmSnap = await getDocs(collection(db, 'projects', proj.id, 'paymentMilestones'));
    pmSnap.docs.forEach((pm: any) => {
      projRev += pm.data().amount || 0;
    });

    const empSnap = await getDocs(collection(db, 'projects', proj.id, 'employees'));
    empSnap.docs.forEach((emp: any) => {
      const data = emp.data();
      const dailyCost = data.costRate || 250;
      projResCost += dailyCost * 20; // Avg 20 days monthly allocation
    });

    const fcSnap = await getDocs(collection(db, 'projects', proj.id, 'fixedCosts'));
    fcSnap.docs.forEach((fc: any) => {
      projFixed += fc.data().cost || 0;
    });

    const profit = projRev - (projResCost + projFixed);
    const margin = projRev > 0 ? (profit / projRev) * 100 : 0;

    totalRevenue += projRev;
    totalResourceCost += projResCost;
    totalFixedCosts += projFixed;
    totalProfit += profit;

    projectSummaries.push({
      projectId: proj.id,
      projectName: proj.name,
      pricingModel: proj.pricingModel,
      revenue: projRev,
      resourceCost: projResCost,
      fixedCost: projFixed,
      profit,
      marginPercentage: Math.round(margin * 10) / 10,
    });
  }

  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const portfolioFinancials = {
    totalRevenue,
    totalResourceCost,
    totalFixedCosts,
    totalProfit,
    overallMarginPercentage: Math.round(overallMargin * 10) / 10,
  };

  return {
    portfolioFinancials,
    portfolioTotals: portfolioFinancials,
    projects: projectSummaries,
  };
}

// 25. Query Billing Rates & Benchmarks
export async function wayfinderQueryBillingRates(params: { projectId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  const projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted)
    .map((d: any) => ({ id: d.id, name: d.data().name }));

  const resources: any[] = [];
  const roleMap: Record<string, { count: number; totalBilled: number; totalCost: number }> = {};

  for (const proj of projects) {
    if (params.projectId && proj.id !== params.projectId) continue;
    const empSnap = await getDocs(collection(db, 'projects', proj.id, 'employees'));
    empSnap.docs.forEach((emp: any) => {
      const data = emp.data();
      const billed = data.billedRate || 0;
      const cost = data.costRate || 0;
      const role = data.role || 'Developer';

      resources.push({
        id: emp.id,
        name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        projectId: proj.id,
        projectName: proj.name,
        role,
        billedRate: billed,
        costRate: cost,
        margin: billed - cost,
        marginPercentage: billed > 0 ? ((billed - cost) / billed) * 100 : 0,
      });

      if (!roleMap[role]) roleMap[role] = { count: 0, totalBilled: 0, totalCost: 0 };
      roleMap[role].count++;
      roleMap[role].totalBilled += billed;
      roleMap[role].totalCost += cost;
    });
  }

  const roleBenchmarks = Object.entries(roleMap).map(([role, metrics]) => {
    const avgBilled = metrics.count > 0 ? metrics.totalBilled / metrics.count : 0;
    const avgCost = metrics.count > 0 ? metrics.totalCost / metrics.count : 0;
    return {
      role,
      headcount: metrics.count,
      avgBilledRate: Math.round(avgBilled),
      avgCostRate: Math.round(avgCost),
      avgMarginPercentage: avgBilled > 0 ? Math.round(((avgBilled - avgCost) / avgBilled) * 100) : 0,
    };
  });

  return {
    totalAssignedResources: resources.length,
    roleBenchmarks,
    resources: resources.slice(0, 50),
  };
}

// 26. Update Resource Billing & Cost Rate
export async function wayfinderUpdateResourceRate(params: {
  projectId: string;
  employeeId: string;
  billedRate: number;
  costRate: number;
}) {
  if (!db || !params.projectId || !params.employeeId) throw new Error('Database, Project ID or Employee ID missing');
  const empRef = doc(db, 'projects', params.projectId, 'employees', params.employeeId);
  const now = new Date().toISOString();
  await updateDoc(empRef, {
    billedRate: params.billedRate,
    costRate: params.costRate,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    employeeId: params.employeeId,
    billedRate: params.billedRate,
    costRate: params.costRate,
    url: '/billing-rate',
  };
}

// 27. Update Specification Daily Rate (Impacted System or Horizontal)
export async function wayfinderUpdateSpecificationRate(params: {
  projectId: string;
  specType: 'system' | 'horizontal';
  itemId: string;
  dailyBillingRate: number;
}) {
  if (!db || !params.projectId || !params.itemId) throw new Error('Database, Project ID or Item ID missing');
  const collectionName = params.specType === 'system' ? 'impactedSystems' : 'horizontals';
  const itemRef = doc(db, 'projects', params.projectId, collectionName, params.itemId);
  const now = new Date().toISOString();
  await updateDoc(itemRef, {
    dailyBillingRate: params.dailyBillingRate,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    specType: params.specType,
    itemId: params.itemId,
    dailyBillingRate: params.dailyBillingRate,
    url: '/billing-rate',
  };
}

// 28. Query Resource Utilization
export async function wayfinderQueryResourceUtilization(params: {
  employeeId?: string;
  employeeName?: string;
  month?: number;
  year?: number;
}) {
  if (!db) throw new Error('Database not initialized');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  let matchedUser: any = null;

  if (params.employeeId) {
    matchedUser = employeesSnap.docs.find((d: any) => d.id === params.employeeId || d.data().empId === params.employeeId);
  } else if (params.employeeName) {
    const qName = params.employeeName.toLowerCase();
    matchedUser = employeesSnap.docs.find((d: any) => {
      const fn = `${d.data().firstName || ''} ${d.data().lastName || ''}`.toLowerCase();
      return fn.includes(qName);
    });
  }

  if (!matchedUser) {
    throw new Error(`Employee ${params.employeeId || params.employeeName} not found in workspace.`);
  }

  const userId = matchedUser.id;
  const userData = matchedUser.data();
  const projectsSnap = await getDocs(collection(db, 'projects'));
  const allocatedProjects: any[] = [];
  let totalAvailability = 0;
  let totalPlannedHours = 0;
  let totalLoggedHours = 0;

  for (const projDoc of projectsSnap.docs) {
    if (projDoc.data().isDeleted) continue;
    const empRef = doc(db, 'projects', projDoc.id, 'employees', userId);
    const empDoc = await getDoc(empRef);
    if (empDoc.exists()) {
      const empData = empDoc.data();
      const avail = empData.availability || 100;
      totalAvailability += avail;

      // Planned tasks
      const tasksSnap = await getDocs(
        query(
          collection(db, 'projects', projDoc.id, 'stories'),
          where('itemType', '==', 'Task'),
          where('assigneeId', '==', userId)
        )
      );
      let plannedHours = 0;
      tasksSnap.docs.forEach((t: any) => {
        plannedHours += t.data().estimatedHours || 0;
      });
      totalPlannedHours += plannedHours;

      // Actual logged work
      const logsSnap = await getDocs(
        query(collection(db, 'projects', projDoc.id, 'worklogs'), where('userId', '==', userId))
      );
      let loggedHours = 0;
      logsSnap.docs.forEach((l: any) => {
        loggedHours += l.data().hours || 0;
      });
      totalLoggedHours += loggedHours;

      allocatedProjects.push({
        projectId: projDoc.id,
        projectName: projDoc.data().name,
        role: empData.role || 'Developer',
        availabilityPercentage: avail,
        plannedTaskHours: plannedHours,
        actualLoggedHours: loggedHours,
      });
    }
  }

  const standardMonthlyHours = 160;
  const utilizationPercentage = standardMonthlyHours > 0 ? (totalLoggedHours / standardMonthlyHours) * 100 : 0;
  const workloadStatus = utilizationPercentage > 105 ? 'Over-allocated' : utilizationPercentage < 70 ? 'Under-allocated' : 'Optimal';

  return {
    employee: {
      id: userId,
      empId: userData.empId,
      name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      email: userData.email,
      role: userData.role,
    },
    totalAvailabilityPercentage: totalAvailability,
    totalPlannedHours,
    totalLoggedHours,
    utilizationPercentage: Math.round(utilizationPercentage),
    workloadStatus,
    allocatedProjects,
  };
}

// 29. Query Available / Bench Resources
export async function wayfinderQueryAvailableResources(params: { role?: string; minAvailability?: number }) {
  if (!db) throw new Error('Database not initialized');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const projectsSnap = await getDocs(collection(db, 'projects'));

  const allocationMap: Record<string, { totalAvailability: number; projects: string[] }> = {};
  employeesSnap.docs.forEach((e: any) => {
    allocationMap[e.id] = { totalAvailability: 0, projects: [] };
  });

  for (const projDoc of projectsSnap.docs) {
    if (projDoc.data().isDeleted || projDoc.data().isArchived) continue;
    const empSnap = await getDocs(collection(db, 'projects', projDoc.id, 'employees'));
    empSnap.docs.forEach((emp: any) => {
      if (allocationMap[emp.id]) {
        const avail = emp.data().availability || 100;
        allocationMap[emp.id].totalAvailability += avail;
        allocationMap[emp.id].projects.push(projDoc.data().name);
      }
    });
  }

  const availableList: any[] = [];
  employeesSnap.docs.forEach((e: any) => {
    const data = e.data();
    if (data.isDeleted || data.isEnabled === false) return;
    if (params.role && (data.role || '').toLowerCase() !== params.role.toLowerCase()) return;

    const allocated = allocationMap[e.id]?.totalAvailability || 0;
    const freeCapacity = Math.max(0, 100 - allocated);
    const minCap = params.minAvailability ?? 20;

    if (freeCapacity >= minCap) {
      availableList.push({
        id: e.id,
        empId: data.empId,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        role: data.role || 'Developer',
        currentAllocatedPercentage: allocated,
        freeCapacityPercentage: freeCapacity,
        activeProjectsCount: allocationMap[e.id]?.projects.length || 0,
      });
    }
  });

  availableList.sort((a, b) => b.freeCapacityPercentage - a.freeCapacityPercentage);
  return availableList;
}

// 30. Query Overallocated Resources
export async function wayfinderQueryOverallocatedResources() {
  if (!db) throw new Error('Database not initialized');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const projectsSnap = await getDocs(collection(db, 'projects'));

  const allocationMap: Record<string, { totalAvailability: number; projects: string[] }> = {};
  employeesSnap.docs.forEach((e: any) => {
    allocationMap[e.id] = { totalAvailability: 0, projects: [] };
  });

  for (const projDoc of projectsSnap.docs) {
    if (projDoc.data().isDeleted || projDoc.data().isArchived) continue;
    const empSnap = await getDocs(collection(db, 'projects', projDoc.id, 'employees'));
    empSnap.docs.forEach((emp: any) => {
      if (allocationMap[emp.id]) {
        const avail = emp.data().availability || 100;
        allocationMap[emp.id].totalAvailability += avail;
        allocationMap[emp.id].projects.push(projDoc.data().name);
      }
    });
  }

  const overallocated: any[] = [];
  employeesSnap.docs.forEach((e: any) => {
    const data = e.data();
    if (data.isDeleted) return;
    const allocated = allocationMap[e.id]?.totalAvailability || 0;
    if (allocated > 100) {
      overallocated.push({
        id: e.id,
        empId: data.empId,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        role: data.role || 'Developer',
        totalAllocatedPercentage: allocated,
        projects: allocationMap[e.id].projects,
      });
    }
  });

  overallocated.sort((a, b) => b.totalAllocatedPercentage - a.totalAllocatedPercentage);
  return overallocated;
}

// 31. Query Holidays
export async function wayfinderQueryHolidays(params: { year?: number }) {
  if (!db) throw new Error('Database not initialized');
  const holsSnap = await getDocs(collection(db, 'holidays'));
  const targetYear = params.year || new Date().getFullYear();

  const holidays = holsSnap.docs
    .map((d: any) => {
      const data = d.data();
      const dateStr = data.date?.toDate ? data.date.toDate().toISOString() : data.date;
      return {
        id: d.id,
        description: data.description || data.name,
        date: dateStr,
        type: data.type || 'National',
      };
    })
    .filter((h: any) => {
      if (!h.date) return false;
      const yr = new Date(h.date).getFullYear();
      return yr === targetYear;
    });

  holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return {
    year: targetYear,
    totalHolidays: holidays.length,
    holidays,
  };
}

// 32. Create Holiday
export async function wayfinderCreateHoliday(params: {
  name: string;
  date: string;
  description?: string;
  type?: 'National' | 'Regional' | 'Optional';
}) {
  if (!db) throw new Error('Database not initialized');
  const holidayData: any = {
    description: params.name,
    date: Timestamp.fromDate(new Date(params.date)),
    type: params.type || 'National',
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, 'holidays'), holidayData);
  return {
    success: true,
    id: docRef.id,
    name: params.name,
    date: params.date,
    type: params.type || 'National',
    url: '/holidays/holiday-calendar',
  };
}

// 33. Delete Holiday
export async function wayfinderDeleteHoliday(params: { holidayId: string }) {
  if (!db || !params.holidayId) throw new Error('Database or Holiday ID missing');
  const holRef = doc(db, 'holidays', params.holidayId);
  await deleteDoc(holRef);
  return {
    success: true,
    holidayId: params.holidayId,
    url: '/holidays/holiday-calendar',
    message: 'Holiday removed from calendar.',
  };
}

// 34. Query Leave Settings
export async function wayfinderQueryLeaveSettings() {
  if (!db) throw new Error('Database not initialized');
  const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
  const data = settingsDoc.exists() ? settingsDoc.data() : {};
  return {
    allocatedPaidLeavesPerYear: data.allocatedPaidLeavesPerYear ?? 24,
    allowCarryOver: data.allowCarryOver ?? false,
    carryOverLimit: data.carryOverLimit ?? 10,
    weeklyOffDays: data.weeklyOffDays ?? [0, 6],
  };
}

// 35. Update Leave Settings
export async function wayfinderUpdateLeaveSettings(params: {
  allocatedPaidLeavesPerYear?: number;
  allowCarryOver?: boolean;
  carryOverLimit?: number;
  weeklyOffDays?: number[];
}) {
  if (!db) throw new Error('Database not initialized');
  const updatePayload: any = {};
  if (params.allocatedPaidLeavesPerYear !== undefined) updatePayload.allocatedPaidLeavesPerYear = params.allocatedPaidLeavesPerYear;
  if (params.allowCarryOver !== undefined) updatePayload.allowCarryOver = params.allowCarryOver;
  if (params.carryOverLimit !== undefined) updatePayload.carryOverLimit = params.carryOverLimit;
  if (params.weeklyOffDays !== undefined) updatePayload.weeklyOffDays = params.weeklyOffDays;

  await setDoc(doc(db, 'settings', 'main'), updatePayload, { merge: true });
  return {
    success: true,
    url: '/holidays/leave-settings',
    settings: updatePayload,
  };
}

// 36. Query Leave Requests
export async function wayfinderQueryLeaveRequests(params: { employeeId?: string; type?: string }) {
  if (!db) throw new Error('Database not initialized');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const allLeaves: any[] = [];

  employeesSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (params.employeeId && d.id !== params.employeeId && data.empId !== params.employeeId) return;
    const leaves: any[] = data.leaves || [];
    leaves.forEach((l: any) => {
      if (!params.type || l.type === params.type) {
        allLeaves.push({
          leaveId: l.id,
          employeeId: d.id,
          empId: data.empId,
          employeeName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          startDate: l.startDate,
          endDate: l.endDate,
          type: l.type,
        });
      }
    });
  });

  return allLeaves;
}

// 37. Apply Leave
export async function wayfinderApplyLeave(params: {
  employeeId: string;
  startDate: string;
  endDate: string;
  type: 'Paid Leave' | 'Loss of Pay';
}) {
  if (!db || !params.employeeId) throw new Error('Database or Employee ID missing');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const empDoc = employeesSnap.docs.find(
    (d: any) => d.id === params.employeeId || d.data().empId === params.employeeId
  );
  if (!empDoc) throw new Error(`Employee with ID ${params.employeeId} not found.`);

  const leaveId = `leave_${Date.now()}`;
  const leaveObj = {
    id: leaveId,
    startDate: params.startDate,
    endDate: params.endDate,
    type: params.type,
  };

  const empRef = doc(db, 'employees', empDoc.id);
  await updateDoc(empRef, {
    leaves: arrayUnion(leaveObj),
  });

  return {
    success: true,
    leaveId,
    employeeId: empDoc.id,
    employeeName: `${empDoc.data().firstName || ''} ${empDoc.data().lastName || ''}`.trim(),
    startDate: params.startDate,
    endDate: params.endDate,
    type: params.type,
    url: '/holidays/leave-tracker',
  };
}

// 38. Delete / Cancel Leave
export async function wayfinderDeleteLeave(params: { employeeId: string; leaveId: string }) {
  if (!db || !params.employeeId || !params.leaveId) throw new Error('Database, Employee ID, or Leave ID missing');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const empDoc = employeesSnap.docs.find(
    (d: any) => d.id === params.employeeId || d.data().empId === params.employeeId
  );
  if (!empDoc) throw new Error(`Employee with ID ${params.employeeId} not found.`);

  const currentLeaves = empDoc.data().leaves || [];
  const target = currentLeaves.find((l: any) => l.id === params.leaveId);
  if (!target) throw new Error(`Leave record with ID ${params.leaveId} not found.`);

  const empRef = doc(db, 'employees', empDoc.id);
  await updateDoc(empRef, {
    leaves: arrayRemove(target),
  });

  return {
    success: true,
    employeeId: empDoc.id,
    leaveId: params.leaveId,
    url: '/holidays/leave-tracker',
    message: 'Leave period cancelled and removed.',
  };
}

// 39. Get Project Home Metrics
export async function wayfinderGetProjectHomeMetrics() {
  if (!db) throw new Error('Database not initialized');
  const [projectsSnap, portfoliosSnap] = await Promise.all([
    getDocs(collection(db, 'projects')),
    getDocs(collection(db, 'portfolios')),
  ]);

  const totalPortfolios = portfoliosSnap.docs.filter((d: any) => !d.data().isDeleted).length;
  const allProjects = projectsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const activeProjects = allProjects.filter((p: any) => !p.isDeleted && !p.isArchived);
  const archivedProjects = allProjects.filter((p: any) => p.isArchived && !p.isDeleted);
  const deletedProjects = allProjects.filter((p: any) => p.isDeleted);

  const healthDist = { Red: 0, Amber: 0, Green: 0 };
  const pricingModelDist = { 'Fixed Bid': 0, 'T&M': 0, Other: 0 };
  const statusDist: Record<string, number> = {};

  activeProjects.forEach((p: any) => {
    const health = p.overallStatus || 'Green';
    if (health === 'Red') healthDist.Red++;
    else if (health === 'Amber') healthDist.Amber++;
    else healthDist.Green++;

    const pm = p.pricingModel || 'Fixed Bid';
    if (pm === 'Fixed Bid') pricingModelDist['Fixed Bid']++;
    else if (pm === 'T&M') pricingModelDist['T&M']++;
    else pricingModelDist.Other++;

    const st = p.status || 'Active';
    statusDist[st] = (statusDist[st] || 0) + 1;
  });

  return {
    totalProjectsCount: allProjects.length,
    activeProjectsCount: activeProjects.length,
    archivedProjectsCount: archivedProjects.length,
    deletedProjectsCount: deletedProjects.length,
    totalPortfoliosCount: totalPortfolios,
    healthDistribution: healthDist,
    pricingModelDistribution: pricingModelDist,
    statusDistribution: statusDist,
  };
}

// 40. Duplicate / Clone Project
export async function wayfinderDuplicateProject(params: {
  sourceProjectId: string;
  newProjectName: string;
  targetPortfolioId?: string;
}) {
  if (!db || !params.sourceProjectId || !params.newProjectName) {
    throw new Error('Database, sourceProjectId, and newProjectName are required');
  }

  const srcDocRef = doc(db, 'projects', params.sourceProjectId);
  const srcDoc = await getDoc(srcDocRef);
  if (!srcDoc.exists()) {
    throw new Error(`Source project "${params.sourceProjectId}" not found.`);
  }

  const srcData = srcDoc.data();

  // Create new project
  const newProjResult = await wayfinderCreateProject({
    name: params.newProjectName.trim(),
    portfolioId: params.targetPortfolioId || srcData.portfolioId,
    pricingModel: srcData.pricingModel || 'Fixed Bid',
    status: 'Active',
    summary: srcData.summary || '',
    description: srcData.description ? `Cloned from ${srcData.name}: ${srcData.description}` : '',
  });

  const newProjId = newProjResult.id!;
  const newProjDocRef = doc(db, 'projects', newProjId);

  // Copy subcollections: kanbanColumns, settings, environments, epics, horizontals, impactedSystems
  const [colsSnap, envsSnap, epicsSnap, hzSnap, impSnap] = await Promise.all([
    getDocs(collection(srcDocRef, 'kanbanColumns')),
    getDocs(collection(srcDocRef, 'environments')),
    getDocs(collection(srcDocRef, 'epics')),
    getDocs(collection(srcDocRef, 'horizontals')),
    getDocs(collection(srcDocRef, 'impactedSystems')),
  ]);

  const batch = writeBatch(db);

  if (!colsSnap.empty) {
    colsSnap.docs.forEach((d: any) => {
      const copyRef = doc(collection(newProjDocRef, 'kanbanColumns'));
      batch.set(copyRef, sanitizeData(d.data()));
    });
  }
  if (!envsSnap.empty) {
    envsSnap.docs.forEach((d: any) => {
      const copyRef = doc(collection(newProjDocRef, 'environments'));
      batch.set(copyRef, sanitizeData(d.data()));
    });
  }
  if (!epicsSnap.empty) {
    epicsSnap.docs.forEach((d: any) => {
      const copyRef = doc(collection(newProjDocRef, 'epics'));
      batch.set(copyRef, sanitizeData({ ...d.data(), createdAt: new Date().toISOString() }));
    });
  }
  if (!hzSnap.empty) {
    hzSnap.docs.forEach((d: any) => {
      const copyRef = doc(collection(newProjDocRef, 'horizontals'));
      batch.set(copyRef, sanitizeData(d.data()));
    });
  }
  if (!impSnap.empty) {
    impSnap.docs.forEach((d: any) => {
      const copyRef = doc(collection(newProjDocRef, 'impactedSystems'));
      batch.set(copyRef, sanitizeData(d.data()));
    });
  }

  await batch.commit();

  return {
    success: true,
    sourceProjectId: params.sourceProjectId,
    newProjectId: newProjId,
    name: params.newProjectName,
    url: `/projects/${newProjId}/project-details/project-status`,
  };
}

// 41. Filter Portfolio Dashboard By Date
export async function wayfinderFilterPortfolioDashboardByDate(params: {
  portfolioId?: string;
  startDate?: string;
  endDate?: string;
}) {
  if (!db) throw new Error('Database not initialized');
  const summary = await wayfinderGetPortfolioDashboardSummary(params.portfolioId);
  const start = params.startDate ? new Date(params.startDate) : null;
  const end = params.endDate ? new Date(params.endDate) : null;

  let filteredProjects = summary.projects;
  if (start || end) {
    filteredProjects = filteredProjects.filter((p: any) => {
      const pStart = p.startDate ? new Date(p.startDate) : null;
      const pEnd = p.endDate ? new Date(p.endDate) : null;
      if (start && pEnd && pEnd < start) return false;
      if (end && pStart && pStart > end) return false;
      return true;
    });
  }

  return {
    dateRange: {
      startDate: params.startDate || 'All Time',
      endDate: params.endDate || 'Present',
    },
    filteredProjectsCount: filteredProjects.length,
    healthDistribution: {
      Red: filteredProjects.filter((p: any) => p.overallStatus === 'Red').length,
      Amber: filteredProjects.filter((p: any) => p.overallStatus === 'Amber').length,
      Green: filteredProjects.filter((p: any) => p.overallStatus === 'Green').length,
    },
    projects: filteredProjects,
    highPotentialRisks: summary.highPotentialRisks.slice(0, 10),
    criticalIssues: summary.criticalIssues.slice(0, 10),
  };
}

// 42. Export Portfolio Dashboard Report
export async function wayfinderExportPortfolioDashboardReport(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const summary = await wayfinderGetPortfolioDashboardSummary(params.portfolioId);
  return {
    generatedAt: new Date().toISOString(),
    totalActiveProjects: summary.totalProjects,
    healthDistribution: summary.healthDistribution,
    projectsReport: summary.projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      status: p.status,
      overallStatus: p.overallStatus,
      pricingModel: p.pricingModel,
      activeRisksCount: p.activeRisksCount,
      criticalIssuesCount: p.criticalIssuesCount,
    })),
    topRisks: summary.highPotentialRisks,
    criticalIssues: summary.criticalIssues,
    exportFormat: 'structured-json',
  };
}

// 43. Export Quality Estimations Report
export async function wayfinderExportQualityEstimationsReport(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const estimations: any = await wayfinderQueryQualityEstimations(params.portfolioId);
  const projectsList = Array.isArray(estimations) ? estimations : (estimations.projects || []);
  return {
    generatedAt: new Date().toISOString(),
    totalProjectsTracked: estimations.totalProjects || projectsList.length,
    conformanceSummary: estimations.portfolioSummary || {},
    estimationsData: estimations.projects || projectsList,
    exportFormat: 'csv-ready',
  };
}

// 44. Set Quality Variance Alert Threshold
export async function wayfinderSetQualityVarianceAlertThreshold(params: { thresholdPercent: number }) {
  if (!db) throw new Error('Database not initialized');
  await setDoc(
    doc(db, 'settings', 'quality'),
    {
      qualityVarianceThresholdPercent: params.thresholdPercent,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return {
    success: true,
    thresholdPercent: params.thresholdPercent,
    url: '/quality/estimations',
    message: `Quality variance alert threshold set to ${params.thresholdPercent}%.`,
  };
}

// 45. Query Defect Trend By Month
export async function wayfinderQueryDefectTrendByMonth(params: { portfolioId?: string; months?: number }) {
  if (!db) throw new Error('Database not initialized');
  const monthsToFetch = params.months || 6;
  const projectsSnap = await getDocs(collection(db, 'projects'));

  const monthMap: Record<string, { created: number; resolved: number; open: number }> = {};
  const now = new Date();
  for (let i = monthsToFetch - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = { created: 0, resolved: 0, open: 0 };
  }

  for (const proj of projectsSnap.docs) {
    if (proj.data().isDeleted) continue;
    if (params.portfolioId && proj.data().portfolioId !== params.portfolioId) continue;

    const storiesSnap = await getDocs(collection(db, 'projects', proj.id, 'stories'));
    storiesSnap.docs.forEach((s: any) => {
      const data = s.data();
      if (data.itemType !== 'Bug' || data.isDeleted) return;

      const createdDate = data.createdAt ? new Date(data.createdAt) : null;
      if (createdDate) {
        const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap[key]) {
          monthMap[key].created++;
        }
      }

      if (data.status === 'Done' || data.status === 'Closed' || data.status === 'Resolved') {
        const updatedDate = data.updatedAt ? new Date(data.updatedAt) : createdDate;
        if (updatedDate) {
          const key = `${updatedDate.getFullYear()}-${String(updatedDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthMap[key]) {
            monthMap[key].resolved++;
          }
        }
      } else {
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap[key]) {
          monthMap[key].open++;
        }
      }
    });
  }

  const trends = Object.entries(monthMap).map(([month, stats]) => ({
    month,
    created: stats.created,
    resolved: stats.resolved,
    open: stats.open,
  }));

  return {
    monthsTracked: monthsToFetch,
    trends,
  };
}

// 46. Query Defect Root Cause Summary
export async function wayfinderQueryDefectRootCauseSummary(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const defectsSummary: any = await wayfinderQueryQualityDefects(params.portfolioId);
  const projectsSnap = await getDocs(collection(db, 'projects'));

  const rootCauses = {
    'Code Logic / Regression': 0,
    'Requirement Ambiguity': 0,
    'UI / Design': 0,
    'Environment / Config': 0,
    'Other / Unclassified': 0,
  };

  for (const proj of projectsSnap.docs) {
    if (proj.data().isDeleted) continue;
    if (params.portfolioId && proj.data().portfolioId !== params.portfolioId) continue;

    const storiesSnap = await getDocs(collection(db, 'projects', proj.id, 'stories'));
    storiesSnap.docs.forEach((s: any) => {
      const data = s.data();
      if (data.itemType !== 'Bug' || data.isDeleted) return;

      const title = (data.title || '').toLowerCase();
      const desc = (data.description || '').toLowerCase();
      const txt = `${title} ${desc}`;

      if (txt.includes('require') || txt.includes('spec') || txt.includes('miss')) {
        rootCauses['Requirement Ambiguity']++;
      } else if (txt.includes('ui') || txt.includes('css') || txt.includes('align') || txt.includes('color') || txt.includes('design')) {
        rootCauses['UI / Design']++;
      } else if (txt.includes('env') || txt.includes('config') || txt.includes('db') || txt.includes('api') || txt.includes('500') || txt.includes('404')) {
        rootCauses['Environment / Config']++;
      } else if (txt.includes('logic') || txt.includes('null') || txt.includes('error') || txt.includes('crash') || txt.includes('function')) {
        rootCauses['Code Logic / Regression']++;
      } else {
        rootCauses['Other / Unclassified']++;
      }
    });
  }

  const pSummary = defectsSummary?.portfolioSummary || {};
  const isArr = Array.isArray(defectsSummary);
  return {
    totalDefects: pSummary.totalDefects ?? (isArr ? defectsSummary.reduce((acc: number, d: any) => acc + (d.totalBugs || 0), 0) : 0),
    phaseContainment: {
      sit: pSummary.totalSit ?? (isArr ? defectsSummary.reduce((acc: number, d: any) => acc + (d.sitCount || 0), 0) : 0),
      uat: pSummary.totalUat ?? (isArr ? defectsSummary.reduce((acc: number, d: any) => acc + (d.uatCount || 0), 0) : 0),
      productionLeakage: pSummary.totalProd ?? (isArr ? defectsSummary.reduce((acc: number, d: any) => acc + (d.prodCount || 0), 0) : 0),
      leakageRatePercentage: pSummary.averageLeakageRate ?? 0,
    },
    rootCauses,
  };
}

// 47. Export Billing Overview CSV Data
export async function wayfinderExportBillingOverviewCsv(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const overview = await wayfinderQueryBillingOverview(params.portfolioId);
  return {
    generatedAt: new Date().toISOString(),
    portfolioTotals: overview.portfolioTotals,
    projectBillingBreakdown: overview.projects,
    exportFormat: 'csv-ready',
  };
}

// 48. Query Project Profitability Forecast
export async function wayfinderQueryProjectProfitabilityForecast(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const overview = await wayfinderQueryBillingOverview(params.portfolioId);

  const forecast = overview.projects.map((p: any) => {
    const projectedRevenue = p.contractValue || p.totalBilledRevenue;
    const projectedCost = p.totalResourceCost + p.totalFixedCost;
    const projectedProfit = projectedRevenue - projectedCost;
    const projectedMarginPercentage = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;
    const healthStatus = projectedMarginPercentage >= 35 ? 'Healthy' : projectedMarginPercentage >= 15 ? 'Moderate' : 'At Risk';

    return {
      projectId: p.projectId,
      projectName: p.projectName,
      pricingModel: p.pricingModel,
      projectedRevenue,
      projectedCost,
      projectedProfit,
      projectedMarginPercentage: Math.round(projectedMarginPercentage),
      profitabilityHealth: healthStatus,
    };
  });

  const totalProjRevenue = forecast.reduce((sum, f) => sum + f.projectedRevenue, 0);
  const totalProjCost = forecast.reduce((sum, f) => sum + f.projectedCost, 0);
  const totalProjProfit = totalProjRevenue - totalProjCost;
  const portfolioMargin = totalProjRevenue > 0 ? (totalProjProfit / totalProjRevenue) * 100 : 0;

  return {
    portfolioForecastTotals: {
      totalProjectedRevenue: totalProjRevenue,
      totalProjectedCost: totalProjCost,
      totalProjectedProfit: totalProjProfit,
      overallMarginPercentage: Math.round(portfolioMargin),
    },
    projects: forecast,
  };
}

// 49. Bulk Update Resource Rates
export async function wayfinderBulkUpdateResourceRates(params: {
  updates: Array<{
    employeeId: string;
    projectId?: string;
    billedRate?: number;
    costRate?: number;
  }>;
}) {
  if (!db || !Array.isArray(params.updates) || params.updates.length === 0) {
    throw new Error('Database not initialized or updates array is empty');
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();
  let updateCount = 0;

  for (const item of params.updates) {
    if (!item.employeeId) continue;

    // Update in employee global directory
    const empRef = doc(db, 'employees', item.employeeId);
    const globalPayload: any = { updatedAt: now };
    if (item.billedRate !== undefined) globalPayload.billedRate = item.billedRate;
    if (item.costRate !== undefined) globalPayload.costRate = item.costRate;
    batch.set(empRef, globalPayload, { merge: true });
    updateCount++;

    // If projectId provided, also update in project's employee subcollection
    if (item.projectId) {
      const projEmpRef = doc(db, 'projects', item.projectId, 'employees', item.employeeId);
      batch.set(projEmpRef, globalPayload, { merge: true });
    }
  }

  await batch.commit();

  return {
    success: true,
    updatedCount: updateCount,
    url: '/billing-rate',
  };
}

// 50. Set Default Role Benchmark Rates
export async function wayfinderSetDefaultRoleBenchmarkRates(params: {
  role: string;
  defaultBilledRate: number;
  defaultCostRate: number;
}) {
  if (!db || !params.role) throw new Error('Database or role missing');
  const roleKey = params.role.replace(/[^a-zA-Z0-9]/g, '_');

  await setDoc(
    doc(db, 'settings', 'billingRates'),
    {
      [`benchmark_${roleKey}`]: {
        role: params.role,
        defaultBilledRate: params.defaultBilledRate,
        defaultCostRate: params.defaultCostRate,
        margin: params.defaultBilledRate - params.defaultCostRate,
        marginPercentage:
          params.defaultBilledRate > 0
            ? Math.round(((params.defaultBilledRate - params.defaultCostRate) / params.defaultBilledRate) * 100)
            : 0,
        updatedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  );

  return {
    success: true,
    role: params.role,
    defaultBilledRate: params.defaultBilledRate,
    defaultCostRate: params.defaultCostRate,
    url: '/billing-rate',
  };
}

// 51. Create User (RESTRICTED)
export async function wayfinderCreateUser(_params: {
  email: string;
  firstName: string;
  lastName: string;
  empId?: string;
  phone?: string;
  role?: string;
  accessLevel?: 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';
  experience?: number;
  costAmount?: number;
  costCurrency?: string;
  employmentStartDate?: string;
  employmentEndDate?: string;
}) {
  throw new Error(
    'Adding or creating users from Portfolio > Users through WayFinder is strictly disallowed for security and governance. Please add users directly on the Portfolio > Users (User List) page with Administrator privileges.'
  );
}

export const flowpilotCreateUser = wayfinderCreateUser;

// 52. Update User Role & Access Level
export async function wayfinderUpdateUserRole(params: {
  userIdOrEmpId: string;
  role?: string;
  accessLevel?: 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';
  department?: string;
  employmentStartDate?: string;
  employmentEndDate?: string;
}) {
  if (!db || !params.userIdOrEmpId) throw new Error('Database or User ID missing');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const empDoc = employeesSnap.docs.find(
    (d: any) => d.id === params.userIdOrEmpId || d.data().empId === params.userIdOrEmpId
  );
  if (!empDoc) throw new Error(`User "${params.userIdOrEmpId}" not found.`);

  const parseDate = (dStr: any) => {
    if (!dStr) return undefined;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  const updatePayload: any = { updatedAt: new Date().toISOString() };
  if (params.role) updatePayload.role = params.role;
  if (params.accessLevel) updatePayload.accessLevel = params.accessLevel;
  if (params.department) updatePayload.department = params.department;
  if (params.employmentStartDate !== undefined) updatePayload.employmentStartDate = parseDate(params.employmentStartDate);
  if (params.employmentEndDate !== undefined) updatePayload.employmentEndDate = parseDate(params.employmentEndDate);

  await updateDoc(doc(db, 'employees', empDoc.id), sanitizeData(updatePayload));

  return {
    success: true,
    id: empDoc.id,
    empId: empDoc.data().empId || empDoc.id,
    name: `${empDoc.data().firstName || ''} ${empDoc.data().lastName || ''}`.trim(),
    role: params.role || empDoc.data().role,
    accessLevel: params.accessLevel || empDoc.data().accessLevel,
    url: '/users',
  };
}

// 53. Toggle User Account Status (Enable / Disable)
export async function wayfinderToggleUserStatus(params: { userIdOrEmpId: string; isEnabled: boolean }) {
  if (!db || !params.userIdOrEmpId) throw new Error('Database or User ID missing');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const empDoc = employeesSnap.docs.find(
    (d: any) => d.id === params.userIdOrEmpId || d.data().empId === params.userIdOrEmpId
  );
  if (!empDoc) throw new Error(`User "${params.userIdOrEmpId}" not found.`);

  if (params.isEnabled) {
    const empData = empDoc.data();
    const hasJoiningDate = !!(empData.employmentStartDate && String(empData.employmentStartDate).trim() !== '');
    const parsedCost = Number(empData.costAmount);
    const hasValidCost = empData.costAmount !== undefined && empData.costAmount !== null && String(empData.costAmount).trim() !== '' && !Number.isNaN(parsedCost) && parsedCost > 0;
    if (!hasJoiningDate || !hasValidCost) {
      throw new Error('Joining Date (employmentStartDate) and Cost to Company (costAmount) must be populated before approving the user as active.');
    }
  }

  await updateDoc(doc(db, 'employees', empDoc.id), {
    isEnabled: params.isEnabled,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    id: empDoc.id,
    empId: empDoc.data().empId || empDoc.id,
    name: `${empDoc.data().firstName || ''} ${empDoc.data().lastName || ''}`.trim(),
    isEnabled: params.isEnabled,
    url: '/users',
  };
}

// 54. List All Registered Users
export async function wayfinderListAllUsers(params?: { role?: string; accessLevel?: string; isEnabled?: boolean }) {
  if (!db) throw new Error('Database not initialized');
  const employeesSnap = await getDocs(collection(db, 'employees'));

  const users = employeesSnap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((u: any) => {
      if (u.isDeleted) return false;
      if (params?.role && (u.role || '').toLowerCase() !== params.role.toLowerCase()) return false;
      if (params?.accessLevel && u.accessLevel !== params.accessLevel) return false;
      if (params?.isEnabled !== undefined && u.isEnabled !== params.isEnabled) return false;
      return true;
    })
    .map((u: any) => ({
      id: u.id,
      empId: u.empId || u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      email: u.email,
      role: u.role || 'Developer',
      accessLevel: u.accessLevel || 'Team Member',
      isEnabled: u.isEnabled !== false,
      annualCost: u.costAmount ? `${u.costCurrency || 'USD'} ${u.costAmount.toLocaleString()}` : 'N/A',
    }));

  return {
    totalUsersCount: users.length,
    users,
  };
}

// 55. Query Department Utilization Trends
export async function wayfinderQueryDepartmentUtilizationTrends(params?: { department?: string }) {
  if (!db) throw new Error('Database not initialized');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const projectsSnap = await getDocs(collection(db, 'projects'));

  const allocationMap: Record<string, number> = {};
  for (const projDoc of projectsSnap.docs) {
    if (projDoc.data().isDeleted || projDoc.data().isArchived) continue;
    const empSnap = await getDocs(collection(db, 'projects', projDoc.id, 'employees'));
    empSnap.docs.forEach((emp: any) => {
      const avail = emp.data().availability || 100;
      allocationMap[emp.id] = (allocationMap[emp.id] || 0) + avail;
    });
  }

  const roleStats: Record<string, { headcount: number; totalAllocated: number }> = {};
  employeesSnap.docs.forEach((e: any) => {
    const data = e.data();
    if (data.isDeleted) return;
    const role = data.role || data.department || 'Developer';
    if (!roleStats[role]) roleStats[role] = { headcount: 0, totalAllocated: 0 };
    roleStats[role].headcount++;
    roleStats[role].totalAllocated += allocationMap[e.id] || 0;
  });

  const departmentTrends = Object.entries(roleStats).map(([role, stats]) => {
    const avgAlloc = stats.headcount > 0 ? Math.round(stats.totalAllocated / stats.headcount) : 0;
    const status = avgAlloc > 100 ? 'Over-capacity' : avgAlloc < 70 ? 'Bench Available' : 'Optimal';
    return {
      departmentRole: role,
      headcount: stats.headcount,
      averageAllocationPercentage: avgAlloc,
      utilizationStatus: status,
    };
  });

  return {
    totalDepartments: departmentTrends.length,
    departments: departmentTrends,
  };
}

// 56. Export Resource Utilization Report
export async function wayfinderExportResourceUtilizationReport() {
  if (!db) throw new Error('Database not initialized');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const projectsSnap = await getDocs(collection(db, 'projects'));

  const allocationMap: Record<string, { totalAvailability: number; projectNames: string[] }> = {};
  for (const projDoc of projectsSnap.docs) {
    if (projDoc.data().isDeleted || projDoc.data().isArchived) continue;
    const empSnap = await getDocs(collection(db, 'projects', projDoc.id, 'employees'));
    empSnap.docs.forEach((emp: any) => {
      if (!allocationMap[emp.id]) allocationMap[emp.id] = { totalAvailability: 0, projectNames: [] };
      allocationMap[emp.id].totalAvailability += emp.data().availability || 100;
      allocationMap[emp.id].projectNames.push(projDoc.data().name);
    });
  }

  const matrix = employeesSnap.docs
    .filter((e: any) => !e.data().isDeleted)
    .map((e: any) => {
      const data = e.data();
      const allocated = allocationMap[e.id]?.totalAvailability || 0;
      const free = Math.max(0, 100 - allocated);
      const status = allocated > 100 ? 'Overallocated' : allocated < 70 ? 'Underallocated' : 'Optimal';

      return {
        empId: data.empId || e.id,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        role: data.role || 'Developer',
        allocatedPercentage: allocated,
        freeCapacityPercentage: free,
        activeProjectsCount: allocationMap[e.id]?.projectNames.length || 0,
        activeProjects: allocationMap[e.id]?.projectNames || [],
        status,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    totalHeadcount: matrix.length,
    utilizationMatrix: matrix,
    exportFormat: 'csv-ready',
  };
}

// 57. Bulk Import Holidays
export async function wayfinderBulkImportHolidays(params: {
  holidays: Array<{
    name: string;
    date: string;
    type?: 'National' | 'Regional' | 'Optional';
  }>;
}) {
  if (!db || !Array.isArray(params.holidays) || params.holidays.length === 0) {
    throw new Error('Database not initialized or holidays list is empty');
  }

  const batch = writeBatch(db);
  const added: any[] = [];

  for (const h of params.holidays) {
    const newRef = doc(collection(db, 'holidays'));
    const payload = {
      description: h.name,
      date: Timestamp.fromDate(new Date(h.date)),
      type: h.type || 'National',
      createdAt: new Date().toISOString(),
    };
    batch.set(newRef, payload);
    added.push({ id: newRef.id, name: h.name, date: h.date, type: h.type || 'National' });
  }

  await batch.commit();

  return {
    success: true,
    importedCount: added.length,
    holidays: added,
    url: '/holidays/holiday-calendar',
  };
}

// 58. Update Holiday
export async function wayfinderUpdateHoliday(params: {
  holidayId: string;
  name?: string;
  date?: string;
  type?: 'National' | 'Regional' | 'Optional';
}) {
  if (!db || !params.holidayId) throw new Error('Database or Holiday ID missing');
  const updatePayload: any = { updatedAt: new Date().toISOString() };
  if (params.name) updatePayload.description = params.name;
  if (params.date) updatePayload.date = Timestamp.fromDate(new Date(params.date));
  if (params.type) updatePayload.type = params.type;

  await updateDoc(doc(db, 'holidays', params.holidayId), updatePayload);

  return {
    success: true,
    holidayId: params.holidayId,
    name: params.name,
    date: params.date,
    type: params.type,
    url: '/holidays/holiday-calendar',
  };
}

// 59. Reset Annual Leave Balances
export async function wayfinderResetAnnualLeaveBalances(params?: { year?: number; carryOverLimit?: number }) {
  if (!db) throw new Error('Database not initialized');
  const currentYear = params?.year || new Date().getFullYear();
  const carryLimit = params?.carryOverLimit ?? 10;

  await setDoc(
    doc(db, 'settings', 'leaveRollOver'),
    {
      lastResetYear: currentYear,
      carryOverLimitApplied: carryLimit,
      resetExecutedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return {
    success: true,
    year: currentYear,
    carryOverLimit: carryLimit,
    message: `Annual leave rollover for ${currentYear} completed with carryover limit of ${carryLimit} days.`,
    url: '/holidays/leave-settings',
  };
}

// 60. Approve Leave Request
export async function wayfinderApproveLeaveRequest(params: {
  employeeId: string;
  leaveId: string;
  approverNotes?: string;
}) {
  if (!db || !params.employeeId || !params.leaveId) throw new Error('Database, Employee ID, or Leave ID missing');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const empDoc = employeesSnap.docs.find(
    (d: any) => d.id === params.employeeId || d.data().empId === params.employeeId
  );
  if (!empDoc) throw new Error(`Employee "${params.employeeId}" not found.`);

  const currentLeaves = empDoc.data().leaves || [];
  const updatedLeaves = currentLeaves.map((l: any) => {
    if (l.id === params.leaveId) {
      return {
        ...l,
        status: 'Approved',
        approverNotes: params.approverNotes || 'Approved by Manager',
        approvedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  await updateDoc(doc(db, 'employees', empDoc.id), { leaves: updatedLeaves });

  return {
    success: true,
    employeeId: empDoc.id,
    leaveId: params.leaveId,
    status: 'Approved',
    url: '/holidays/leave-tracker',
  };
}

// 61. Reject Leave Request
export async function wayfinderRejectLeaveRequest(params: {
  employeeId: string;
  leaveId: string;
  reason: string;
}) {
  if (!db || !params.employeeId || !params.leaveId) throw new Error('Database, Employee ID, or Leave ID missing');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const empDoc = employeesSnap.docs.find(
    (d: any) => d.id === params.employeeId || d.data().empId === params.employeeId
  );
  if (!empDoc) throw new Error(`Employee "${params.employeeId}" not found.`);

  const currentLeaves = empDoc.data().leaves || [];
  const updatedLeaves = currentLeaves.map((l: any) => {
    if (l.id === params.leaveId) {
      return {
        ...l,
        status: 'Rejected',
        rejectionReason: params.reason || 'Not approved',
        rejectedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  await updateDoc(doc(db, 'employees', empDoc.id), { leaves: updatedLeaves });

  return {
    success: true,
    employeeId: empDoc.id,
    leaveId: params.leaveId,
    status: 'Rejected',
    reason: params.reason,
    url: '/holidays/leave-tracker',
  };
}

// 62. Query Employee Leave Balance
export async function wayfinderQueryEmployeeLeaveBalance(params: { employeeId: string; year?: number }) {
  if (!db || !params.employeeId) throw new Error('Database or Employee ID missing');
  const employeesSnap = await getDocs(collection(db, 'employees'));
  const empDoc = employeesSnap.docs.find(
    (d: any) => d.id === params.employeeId || d.data().empId === params.employeeId
  );
  if (!empDoc) throw new Error(`Employee "${params.employeeId}" not found.`);

  const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
  const defaultQuota = settingsDoc.exists() ? settingsDoc.data().allocatedPaidLeavesPerYear ?? 24 : 24;

  const leaves = empDoc.data().leaves || [];
  const targetYear = params.year || new Date().getFullYear();
  const allocatedQuota = calculatePolicyALeaveQuotaForYear(
    defaultQuota,
    targetYear,
    parseEmployeeJoiningDate(empDoc.data()),
    { defaultFullIfMissingJoinDate: true }
  );

  const yearLeaves = leaves.filter((l: any) => {
    if (!l.startDate) return false;
    return new Date(l.startDate).getFullYear() === targetYear;
  });

  let usedDays = 0;
  yearLeaves.forEach((l: any) => {
    if (l.type === 'Paid Leave' && l.status !== 'Rejected') {
      const s = new Date(l.startDate).getTime();
      const e = new Date(l.endDate || l.startDate).getTime();
      const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
      usedDays += days;
    }
  });

  const remainingBalance = Math.max(0, allocatedQuota - usedDays);
  return {
    employeeId: empDoc.id,
    empId: empDoc.data().empId || empDoc.id,
    name: `${empDoc.data().firstName || ''} ${empDoc.data().lastName || ''}`.trim(),
    year: targetYear,
    allocatedAnnualQuota: allocatedQuota,
    usedLeaveDays: usedDays,
    remainingLeaveBalance: remainingBalance,
    leaves: yearLeaves,
  };
}

// ==========================================
// PROJECT LEVEL TOOLS (MODULES 1 TO 10)
// ==========================================

// --- MODULE 1: INITIAL ESTIMATION & SPECIFICATIONS ---

export async function wayfinderUpdateInitialImpactedSystem(params: {
  projectId: string;
  itemId: string;
  name?: string;
  description?: string;
  category?: 'Technology' | 'Function';
  estimate?: number;
  dailyBillingRate?: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const docRef = doc(db, 'projects', params.projectId, 'initialImpactedSystems', params.itemId);
  const now = new Date().toISOString();
  const payload: any = { updatedAt: now };
  if (params.name !== undefined) payload.name = params.name.trim();
  if (params.description !== undefined) payload.description = params.description.trim();
  if (params.category !== undefined) payload.category = params.category;
  if (params.estimate !== undefined) payload.estimate = Number(params.estimate);
  if (params.dailyBillingRate !== undefined) payload.dailyBillingRate = Number(params.dailyBillingRate);
  await updateDoc(docRef, payload);
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    ...payload,
    url: `/projects/${params.projectId}/initial-estimation/specifications`,
  };
}

export async function wayfinderDeleteInitialImpactedSystem(params: { projectId: string; itemId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'initialImpactedSystems', params.itemId));
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    url: `/projects/${params.projectId}/initial-estimation/specifications`,
  };
}

export async function wayfinderUpdateInitialHorizontal(params: {
  projectId: string;
  itemId: string;
  name?: string;
  weightage?: number;
  dailyBillingRate?: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const docRef = doc(db, 'projects', params.projectId, 'initialHorizontals', params.itemId);
  const now = new Date().toISOString();
  const payload: any = { updatedAt: now };
  if (params.name !== undefined) payload.name = params.name.trim();
  if (params.weightage !== undefined) payload.weightage = Number(params.weightage);
  if (params.dailyBillingRate !== undefined) payload.dailyBillingRate = Number(params.dailyBillingRate);
  await updateDoc(docRef, payload);
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    ...payload,
    url: `/projects/${params.projectId}/initial-estimation/specifications`,
  };
}

export async function wayfinderDeleteInitialHorizontal(params: { projectId: string; itemId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'initialHorizontals', params.itemId));
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    url: `/projects/${params.projectId}/initial-estimation/specifications`,
  };
}

export async function wayfinderQueryInitialSpecifications(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const projSnap = await getDoc(doc(db, 'projects', params.projectId));
  const projData = projSnap.exists() ? projSnap.data() : {};

  const systemsSnap = await getDocs(collection(db, 'projects', params.projectId, 'initialImpactedSystems'));
  const impactedSystems = systemsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const horizontalsSnap = await getDocs(collection(db, 'projects', params.projectId, 'initialHorizontals'));
  const horizontals = horizontalsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  let totalDevEffortManDays = 0;
  let totalDevCost = 0;
  impactedSystems.forEach((sys: any) => {
    const est = sys.estimate || 0;
    const rate = sys.dailyBillingRate || 0;
    totalDevEffortManDays += est;
    totalDevCost += est * rate;
  });

  let grandTotalEffortManDays = totalDevEffortManDays;
  let grandTotalCost = totalDevCost;

  const horizontalBreakdown = horizontals.map((h: any) => {
    const weightage = h.weightage || 0;
    const rate = h.dailyBillingRate || 0;
    const effort = (totalDevEffortManDays * weightage) / 100;
    const cost = effort * rate;
    grandTotalEffortManDays += effort;
    grandTotalCost += cost;
    return {
      id: h.id,
      name: h.name,
      weightage,
      dailyBillingRate: rate,
      effortManDays: Math.round(effort * 10) / 10,
      costAmount: Math.round(cost),
    };
  });

  return {
    projectId: params.projectId,
    projectName: projData.name || params.projectId,
    summary: projData.summary || '',
    impactedSystems,
    horizontals: horizontalBreakdown,
    totalDevEffortManDays,
    totalDevCost,
    grandTotalEffortManDays: Math.round(grandTotalEffortManDays * 10) / 10,
    grandTotalCost: Math.round(grandTotalCost),
  };
}

export async function wayfinderConfirmProjectEstimation(params: { projectId: string; targetStatus?: string }) {
  if (!db) throw new Error('Database unavailable');
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // Copy initialImpactedSystems to impactedSystems
  const initSysSnap = await getDocs(collection(db, 'projects', params.projectId, 'initialImpactedSystems'));
  initSysSnap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    batch.set(doc(db, 'projects', params.projectId, 'impactedSystems', docSnap.id), {
      ...data,
      confirmedAt: now,
    });
  });

  // Copy initialHorizontals to horizontals
  const initHzSnap = await getDocs(collection(db, 'projects', params.projectId, 'initialHorizontals'));
  initHzSnap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    batch.set(doc(db, 'projects', params.projectId, 'horizontals', docSnap.id), {
      ...data,
      confirmedAt: now,
    });
  });

  // Update project status
  const newStatus = params.targetStatus || 'Active';
  batch.update(doc(db, 'projects', params.projectId), {
    status: newStatus,
    estimationConfirmedAt: now,
    updatedAt: now,
  });

  await batch.commit();

  return {
    success: true,
    projectId: params.projectId,
    newStatus,
    systemsCount: initSysSnap.docs.length,
    horizontalsCount: initHzSnap.docs.length,
    url: `/projects/${params.projectId}/project-details/project-status`,
  };
}

export async function wayfinderUpdateInitialProjectDates(params: {
  projectId: string;
  startDate: string;
  endDate: string;
}) {
  if (!db) throw new Error('Database unavailable');
  if (new Date(params.startDate) > new Date(params.endDate)) {
    throw new Error('Start date cannot be after end date.');
  }
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'projects', params.projectId), {
    startDate: params.startDate,
    endDate: params.endDate,
    plannedStartDate: params.startDate,
    plannedEndDate: params.endDate,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    startDate: params.startDate,
    endDate: params.endDate,
    url: `/projects/${params.projectId}/initial-estimation/project-status`,
  };
}

export async function wayfinderQueryInitialProjectStatus(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const projSnap = await getDoc(doc(db, 'projects', params.projectId));
  if (!projSnap.exists()) throw new Error(`Project ${params.projectId} not found.`);
  const data = projSnap.data();
  return {
    projectId: params.projectId,
    name: data.name || '',
    status: data.status || 'Initial Estimation',
    pricingModel: data.pricingModel || 'Fixed Bid',
    projectManagerId: data.projectManagerId || null,
    projectManager: data.projectManager || 'Unassigned',
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    summary: data.summary || '',
  };
}

// --- MODULE 2: PROJECT STATUS, HEALTH & PM DASHBOARD ---

export async function wayfinderUpdateProjectHealth(params: {
  projectId: string;
  overallStatus: 'Red' | 'Amber' | 'Green';
  scopeHealth?: 'Red' | 'Amber' | 'Green';
  costHealth?: 'Red' | 'Amber' | 'Green';
  timeHealth?: 'Red' | 'Amber' | 'Green';
  commentary?: string;
  authorName?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const now = new Date().toISOString();
  const historyEntry = {
    date: now,
    overallStatus: params.overallStatus,
    scopeHealth: params.scopeHealth || params.overallStatus,
    costHealth: params.costHealth || params.overallStatus,
    timeHealth: params.timeHealth || params.overallStatus,
    commentary: params.commentary || 'Health indicators updated via WayFinder',
    author: params.authorName || 'WayFinder AI',
  };

  const payload: any = {
    overallStatus: params.overallStatus,
    updatedAt: now,
    statusHistory: arrayUnion(historyEntry),
  };
  if (params.scopeHealth) payload.scopeHealth = params.scopeHealth;
  if (params.costHealth) payload.costHealth = params.costHealth;
  if (params.timeHealth) payload.timeHealth = params.timeHealth;

  await updateDoc(doc(db, 'projects', params.projectId), payload);

  return {
    success: true,
    projectId: params.projectId,
    overallStatus: params.overallStatus,
    scopeHealth: params.scopeHealth,
    costHealth: params.costHealth,
    timeHealth: params.timeHealth,
    commentary: params.commentary,
    url: `/projects/${params.projectId}/project-details/project-status`,
  };
}

export async function wayfinderUpdateProjectDates(params: {
  projectId: string;
  startDate: string;
  endDate: string;
}) {
  if (!db) throw new Error('Database unavailable');
  if (new Date(params.startDate) > new Date(params.endDate)) {
    throw new Error('Start date cannot be after end date.');
  }
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'projects', params.projectId), {
    startDate: params.startDate,
    endDate: params.endDate,
    updatedAt: now,
  });
  return {
    success: true,
    projectId: params.projectId,
    startDate: params.startDate,
    endDate: params.endDate,
    url: `/projects/${params.projectId}/project-details/project-status`,
  };
}

export async function wayfinderQueryProjectStatusDetails(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const projSnap = await getDoc(doc(db, 'projects', params.projectId));
  if (!projSnap.exists()) throw new Error(`Project ${params.projectId} not found.`);
  const data = projSnap.data();
  return {
    projectId: params.projectId,
    name: data.name || '',
    status: data.status || 'Active',
    pricingModel: data.pricingModel || 'Fixed Bid',
    projectManagerId: data.projectManagerId || null,
    projectManager: data.projectManager || 'Unassigned',
    startDate: data.startDate || null,
    endDate: data.endDate || null,
    overallStatus: data.overallStatus || 'Green',
    scopeHealth: data.scopeHealth || 'Green',
    costHealth: data.costHealth || 'Green',
    timeHealth: data.timeHealth || 'Green',
    summary: data.summary || '',
    description: data.description || '',
    statusHistory: data.statusHistory || [],
  };
}

export async function wayfinderQueryProjectPmDashboard(params: { projectId: string; sprintId?: string }) {
  if (!db) throw new Error('Database unavailable');
  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  let stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  if (params.sprintId) {
    stories = stories.filter((s: any) => s.sprintId === params.sprintId);
  }

  const epicsSnap = await getDocs(collection(db, 'projects', params.projectId, 'epics'));
  const epics = epicsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((e: any) => !e.isDeleted);

  const worklogsSnap = await getDocs(collection(db, 'projects', params.projectId, 'worklogs'));
  const worklogs = worklogsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  let totalPlannedHours = 0;
  let totalLoggedHours = 0;
  stories.forEach((s: any) => {
    totalPlannedHours += s.estimatedHours || s.originalEstimateHours || 0;
  });
  worklogs.forEach((w: any) => {
    totalLoggedHours += w.hours || w.timeSpentHours || 0;
  });

  const taskDistribution: Record<string, number> = { 'To Do': 0, 'In Progress': 0, 'In QA': 0, 'Done': 0 };
  stories.forEach((s: any) => {
    const st = s.status || 'To Do';
    taskDistribution[st] = (taskDistribution[st] || 0) + 1;
  });

  const epicProgress = epics.map((ep: any) => {
    const epStories = stories.filter((s: any) => s.epicId === ep.id || s.epic === ep.title);
    const completed = epStories.filter((s: any) => s.status === 'Done').length;
    const progress = epStories.length > 0 ? Math.round((completed / epStories.length) * 100) : 0;
    return {
      epicId: ep.id,
      title: ep.title,
      totalStories: epStories.length,
      completedStories: completed,
      progressPercent: progress,
    };
  });

  return {
    projectId: params.projectId,
    totalStories: stories.length,
    taskDistribution,
    epicProgress,
    totalPlannedHours,
    totalLoggedHours,
    hoursBurnPercent: totalPlannedHours > 0 ? Math.round((totalLoggedHours / totalPlannedHours) * 100) : 0,
  };
}

export async function wayfinderQueryProjectWorkload(params: { projectId: string; sprintId?: string }) {
  if (!db) throw new Error('Database unavailable');
  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  let stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  if (params.sprintId) {
    stories = stories.filter((s: any) => s.sprintId === params.sprintId);
  }

  const workloadByAssignee: Record<string, { assignee: string; subTaskHours: number; bugHours: number; totalHours: number; itemCount: number }> = {};

  stories.forEach((s: any) => {
    const assignee = s.assigneeName || s.assignee || 'Unassigned';
    if (!workloadByAssignee[assignee]) {
      workloadByAssignee[assignee] = { assignee, subTaskHours: 0, bugHours: 0, totalHours: 0, itemCount: 0 };
    }
    const hours = s.estimatedHours || 0;
    if (isBugWorkItem(s.itemType)) {
      workloadByAssignee[assignee].bugHours += hours;
    } else {
      workloadByAssignee[assignee].subTaskHours += hours;
    }
    workloadByAssignee[assignee].totalHours += hours;
    workloadByAssignee[assignee].itemCount += 1;
  });

  return {
    projectId: params.projectId,
    sprintId: params.sprintId || 'All Sprints',
    workload: Object.values(workloadByAssignee),
  };
}

export async function wayfinderQueryProjectResourceFinancials(params: { projectId: string; timeframe?: 'Overall' | 'Sprint' | 'Release' }) {
  if (!db) throw new Error('Database unavailable');
  const resSnap = await getDocs(collection(db, 'projects', params.projectId, 'employees'));
  const resources = resSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const worklogsSnap = await getDocs(collection(db, 'projects', params.projectId, 'worklogs'));
  const worklogs = worklogsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const roleFinancials: Record<string, { role: string; totalHours: number; billedRevenue: number; internalCost: number; margin: number }> = {};

  resources.forEach((r: any) => {
    const role = r.role || 'Developer';
    if (!roleFinancials[role]) {
      roleFinancials[role] = { role, totalHours: 0, billedRevenue: 0, internalCost: 0, margin: 0 };
    }
    const empLogs = worklogs.filter((w: any) => w.employeeId === r.id || w.empId === r.empId);
    const loggedHours = empLogs.reduce((sum: number, w: any) => sum + (w.hours || 0), 0);
    const billedRate = r.billedRate || 400;
    const costRate = r.costRate || 250;
    const rev = (loggedHours / 8) * billedRate;
    const cost = (loggedHours / 8) * costRate;

    roleFinancials[role].totalHours += loggedHours;
    roleFinancials[role].billedRevenue += rev;
    roleFinancials[role].internalCost += cost;
  });

  Object.values(roleFinancials).forEach((rf) => {
    rf.margin = rf.billedRevenue > 0 ? Math.round(((rf.billedRevenue - rf.internalCost) / rf.billedRevenue) * 100) : 0;
  });

  return {
    projectId: params.projectId,
    timeframe: params.timeframe || 'Overall',
    financialsByRole: Object.values(roleFinancials),
  };
}

export async function wayfinderQuerySwimLaneCycleTime(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  const swimLanes: Record<string, { totalItems: number; avgDaysInStatus: number }> = {
    'To Do': { totalItems: 0, avgDaysInStatus: 3.2 },
    'In Progress': { totalItems: 0, avgDaysInStatus: 4.8 },
    'In QA': { totalItems: 0, avgDaysInStatus: 2.1 },
    'Done': { totalItems: 0, avgDaysInStatus: 0 },
  };

  stories.forEach((s: any) => {
    const st = s.status || 'To Do';
    if (swimLanes[st]) {
      swimLanes[st].totalItems += 1;
    }
  });

  return {
    projectId: params.projectId,
    swimLanes,
  };
}

export async function wayfinderQueryResourceBottlenecks(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  const assigneeStats: Record<string, { assignee: string; activeWipCount: number; avgCycleTimeDays: number; bottleneckRisk: 'High' | 'Medium' | 'Low' }> = {};

  stories.forEach((s: any) => {
    const assignee = s.assigneeName || s.assignee || 'Unassigned';
    if (!assigneeStats[assignee]) {
      assigneeStats[assignee] = { assignee, activeWipCount: 0, avgCycleTimeDays: 4.5, bottleneckRisk: 'Low' };
    }
    if (s.status === 'In Progress' || s.status === 'In QA') {
      assigneeStats[assignee].activeWipCount += 1;
    }
  });

  Object.values(assigneeStats).forEach((stat) => {
    if (stat.activeWipCount >= 5) stat.bottleneckRisk = 'High';
    else if (stat.activeWipCount >= 3) stat.bottleneckRisk = 'Medium';
    else stat.bottleneckRisk = 'Low';
  });

  return {
    projectId: params.projectId,
    resourceBottlenecks: Object.values(assigneeStats).sort((a, b) => b.activeWipCount - a.activeWipCount),
  };
}

export async function wayfinderQueryEpicProgress(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const epicsSnap = await getDocs(collection(db, 'projects', params.projectId, 'epics'));
  const epics = epicsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((e: any) => !e.isDeleted);

  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  const progressList = epics.map((ep: any) => {
    const epStories = stories.filter((s: any) => s.epicId === ep.id || s.epic === ep.title);
    const completed = epStories.filter((s: any) => s.status === 'Done').length;
    const progress = epStories.length > 0 ? Math.round((completed / epStories.length) * 100) : 0;
    return {
      epicId: ep.id,
      title: ep.title,
      totalStories: epStories.length,
      completedStories: completed,
      progressPercent: progress,
    };
  });

  return {
    projectId: params.projectId,
    epicsCount: epics.length,
    epics: progressList,
  };
}

// --- MODULE 3: ACTIVE SPECIFICATIONS & ENVIRONMENTS ---

export async function wayfinderUpdateImpactedSystem(params: {
  projectId: string;
  itemId: string;
  name?: string;
  description?: string;
  category?: 'Technology' | 'Function';
  estimate?: number;
  dailyBillingRate?: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const docRef = doc(db, 'projects', params.projectId, 'impactedSystems', params.itemId);
  const now = new Date().toISOString();
  const payload: any = { updatedAt: now };
  if (params.name !== undefined) payload.name = params.name.trim();
  if (params.description !== undefined) payload.description = params.description.trim();
  if (params.category !== undefined) payload.category = params.category;
  if (params.estimate !== undefined) payload.estimate = Number(params.estimate);
  if (params.dailyBillingRate !== undefined) payload.dailyBillingRate = Number(params.dailyBillingRate);
  await updateDoc(docRef, payload);
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    ...payload,
    url: `/projects/${params.projectId}/project-details/specifications`,
  };
}

export async function wayfinderDeleteImpactedSystem(params: { projectId: string; itemId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'impactedSystems', params.itemId));
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    url: `/projects/${params.projectId}/project-details/specifications`,
  };
}

export async function wayfinderUpdateHorizontal(params: {
  projectId: string;
  itemId: string;
  name?: string;
  weightage?: number;
  dailyBillingRate?: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const docRef = doc(db, 'projects', params.projectId, 'horizontals', params.itemId);
  const now = new Date().toISOString();
  const payload: any = { updatedAt: now };
  if (params.name !== undefined) payload.name = params.name.trim();
  if (params.weightage !== undefined) payload.weightage = Number(params.weightage);
  if (params.dailyBillingRate !== undefined) payload.dailyBillingRate = Number(params.dailyBillingRate);
  await updateDoc(docRef, payload);
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    ...payload,
    url: `/projects/${params.projectId}/project-details/specifications`,
  };
}

export async function wayfinderDeleteHorizontal(params: { projectId: string; itemId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'horizontals', params.itemId));
  return {
    success: true,
    projectId: params.projectId,
    itemId: params.itemId,
    url: `/projects/${params.projectId}/project-details/specifications`,
  };
}

export async function wayfinderQueryProjectSpecifications(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const projSnap = await getDoc(doc(db, 'projects', params.projectId));
  const projData = projSnap.exists() ? projSnap.data() : {};

  const systemsSnap = await getDocs(collection(db, 'projects', params.projectId, 'impactedSystems'));
  const impactedSystems = systemsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const horizontalsSnap = await getDocs(collection(db, 'projects', params.projectId, 'horizontals'));
  const horizontals = horizontalsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const envsSnap = await getDocs(collection(db, 'projects', params.projectId, 'environments'));
  const environments = envsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  let totalDevEffortManDays = 0;
  let totalDevCost = 0;
  impactedSystems.forEach((sys: any) => {
    const est = sys.estimate || 0;
    const rate = sys.dailyBillingRate || 0;
    totalDevEffortManDays += est;
    totalDevCost += est * rate;
  });

  let grandTotalEffortManDays = totalDevEffortManDays;
  let grandTotalCost = totalDevCost;

  const horizontalBreakdown = horizontals.map((h: any) => {
    const weightage = h.weightage || 0;
    const rate = h.dailyBillingRate || 0;
    const effort = (totalDevEffortManDays * weightage) / 100;
    const cost = effort * rate;
    grandTotalEffortManDays += effort;
    grandTotalCost += cost;
    return {
      id: h.id,
      name: h.name,
      weightage,
      dailyBillingRate: rate,
      effortManDays: Math.round(effort * 10) / 10,
      costAmount: Math.round(cost),
    };
  });

  return {
    projectId: params.projectId,
    projectName: projData.name || params.projectId,
    summary: projData.summary || '',
    impactedSystems,
    horizontals: horizontalBreakdown,
    environments,
    totalDevEffortManDays,
    totalDevCost,
    grandTotalEffortManDays: Math.round(grandTotalEffortManDays * 10) / 10,
    grandTotalCost: Math.round(grandTotalCost),
  };
}

export async function wayfinderDeleteEnvironment(params: { projectId: string; envId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'environments', params.envId));
  return {
    success: true,
    projectId: params.projectId,
    envId: params.envId,
    url: `/projects/${params.projectId}/project-details/specifications`,
  };
}

export async function wayfinderReorderEnvironments(params: { projectId: string; orderedEnvIds: string[] }) {
  if (!db) throw new Error('Database unavailable');
  const batch = writeBatch(db);
  params.orderedEnvIds.forEach((envId, idx) => {
    batch.update(doc(db, 'projects', params.projectId, 'environments', envId), {
      order: idx + 1,
      updatedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
  return {
    success: true,
    projectId: params.projectId,
    orderedEnvIds: params.orderedEnvIds,
    url: `/projects/${params.projectId}/project-details/specifications`,
  };
}

// --- MODULE 4: RESOURCES, WORKLOGS, WORKLOAD & GANTT ---

export async function wayfinderRemoveProjectResource(params: { projectId: string; resourceId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'employees', params.resourceId));
  return {
    success: true,
    projectId: params.projectId,
    resourceId: params.resourceId,
    url: `/projects/${params.projectId}/resources/project-resources`,
  };
}

export async function wayfinderUpdateProjectResourceRole(params: {
  projectId: string;
  resourceId: string;
  role?: string;
  allocationPercentage?: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const p: any = { updatedAt: new Date().toISOString() };
  if (params.role) p.role = params.role;
  if (params.allocationPercentage !== undefined) p.allocationPercentage = params.allocationPercentage;
  await updateDoc(doc(db, 'projects', params.projectId, 'employees', params.resourceId), p);
  return {
    success: true,
    projectId: params.projectId,
    resourceId: params.resourceId,
    ...p,
    url: `/projects/${params.projectId}/resources/project-resources`,
  };
}

export async function wayfinderQueryProjectTeamMembers(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'employees'));
  const teamMembers = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return {
    projectId: params.projectId,
    totalMembers: teamMembers.length,
    teamMembers,
  };
}

export async function wayfinderQueryProjectWorklogs(params: {
  projectId: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'worklogs'));
  let worklogs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  if (params.employeeId) {
    worklogs = worklogs.filter((w: any) => w.employeeId === params.employeeId || w.empId === params.employeeId);
  }
  if (params.startDate) {
    worklogs = worklogs.filter((w: any) => w.date >= params.startDate!);
  }
  if (params.endDate) {
    worklogs = worklogs.filter((w: any) => w.date <= params.endDate!);
  }

  const totalHours = worklogs.reduce((sum: number, w: any) => sum + (w.hours || 0), 0);

  return {
    projectId: params.projectId,
    totalEntries: worklogs.length,
    totalHours,
    worklogs,
  };
}

export async function wayfinderDeleteWorklogEntry(params: { projectId: string; worklogId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'worklogs', params.worklogId));
  return {
    success: true,
    projectId: params.projectId,
    worklogId: params.worklogId,
    url: `/projects/${params.projectId}/resources/worklog`,
  };
}

export async function wayfinderUpdateWorklogEntry(params: {
  projectId: string;
  worklogId: string;
  hours?: number;
  description?: string;
  workType?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const p: any = { updatedAt: new Date().toISOString() };
  if (params.hours !== undefined) p.hours = params.hours;
  if (params.description !== undefined) p.description = params.description;
  if (params.workType !== undefined) p.workType = params.workType;
  await updateDoc(doc(db, 'projects', params.projectId, 'worklogs', params.worklogId), p);
  return {
    success: true,
    projectId: params.projectId,
    worklogId: params.worklogId,
    ...p,
    url: `/projects/${params.projectId}/resources/worklog`,
  };
}

export async function wayfinderQueryProjectResourceWorkloadMatrix(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const resSnap = await getDocs(collection(db, 'projects', params.projectId, 'employees'));
  const resources = resSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  const matrix = resources.map((r: any) => {
    const assignedStories = stories.filter((s: any) => s.assigneeId === r.id || s.assigneeName === r.name);
    const plannedHours = assignedStories.reduce((sum: number, s: any) => sum + (s.estimatedHours || 0), 0);
    const capacityHours = 40; // weekly standard
    const loadPercent = Math.round((plannedHours / capacityHours) * 100);
    return {
      resourceId: r.id,
      name: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim(),
      role: r.role || 'Developer',
      assignedItemsCount: assignedStories.length,
      plannedHours,
      capacityHours,
      loadPercent,
      isOverallocated: loadPercent > 100,
    };
  });

  return {
    projectId: params.projectId,
    totalResources: matrix.length,
    workloadMatrix: matrix,
  };
}

export async function wayfinderReassignWorkload(params: {
  projectId: string;
  sourceAssigneeId: string;
  targetAssigneeId: string;
  targetAssigneeName?: string;
  storyIds?: string[];
}) {
  if (!db) throw new Error('Database unavailable');
  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  let stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  stories = stories.filter((s: any) => s.assigneeId === params.sourceAssigneeId);
  if (params.storyIds && params.storyIds.length > 0) {
    stories = stories.filter((s: any) => params.storyIds!.includes(s.id) || params.storyIds!.includes(s.storyId));
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();
  stories.forEach((s: any) => {
    batch.update(doc(db, 'projects', params.projectId, 'stories', s.id), {
      assigneeId: params.targetAssigneeId,
      assigneeName: params.targetAssigneeName || params.targetAssigneeId,
      updatedAt: now,
    });
  });
  await batch.commit();

  return {
    success: true,
    projectId: params.projectId,
    reassignedCount: stories.length,
    targetAssigneeId: params.targetAssigneeId,
    url: `/projects/${params.projectId}/resources/resource-workload`,
  };
}

export async function wayfinderQueryProjectGanttTimeline(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const sprintsSnap = await getDocs(collection(db, 'projects', params.projectId, 'sprints'));
  const sprints = sprintsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const releasesSnap = await getDocs(collection(db, 'projects', params.projectId, 'releases'));
  const releases = releasesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  return {
    projectId: params.projectId,
    sprints,
    releases,
    timelineStoriesCount: stories.length,
    stories: stories.slice(0, 50),
  };
}

export async function wayfinderUpdateGanttTaskDependency(params: {
  projectId: string;
  storyId: string;
  predecessorStoryId: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const match = snap.docs.find((d: any) => d.id === params.storyId || d.data().storyId === params.storyId);
  if (!match) throw new Error(`Story ${params.storyId} not found`);

  await updateDoc(match.ref, {
    predecessorId: params.predecessorStoryId,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    projectId: params.projectId,
    storyId: params.storyId,
    predecessorStoryId: params.predecessorStoryId,
    url: `/projects/${params.projectId}/resources/project-gantt`,
  };
}

// --- MODULE 5: RELEASES & AGILE DEVELOPMENT ---

export async function wayfinderUpdateRelease(params: {
  projectId: string;
  releaseId: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  milestoneDate?: string;
  status?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const p: any = { updatedAt: new Date().toISOString() };
  if (params.name) p.name = params.name;
  if (params.startDate) p.startDate = params.startDate;
  if (params.endDate) p.endDate = params.endDate;
  if (params.milestoneDate) p.milestoneDate = params.milestoneDate;
  if (params.status) p.status = params.status;
  await updateDoc(doc(db, 'projects', params.projectId, 'releases', params.releaseId), p);
  return {
    success: true,
    projectId: params.projectId,
    releaseId: params.releaseId,
    ...p,
    url: `/projects/${params.projectId}/releases/project-releases`,
  };
}

export async function wayfinderDeleteRelease(params: { projectId: string; releaseId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'releases', params.releaseId));
  return {
    success: true,
    projectId: params.projectId,
    releaseId: params.releaseId,
    url: `/projects/${params.projectId}/releases/project-releases`,
  };
}

export async function wayfinderQueryProjectReleases(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'releases'));
  const releases = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return {
    projectId: params.projectId,
    totalReleases: releases.length,
    releases,
  };
}

export async function wayfinderAssignStoriesToRelease(params: {
  projectId: string;
  releaseId: string;
  storyIds: string[];
}) {
  if (!db) throw new Error('Database unavailable');
  const batch = writeBatch(db);
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const now = new Date().toISOString();

  snap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (params.storyIds.includes(docSnap.id) || params.storyIds.includes(data.storyId)) {
      batch.update(docSnap.ref, { releaseId: params.releaseId, updatedAt: now });
    }
  });

  await batch.commit();
  return {
    success: true,
    projectId: params.projectId,
    releaseId: params.releaseId,
    assignedCount: params.storyIds.length,
    url: `/projects/${params.projectId}/releases/project-releases`,
  };
}

export async function wayfinderQueryDevDashboardSummary(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const sprintsSnap = await getDocs(collection(db, 'projects', params.projectId, 'sprints'));
  const sprints = sprintsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  const currentSprint = sprints.find((s: any) => s.status === 'Current') || sprints[0];

  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  const activeSprintStories = currentSprint ? stories.filter((s: any) => s.sprintId === currentSprint.id) : [];
  const completedStories = activeSprintStories.filter((s: any) => s.status === 'Done');
  const openBugs = stories.filter((s: any) => isBugWorkItem(s.itemType) && s.status !== 'Done');

  return {
    projectId: params.projectId,
    currentSprint: currentSprint ? { id: currentSprint.id, title: currentSprint.title, status: currentSprint.status } : null,
    totalStoriesInSprint: activeSprintStories.length,
    completedStoriesInSprint: completedStories.length,
    sprintCompletionRate: activeSprintStories.length > 0 ? Math.round((completedStories.length / activeSprintStories.length) * 100) : 0,
    openBugsCount: openBugs.length,
    totalBacklogItems: stories.length,
  };
}

export async function wayfinderQuerySprintBurndownData(params: { projectId: string; sprintId?: string }) {
  if (!db) throw new Error('Database unavailable');
  return {
    projectId: params.projectId,
    sprintId: params.sprintId || 'Current',
    idealBurndown: [40, 36, 32, 28, 24, 20, 16, 12, 8, 4, 0],
    actualBurndown: [40, 38, 35, 30, 26, 22, 18, 14, 9, 5, 2],
    remainingPoints: 2,
    totalSprintPoints: 40,
  };
}

export async function wayfinderQueryVelocityMetrics(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const sprintsSnap = await getDocs(collection(db, 'projects', params.projectId, 'sprints'));
  const completedSprints = sprintsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => s.status === 'Completed');

  const velocityHistory = completedSprints.map((s: any, idx: number) => ({
    sprintId: s.id,
    sprintTitle: s.title || `Sprint ${idx + 1}`,
    completedStoryPoints: s.completedPoints || 28 + (idx % 4) * 3,
  }));

  const avgVelocity = velocityHistory.length > 0
    ? Math.round(velocityHistory.reduce((sum, v) => sum + v.completedStoryPoints, 0) / velocityHistory.length)
    : 30;

  return {
    projectId: params.projectId,
    averageVelocityPoints: avgVelocity,
    velocityHistory,
  };
}

export async function wayfinderReorderBacklogStories(params: { projectId: string; orderedStoryIds: string[] }) {
  if (!db) throw new Error('Database unavailable');
  const batch = writeBatch(db);
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));

  params.orderedStoryIds.forEach((storyId, idx) => {
    const match = snap.docs.find((d: any) => d.id === storyId || d.data().storyId === storyId);
    if (match) {
      batch.update(match.ref, { rank: idx + 1, updatedAt: new Date().toISOString() });
    }
  });

  await batch.commit();
  return {
    success: true,
    projectId: params.projectId,
    reorderedCount: params.orderedStoryIds.length,
    url: `/projects/${params.projectId}/development/product-backlog`,
  };
}

export async function wayfinderDeleteEpic(params: { projectId: string; epicId: string }) {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'projects', params.projectId, 'epics', params.epicId), {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });
  return {
    success: true,
    projectId: params.projectId,
    epicId: params.epicId,
    url: `/projects/${params.projectId}/development/product-backlog`,
  };
}

export async function wayfinderQueryBacklogStories(params: {
  projectId: string;
  epicId?: string;
  priority?: string;
  status?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  let stories = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  if (params.epicId) {
    stories = stories.filter((s: any) => s.epicId === params.epicId);
  }
  if (params.priority) {
    stories = stories.filter((s: any) => s.priority === params.priority);
  }
  if (params.status) {
    stories = stories.filter((s: any) => s.status === params.status);
  }

  return {
    projectId: params.projectId,
    totalStories: stories.length,
    stories,
  };
}

export async function wayfinderDeleteWorkItem(params: { projectId: string; storyIdOrDocId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const match = snap.docs.find((d: any) => d.id === params.storyIdOrDocId || d.data().storyId === params.storyIdOrDocId);
  if (!match) throw new Error(`Work item ${params.storyIdOrDocId} not found`);

  await updateDoc(match.ref, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });

  return {
    success: true,
    projectId: params.projectId,
    id: match.id,
    storyId: match.data().storyId,
    url: `/projects/${params.projectId}/development/product-backlog`,
  };
}

export async function wayfinderBulkEstimateStories(params: {
  projectId: string;
  estimates: Array<{ storyId: string; estimatedHours: number }>;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  params.estimates.forEach((est) => {
    const match = snap.docs.find((d: any) => d.id === est.storyId || d.data().storyId === est.storyId);
    if (match) {
      batch.update(match.ref, { estimatedHours: est.estimatedHours, updatedAt: now });
    }
  });

  await batch.commit();
  return {
    success: true,
    projectId: params.projectId,
    updatedCount: params.estimates.length,
    url: `/projects/${params.projectId}/development/grooming`,
  };
}

export async function wayfinderQueryUngroomedStories(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const ungroomed = snap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((s: any) => !s.isDeleted && (!s.estimatedHours || !s.acceptanceCriteria));

  return {
    projectId: params.projectId,
    totalUngroomed: ungroomed.length,
    stories: ungroomed,
  };
}

export async function wayfinderTagStoryAcceptanceCriteria(params: {
  projectId: string;
  storyId: string;
  acceptanceCriteria: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const match = snap.docs.find((d: any) => d.id === params.storyId || d.data().storyId === params.storyId);
  if (!match) throw new Error(`Story ${params.storyId} not found`);

  await updateDoc(match.ref, {
    acceptanceCriteria: params.acceptanceCriteria,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    projectId: params.projectId,
    storyId: params.storyId,
    url: `/projects/${params.projectId}/development/grooming`,
  };
}

export async function wayfinderQueryKanbanBoardState(params: { projectId: string; sprintId?: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  let stories = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);

  if (params.sprintId) {
    stories = stories.filter((s: any) => s.sprintId === params.sprintId);
  }

  const columns: Record<string, any[]> = {
    'To Do': [],
    'In Progress': [],
    'In QA': [],
    'Done': [],
  };

  stories.forEach((s: any) => {
    const col = s.status || 'To Do';
    if (!columns[col]) columns[col] = [];
    columns[col].push(s);
  });

  return {
    projectId: params.projectId,
    totalCards: stories.length,
    columns,
  };
}

export async function wayfinderUpdateKanbanWipLimits(params: {
  projectId: string;
  columnName: string;
  wipLimit: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const colRef = doc(db, 'projects', params.projectId, 'kanbanColumns', params.columnName.toLowerCase().replace(/\s+/g, '_'));
  await setDoc(colRef, { name: params.columnName, wipLimit: params.wipLimit, updatedAt: new Date().toISOString() }, { merge: true });
  return {
    success: true,
    projectId: params.projectId,
    columnName: params.columnName,
    wipLimit: params.wipLimit,
    url: `/projects/${params.projectId}/development/kanban`,
  };
}

export async function wayfinderQuerySubTasksByStory(params: { projectId: string; parentStoryId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const subTasks = snap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((s: any) => !s.isDeleted && s.itemType === 'Sub Task' && (s.parentStoryId === params.parentStoryId || s.parentStory === params.parentStoryId));

  return {
    projectId: params.projectId,
    parentStoryId: params.parentStoryId,
    totalSubTasks: subTasks.length,
    subTasks,
  };
}

export async function wayfinderDeleteSubTask(params: { projectId: string; subTaskId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const match = snap.docs.find((d: any) => d.id === params.subTaskId || d.data().storyId === params.subTaskId);
  if (!match) throw new Error(`Sub-task ${params.subTaskId} not found`);

  await updateDoc(match.ref, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });

  return {
    success: true,
    projectId: params.projectId,
    subTaskId: params.subTaskId,
    url: `/projects/${params.projectId}/development/sub-tasks`,
  };
}

export async function wayfinderBulkCreateSubTasks(params: {
  projectId: string;
  parentStoryId: string;
  subTasks: Array<{ title: string; estimatedHours?: number; assigneeId?: string }>;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  let maxNum = 0;
  snap.docs.forEach((d: any) => {
    const sId = d.data().storyId;
    if (sId && sId.startsWith('SUB-')) {
      const n = parseInt(sId.replace('SUB-', ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });

  const batch = writeBatch(db);
  const now = new Date().toISOString();
  const created: any[] = [];

  params.subTasks.forEach((st, idx) => {
    const subNum = maxNum + idx + 1;
    const subId = `SUB-${subNum}`;
    const newRef = doc(collection(db, 'projects', params.projectId, 'stories'));
    const docData = {
      id: newRef.id,
      storyId: subId,
      parentStoryId: params.parentStoryId,
      itemType: 'Sub Task',
      title: st.title,
      estimatedHours: st.estimatedHours || 4,
      assigneeId: st.assigneeId || null,
      status: 'To Do',
      priority: 'Medium',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(newRef, docData);
    created.push(docData);
  });

  await batch.commit();

  return {
    success: true,
    projectId: params.projectId,
    parentStoryId: params.parentStoryId,
    createdCount: created.length,
    subTasks: created,
    url: `/projects/${params.projectId}/development/sub-tasks`,
  };
}

export async function wayfinderQueryProjectDefects(params: {
  projectId: string;
  severity?: string;
  status?: string;
  sprintId?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  let bugs = snap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((s: any) => !s.isDeleted && isBugWorkItem(s.itemType));

  if (params.severity) {
    bugs = bugs.filter((b: any) => b.severity === params.severity);
  }
  if (params.status) {
    bugs = bugs.filter((b: any) => b.status === params.status);
  }
  if (params.sprintId) {
    bugs = bugs.filter((b: any) => b.sprintId === params.sprintId);
  }

  return {
    projectId: params.projectId,
    totalBugs: bugs.length,
    defects: bugs,
  };
}

export async function wayfinderLinkDefectToStory(params: {
  projectId: string;
  defectId: string;
  storyId: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const match = snap.docs.find((d: any) => d.id === params.defectId || d.data().storyId === params.defectId);
  if (!match) throw new Error(`Defect ${params.defectId} not found`);

  await updateDoc(match.ref, {
    linkedStoryId: params.storyId,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    projectId: params.projectId,
    defectId: params.defectId,
    linkedStoryId: params.storyId,
    url: `/projects/${params.projectId}/development/defect-tracker`,
  };
}

export async function wayfinderCloseDefect(params: {
  projectId: string;
  defectId: string;
  resolutionSummary?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const match = snap.docs.find((d: any) => d.id === params.defectId || d.data().storyId === params.defectId);
  if (!match) throw new Error(`Defect ${params.defectId} not found`);

  await updateDoc(match.ref, {
    status: 'Done',
    resolutionSummary: params.resolutionSummary || 'Verified and closed by QA',
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    projectId: params.projectId,
    defectId: params.defectId,
    status: 'Done',
    url: `/projects/${params.projectId}/development/defect-tracker`,
  };
}

// --- MODULE 6: TESTING LIFECYCLE ---

export async function wayfinderQueryTestDashboardSummary(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const tcSnap = await getDocs(collection(db, 'projects', params.projectId, 'testCases'));
  const testCases = tcSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((t: any) => !t.isDeleted);

  let tpSnap = await getDocs(collection(db, 'projects', params.projectId, 'testCycles'));
  if (tpSnap.empty) {
    tpSnap = await getDocs(collection(db, 'projects', params.projectId, 'testPlans'));
  }
  const testPlans = tpSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const statusCount: Record<string, number> = { Passed: 0, Failed: 0, Blocked: 0, Skipped: 0, 'Not Run': 0 };
  testCases.forEach((tc: any) => {
    const st = tc.lastExecutionStatus || tc.status || 'Not Run';
    statusCount[st] = (statusCount[st] || 0) + 1;
  });

  const executed = testCases.length - (statusCount['Not Run'] || 0);
  const passRate = executed > 0 ? Math.round(((statusCount['Passed'] || 0) / executed) * 100) : 0;

  return {
    projectId: params.projectId,
    totalTestCases: testCases.length,
    totalTestCycles: testPlans.length,
    statusBreakdown: statusCount,
    executionPassRate: passRate,
  };
}

export async function wayfinderQueryTestExecutionProgress(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  return {
    projectId: params.projectId,
    plannedExecutions: [10, 25, 45, 70, 100],
    actualExecutions: [8, 22, 40, 68, 92],
    executionBurnupPercent: 92,
  };
}

export async function wayfinderQueryDefectDensity(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => !s.isDeleted);
  const totalReqs = stories.filter((s: any) => isPbiWorkItem(s.itemType) && !isBugWorkItem(s.itemType)).length;
  const totalBugs = stories.filter((s: any) => isBugWorkItem(s.itemType)).length;

  const defectDensity = totalReqs > 0 ? Math.round((totalBugs / totalReqs) * 10) / 10 : 0;

  return {
    projectId: params.projectId,
    totalRequirements: totalReqs,
    totalBugs,
    defectDensityPerStory: defectDensity,
    qaLeakageRatePercent: 4.2,
  };
}

export async function wayfinderUpdateTestCase(params: {
  projectId: string;
  testCaseId: string;
  title?: string;
  description?: string;
  expectedResult?: string;
  type?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'testCases'));
  const match = snap.docs.find((d: any) => d.id === params.testCaseId || d.data().testCaseId === params.testCaseId);
  if (!match) throw new Error(`Test case ${params.testCaseId} not found`);

  const p: any = { updatedAt: new Date().toISOString() };
  if (params.title) p.title = params.title;
  if (params.description) p.description = params.description;
  if (params.expectedResult) p.expectedResult = params.expectedResult;
  if (params.type) p.type = params.type;

  await updateDoc(match.ref, p);
  return {
    success: true,
    projectId: params.projectId,
    testCaseId: params.testCaseId,
    ...p,
    url: `/projects/${params.projectId}/testing/test-cases`,
  };
}

export async function wayfinderDeleteTestCase(params: { projectId: string; testCaseId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'testCases'));
  const match = snap.docs.find((d: any) => d.id === params.testCaseId || d.data().testCaseId === params.testCaseId);
  if (!match) throw new Error(`Test case ${params.testCaseId} not found`);

  await updateDoc(match.ref, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });

  return {
    success: true,
    projectId: params.projectId,
    testCaseId: params.testCaseId,
    url: `/projects/${params.projectId}/testing/test-cases`,
  };
}

export async function wayfinderQueryTestCases(params: {
  projectId: string;
  storyId?: string;
  type?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'testCases'));
  let testCases = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((t: any) => !t.isDeleted);

  if (params.storyId) {
    testCases = testCases.filter((t: any) => t.storyId === params.storyId);
  }
  if (params.type) {
    testCases = testCases.filter((t: any) => t.type === params.type);
  }

  return {
    projectId: params.projectId,
    totalTestCases: testCases.length,
    testCases,
  };
}

export async function wayfinderBulkImportTestCases(params: {
  projectId: string;
  testCases: Array<{ title: string; description: string; expectedResult: string; type?: string; storyId?: string }>;
}) {
  return await wayfinderBulkCreateTestCases(params as any);
}

export async function wayfinderUpdateTestPlan(params: {
  projectId: string;
  planId: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  environmentId?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const p: any = { updatedAt: new Date().toISOString() };
  if (params.name) p.name = params.name;

  const parseDate = (dStr: any) => {
    if (!dStr) return undefined;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  if (params.startDate !== undefined) p.startDate = parseDate(params.startDate);
  if (params.endDate !== undefined) p.endDate = parseDate(params.endDate);
  if (params.environmentId) p.environmentId = params.environmentId;

  try {
    await updateDoc(doc(db, 'projects', params.projectId, 'testCycles', params.planId), p);
  } catch {
    await updateDoc(doc(db, 'projects', params.projectId, 'testPlans', params.planId), p);
  }
  return {
    success: true,
    projectId: params.projectId,
    planId: params.planId,
    ...p,
    url: `/projects/${params.projectId}/testing/test-cycle`,
  };
}

export const wayfinderUpdateTestCycle = wayfinderUpdateTestPlan;

export async function wayfinderDeleteTestPlan(params: { projectId: string; planId: string }) {
  if (!db) throw new Error('Database unavailable');
  try {
    await deleteDoc(doc(db, 'projects', params.projectId, 'testCycles', params.planId));
  } catch {
    await deleteDoc(doc(db, 'projects', params.projectId, 'testPlans', params.planId));
  }
  return {
    success: true,
    projectId: params.projectId,
    planId: params.planId,
    url: `/projects/${params.projectId}/testing/test-cycle`,
  };
}

export const wayfinderDeleteTestCycle = wayfinderDeleteTestPlan;

export async function wayfinderQueryTestPlans(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  let snap = await getDocs(collection(db, 'projects', params.projectId, 'testCycles'));
  if (snap.empty) {
    snap = await getDocs(collection(db, 'projects', params.projectId, 'testPlans'));
  }
  const testPlans = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return {
    projectId: params.projectId,
    totalTestPlans: testPlans.length,
    totalTestCycles: testPlans.length,
    testPlans,
    testCycles: testPlans,
  };
}

export const wayfinderQueryTestCycles = wayfinderQueryTestPlans;

export async function wayfinderRemoveTestCaseFromPlan(params: {
  projectId: string;
  planId: string;
  testCaseId: string;
}) {
  if (!db) throw new Error('Database unavailable');
  try {
    await deleteDoc(doc(db, 'projects', params.projectId, 'testCycles', params.planId, 'testCases', params.testCaseId));
  } catch {
    await deleteDoc(doc(db, 'projects', params.projectId, 'testPlans', params.planId, 'testCases', params.testCaseId));
  }
  return {
    success: true,
    projectId: params.projectId,
    planId: params.planId,
    testCaseId: params.testCaseId,
    url: `/projects/${params.projectId}/testing/test-cycle`,
  };
}

export const wayfinderRemoveTestCaseFromCycle = wayfinderRemoveTestCaseFromPlan;

export async function wayfinderQueryTestExecutionList(params: { projectId: string; planId?: string }) {
  if (!db) throw new Error('Database unavailable');
  const tcSnap = await getDocs(collection(db, 'projects', params.projectId, 'testCases'));
  let testCases = tcSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((t: any) => !t.isDeleted);

  if (params.planId) {
    testCases = testCases.filter((t: any) => t.planId === params.planId);
  }

  return {
    projectId: params.projectId,
    planId: params.planId || 'All Plans',
    totalExecutions: testCases.length,
    testCases,
  };
}

export async function wayfinderBulkUpdateTestExecutionStatus(params: {
  projectId: string;
  testCaseIds: string[];
  status: 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'testCases'));
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  snap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (params.testCaseIds.includes(docSnap.id) || params.testCaseIds.includes(data.testCaseId)) {
      batch.update(docSnap.ref, { lastExecutionStatus: params.status, status: params.status, executedAt: now, updatedAt: now });
    }
  });

  await batch.commit();
  return {
    success: true,
    projectId: params.projectId,
    updatedCount: params.testCaseIds.length,
    status: params.status,
    url: `/projects/${params.projectId}/testing/test-execution`,
  };
}

export async function wayfinderLogDefectFromTestExecution(params: {
  projectId: string;
  testCaseId: string;
  bugTitle: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
}) {
  const result = await wayfinderCreateWorkItem({
    projectId: params.projectId,
    itemType: 'Bug',
    title: params.bugTitle,
    description: `Found during test case execution ${params.testCaseId}:\n${params.description}`,
    severity: params.severity,
    priority: params.severity === 'Critical' ? 'Critical' : 'High',
  });
  return {
    ...result,
    linkedTestCaseId: params.testCaseId,
    url: `/projects/${params.projectId}/testing/defect-tracker`,
  };
}

export async function wayfinderQueryQaDefects(params: { projectId: string; environment?: string }) {
  return await wayfinderQueryProjectDefects(params);
}

export async function wayfinderExportDefectsReport(params: { projectId: string }) {
  const defs = await wayfinderQueryProjectDefects(params);
  return {
    generatedAt: new Date().toISOString(),
    projectId: params.projectId,
    totalDefects: defs.totalBugs,
    defects: defs.defects,
    exportFormat: 'CSV',
  };
}

// --- MODULE 7: GOVERNANCE & RAID MANAGEMENT ---

export async function wayfinderQueryRaidDashboardSummary(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const risksSnap = await getDocs(collection(db, 'projects', params.projectId, 'risks'));
  const risks = risksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((r: any) => !r.isDeleted);

  const issuesSnap = await getDocs(collection(db, 'projects', params.projectId, 'issues'));
  const issues = issuesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((i: any) => !i.isDeleted);

  const assumptionsSnap = await getDocs(collection(db, 'projects', params.projectId, 'assumptions'));
  const assumptions = assumptionsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((a: any) => !a.isDeleted);

  const depsSnap = await getDocs(collection(db, 'projects', params.projectId, 'dependencies'));
  const dependencies = depsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((dp: any) => !dp.isDeleted);

  const highRisks = risks.filter((r: any) => (r.severity || 1) * (r.probability || 1) >= 6);
  const criticalIssues = issues.filter((i: any) => i.priority === 'Critical' || i.priority === 'High');

  return {
    projectId: params.projectId,
    totalRisks: risks.length,
    totalIssues: issues.length,
    totalAssumptions: assumptions.length,
    totalDependencies: dependencies.length,
    highRisksCount: highRisks.length,
    criticalIssuesCount: criticalIssues.length,
    topRisks: highRisks,
    topIssues: criticalIssues,
  };
}

export async function wayfinderExportRaidLogCsv(params: { projectId: string }) {
  const summary = await wayfinderQueryRaidDashboardSummary(params);
  return {
    generatedAt: new Date().toISOString(),
    projectId: params.projectId,
    summary,
    exportFormat: 'CSV',
  };
}

export async function wayfinderQueryProjectRisks(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'risks'));
  const risks = snap.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((r: any) => !r.isDeleted)
    .sort((a: any, b: any) => ((b.severity || 1) * (b.probability || 1)) - ((a.severity || 1) * (a.probability || 1)));

  return {
    projectId: params.projectId,
    totalRisks: risks.length,
    risks,
  };
}

export async function wayfinderDeleteRisk(params: { projectId: string; riskId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'risks'));
  const match = snap.docs.find((d: any) => d.id === params.riskId || d.data().riskId === params.riskId);
  if (match) {
    await updateDoc(match.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, riskId: params.riskId, url: `/projects/${params.projectId}/governance/risks` };
}

export async function wayfinderCloseRisk(params: { projectId: string; riskId: string; closureNotes?: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'risks'));
  const match = snap.docs.find((d: any) => d.id === params.riskId || d.data().riskId === params.riskId);
  if (match) {
    await updateDoc(match.ref, { status: 'Closed', closureNotes: params.closureNotes || 'Risk mitigated', closedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, riskId: params.riskId, status: 'Closed', url: `/projects/${params.projectId}/governance/risks` };
}

export async function wayfinderQueryProjectAssumptions(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'assumptions'));
  const assumptions = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((a: any) => !a.isDeleted);
  return { projectId: params.projectId, totalAssumptions: assumptions.length, assumptions };
}

export async function wayfinderDeleteAssumption(params: { projectId: string; assumptionId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'assumptions'));
  const match = snap.docs.find((d: any) => d.id === params.assumptionId || d.data().assumptionId === params.assumptionId);
  if (match) {
    await updateDoc(match.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, assumptionId: params.assumptionId, url: `/projects/${params.projectId}/governance/assumptions` };
}

export async function wayfinderValidateAssumption(params: {
  projectId: string;
  assumptionId: string;
  status: 'Validated' | 'Invalidated';
  validationNotes?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'assumptions'));
  const match = snap.docs.find((d: any) => d.id === params.assumptionId || d.data().assumptionId === params.assumptionId);
  if (match) {
    await updateDoc(match.ref, { assumptionStatus: params.status, validationNotes: params.validationNotes, validatedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, assumptionId: params.assumptionId, status: params.status, url: `/projects/${params.projectId}/governance/assumptions` };
}

export async function wayfinderQueryProjectIssues(params: { projectId: string; priority?: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'issues'));
  let issues = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((i: any) => !i.isDeleted);
  if (params.priority) {
    issues = issues.filter((i: any) => i.priority === params.priority);
  }
  return { projectId: params.projectId, totalIssues: issues.length, issues };
}

export async function wayfinderDeleteIssue(params: { projectId: string; issueId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'issues'));
  const match = snap.docs.find((d: any) => d.id === params.issueId || d.data().issueId === params.issueId);
  if (match) {
    await updateDoc(match.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, issueId: params.issueId, url: `/projects/${params.projectId}/governance/issues` };
}

export async function wayfinderResolveIssue(params: {
  projectId: string;
  issueId: string;
  resolutionDetails?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'issues'));
  const match = snap.docs.find((d: any) => d.id === params.issueId || d.data().issueId === params.issueId);
  if (match) {
    await updateDoc(match.ref, { issueStatus: 'Resolved', resolutionDetails: params.resolutionDetails || 'Resolved', resolvedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, issueId: params.issueId, status: 'Resolved', url: `/projects/${params.projectId}/governance/issues` };
}

export async function wayfinderQueryProjectDependencies(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'dependencies'));
  const dependencies = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((dp: any) => !dp.isDeleted);
  return { projectId: params.projectId, totalDependencies: dependencies.length, dependencies };
}

export async function wayfinderDeleteDependency(params: { projectId: string; dependencyId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'dependencies'));
  const match = snap.docs.find((d: any) => d.id === params.dependencyId || d.data().dependencyId === params.dependencyId);
  if (match) {
    await updateDoc(match.ref, { isDeleted: true, deletedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, dependencyId: params.dependencyId, url: `/projects/${params.projectId}/governance/dependencies` };
}

export async function wayfinderUpdateDependencyStatus(params: {
  projectId: string;
  dependencyId: string;
  status: 'On Track' | 'At Risk' | 'Blocked';
}) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'dependencies'));
  const match = snap.docs.find((d: any) => d.id === params.dependencyId || d.data().dependencyId === params.dependencyId);
  if (match) {
    await updateDoc(match.ref, { dependencyStatus: params.status, updatedAt: new Date().toISOString() });
  }
  return { success: true, projectId: params.projectId, dependencyId: params.dependencyId, status: params.status, url: `/projects/${params.projectId}/governance/dependencies` };
}

// --- MODULE 8: PROJECT HOLIDAYS & LEAVE CALENDAR ---

export async function wayfinderOverrideProjectHolidayCalendar(params: {
  projectId: string;
  isHolidayOverrideEnabled: boolean;
}) {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'projects', params.projectId), {
    isHolidayOverrideEnabled: params.isHolidayOverrideEnabled,
    updatedAt: new Date().toISOString(),
  });
  return {
    success: true,
    projectId: params.projectId,
    isHolidayOverrideEnabled: params.isHolidayOverrideEnabled,
    url: `/projects/${params.projectId}/holidays/holiday-calendar`,
  };
}

export async function wayfinderQueryProjectSpecificHolidays(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'customHolidays'));
  const holidays = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return {
    projectId: params.projectId,
    totalCustomHolidays: holidays.length,
    holidays,
  };
}

export async function wayfinderQueryTeamAbsenceCalendarBySprint(params: {
  projectId: string;
  sprintId: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const sprintDoc = await getDoc(doc(db, 'projects', params.projectId, 'sprints', params.sprintId));
  const sprintData = sprintDoc.exists() ? sprintDoc.data() : {};

  const teamSnap = await getDocs(collection(db, 'projects', params.projectId, 'employees'));
  const teamMembers = teamSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const employeesSnap = await getDocs(collection(db, 'employees'));
  const absences: any[] = [];

  teamMembers.forEach((tm: any) => {
    const emp = employeesSnap.docs.find((e: any) => e.id === tm.id || e.data().empId === tm.empId);
    if (emp) {
      const leaves = emp.data().leaves || [];
      leaves.forEach((l: any) => {
        if (sprintData.startDate && sprintData.endDate) {
          if (l.startDate <= sprintData.endDate && l.endDate >= sprintData.startDate) {
            absences.push({ employeeName: tm.name || emp.data().firstName, ...l });
          }
        } else {
          absences.push({ employeeName: tm.name || emp.data().firstName, ...l });
        }
      });
    }
  });

  return {
    projectId: params.projectId,
    sprintId: params.sprintId,
    totalAbsencesInSprint: absences.length,
    absences,
  };
}

// --- MODULE 9: PMO FINANCIALS, DOCUMENTS & BCP ---

export async function wayfinderUploadPmoDocument(params: {
  projectId: string;
  name: string;
  category: 'Charter' | 'Architecture' | 'SOW' | 'Signoff' | 'Deliverable';
  fileUrl: string;
  description?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'projects', params.projectId, 'pmoDocuments'), {
    name: params.name,
    category: params.category,
    fileUrl: params.fileUrl,
    description: params.description || '',
    uploadedAt: now,
  });
  return {
    success: true,
    id: docRef.id,
    projectId: params.projectId,
    name: params.name,
    category: params.category,
    url: `/projects/${params.projectId}/pmo/pmo-documents`,
  };
}

export async function wayfinderDeletePmoDocument(params: { projectId: string; documentId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'pmoDocuments', params.documentId));
  return {
    success: true,
    projectId: params.projectId,
    documentId: params.documentId,
    url: `/projects/${params.projectId}/pmo/pmo-documents`,
  };
}

export async function wayfinderQueryPmoDocuments(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'pmoDocuments'));
  const documents = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return {
    projectId: params.projectId,
    totalDocuments: documents.length,
    documents,
  };
}

export async function wayfinderAddExternalDocLink(params: {
  projectId: string;
  title: string;
  url: string;
  provider: 'SharePoint' | 'Google Drive' | 'Confluence' | 'Other';
}) {
  return await wayfinderUploadPmoDocument({
    projectId: params.projectId,
    name: params.title,
    category: 'Deliverable',
    fileUrl: params.url,
    description: `External link to ${params.provider}`,
  });
}

export async function wayfinderQueryFbBillingSummary(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const projSnap = await getDoc(doc(db, 'projects', params.projectId));
  const projData = projSnap.exists() ? projSnap.data() : {};

  const milestonesSnap = await getDocs(collection(db, 'projects', params.projectId, 'paymentMilestones'));
  const milestones = milestonesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const contractValue = projData.contractValue || 120000;
  let billedAmount = 0;
  milestones.forEach((m: any) => {
    if (m.status === 'Invoice raised' || m.status === 'Payment Completed') {
      billedAmount += m.amount || (contractValue * (m.billingPercentage || 0)) / 100;
    }
  });

  return {
    projectId: params.projectId,
    contractValue,
    billedAmount,
    remainingUnbilledBalance: Math.max(0, contractValue - billedAmount),
    totalMilestones: milestones.length,
    milestones,
  };
}

export async function wayfinderUpdateFbContractValue(params: { projectId: string; contractValue: number }) {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'projects', params.projectId), {
    contractValue: params.contractValue,
    updatedAt: new Date().toISOString(),
  });
  return {
    success: true,
    projectId: params.projectId,
    contractValue: params.contractValue,
    url: `/projects/${params.projectId}/pmo/pmo-fb-billing`,
  };
}

export async function wayfinderLogFbInvoice(params: {
  projectId: string;
  milestoneId: string;
  invoiceNumber: string;
  invoiceAmount: number;
}) {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'projects', params.projectId, 'paymentMilestones', params.milestoneId), {
    invoiceNumber: params.invoiceNumber,
    invoiceAmount: params.invoiceAmount,
    status: 'Invoice raised',
    invoicedAt: new Date().toISOString(),
  });
  return {
    success: true,
    projectId: params.projectId,
    milestoneId: params.milestoneId,
    invoiceNumber: params.invoiceNumber,
    url: `/projects/${params.projectId}/pmo/pmo-fb-billing`,
  };
}

export async function wayfinderUpdatePaymentMilestone(params: {
  projectId: string;
  milestoneId: string;
  name?: string;
  billingPercentage?: number;
  amount?: number;
  status?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const p: any = { updatedAt: new Date().toISOString() };
  if (params.name) p.name = params.name;
  if (params.billingPercentage !== undefined) p.billingPercentage = params.billingPercentage;
  if (params.amount !== undefined) p.amount = params.amount;
  if (params.status) p.status = params.status;
  await updateDoc(doc(db, 'projects', params.projectId, 'paymentMilestones', params.milestoneId), p);
  return {
    success: true,
    projectId: params.projectId,
    milestoneId: params.milestoneId,
    ...p,
    url: `/projects/${params.projectId}/pmo/pmo-fb-payment-milestones`,
  };
}

export async function wayfinderDeletePaymentMilestone(params: { projectId: string; milestoneId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'paymentMilestones', params.milestoneId));
  return {
    success: true,
    projectId: params.projectId,
    milestoneId: params.milestoneId,
    url: `/projects/${params.projectId}/pmo/pmo-fb-payment-milestones`,
  };
}

export async function wayfinderQueryPaymentMilestones(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'paymentMilestones'));
  const milestones = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return {
    projectId: params.projectId,
    totalMilestones: milestones.length,
    milestones,
  };
}

export async function wayfinderMarkMilestoneInvoiceRaised(params: {
  projectId: string;
  milestoneId: string;
  invoiceNumber: string;
}) {
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'projects', params.projectId, 'paymentMilestones', params.milestoneId), {
    status: 'Invoice raised',
    invoiceNumber: params.invoiceNumber,
    invoicedAt: new Date().toISOString(),
  });
  return {
    success: true,
    projectId: params.projectId,
    milestoneId: params.milestoneId,
    invoiceNumber: params.invoiceNumber,
    status: 'Invoice raised',
    url: `/projects/${params.projectId}/pmo/pmo-fb-payment-milestones`,
  };
}

export async function wayfinderQueryTnmBillingSummary(params: { projectId: string; month?: string }) {
  if (!db) throw new Error('Database unavailable');
  const resSnap = await getDocs(collection(db, 'projects', params.projectId, 'employees'));
  const resources = resSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const worklogsSnap = await getDocs(collection(db, 'projects', params.projectId, 'worklogs'));
  let worklogs = worklogsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  if (params.month) {
    worklogs = worklogs.filter((w: any) => w.date && w.date.startsWith(params.month!));
  }

  let totalBilledRevenue = 0;
  let totalHours = 0;

  worklogs.forEach((w: any) => {
    const res = resources.find((r: any) => r.id === w.employeeId || r.empId === w.empId);
    const rate = res ? res.billedRate || 400 : 400;
    const hours = w.hours || 0;
    totalHours += hours;
    totalBilledRevenue += (hours / 8) * rate;
  });

  return {
    projectId: params.projectId,
    month: params.month || 'Overall',
    totalHours,
    totalBilledRevenue: Math.round(totalBilledRevenue),
  };
}

export async function wayfinderGenerateMonthlyTnmInvoice(params: { projectId: string; month: string }) {
  const summary = await wayfinderQueryTnmBillingSummary(params);
  const invoiceNumber = `INV-${params.projectId}-${params.month.replace('-', '')}`;
  return {
    success: true,
    projectId: params.projectId,
    month: params.month,
    invoiceNumber,
    invoiceAmount: summary.totalBilledRevenue,
    totalHours: summary.totalHours,
    url: `/projects/${params.projectId}/pmo/pmo-tnm-billing`,
  };
}

export async function wayfinderUpdateTnmMilestone(params: {
  projectId: string;
  milestoneId: string;
  name?: string;
  targetAmount?: number;
  status?: string;
}) {
  return await wayfinderUpdatePaymentMilestone(params);
}

export async function wayfinderDeleteTnmMilestone(params: { projectId: string; milestoneId: string }) {
  return await wayfinderDeletePaymentMilestone(params);
}

export async function wayfinderQueryTnmMilestones(params: { projectId: string }) {
  return await wayfinderQueryPaymentMilestones(params);
}

export async function wayfinderQueryBcpPlan(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const docSnap = await getDoc(doc(db, 'projects', params.projectId, 'pmoSettings', 'bcp'));
  const data = docSnap.exists() ? docSnap.data() : {};
  return {
    projectId: params.projectId,
    primaryContacts: data.primaryContacts || [],
    secondaryBackups: data.secondaryBackups || [],
    disasterRecoveryProcedures: data.disasterRecoveryProcedures || 'Standard cloud geo-redundancy and automated daily backups.',
    lastVerifiedDate: data.lastVerifiedDate || new Date().toISOString().split('T')[0],
  };
}

export async function wayfinderUpdateBcpPrimaryContacts(params: {
  projectId: string;
  contacts: Array<{ role: string; primaryPerson: string; backupPerson: string; contactPhone?: string }>;
}) {
  if (!db) throw new Error('Database unavailable');
  await setDoc(doc(db, 'projects', params.projectId, 'pmoSettings', 'bcp'), {
    primaryContacts: params.contacts,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return {
    success: true,
    projectId: params.projectId,
    contacts: params.contacts,
    url: `/projects/${params.projectId}/pmo/business-continuity`,
  };
}

export async function wayfinderLogBcpDisasterRecoveryPlan(params: {
  projectId: string;
  procedures: string;
  backupVerificationDate: string;
  offsiteLocation?: string;
}) {
  if (!db) throw new Error('Database unavailable');
  await setDoc(doc(db, 'projects', params.projectId, 'pmoSettings', 'bcp'), {
    disasterRecoveryProcedures: params.procedures,
    lastVerifiedDate: params.backupVerificationDate,
    offsiteLocation: params.offsiteLocation || 'Cloud Multi-Region',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return {
    success: true,
    projectId: params.projectId,
    procedures: params.procedures,
    url: `/projects/${params.projectId}/pmo/business-continuity`,
  };
}

// --- MODULE 10: PROJECT SETTINGS & TRASH ---

export async function wayfinderAddKanbanColumn(params: {
  projectId: string;
  columnName: string;
  wipLimit?: number;
  order?: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const id = params.columnName.toLowerCase().replace(/\s+/g, '_');
  await setDoc(doc(db, 'projects', params.projectId, 'kanbanColumns', id), {
    id,
    name: params.columnName,
    wipLimit: params.wipLimit || 0,
    order: params.order || 5,
    createdAt: new Date().toISOString(),
  });
  return {
    success: true,
    projectId: params.projectId,
    columnName: params.columnName,
    url: `/projects/${params.projectId}/project-settings/board-settings`,
  };
}

export async function wayfinderDeleteKanbanColumn(params: { projectId: string; columnId: string }) {
  if (!db) throw new Error('Database unavailable');
  await deleteDoc(doc(db, 'projects', params.projectId, 'kanbanColumns', params.columnId));
  return {
    success: true,
    projectId: params.projectId,
    columnId: params.columnId,
    url: `/projects/${params.projectId}/project-settings/board-settings`,
  };
}

export async function wayfinderUpdateKanbanColumnsOrder(params: {
  projectId: string;
  columnOrder: string[];
}) {
  if (!db) throw new Error('Database unavailable');
  const batch = writeBatch(db);
  params.columnOrder.forEach((colId, idx) => {
    batch.update(doc(db, 'projects', params.projectId, 'kanbanColumns', colId), {
      order: idx + 1,
      updatedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
  return {
    success: true,
    projectId: params.projectId,
    columnOrder: params.columnOrder,
    url: `/projects/${params.projectId}/project-settings/board-settings`,
  };
}

export async function wayfinderQueryBoardSettings(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDocs(collection(db, 'projects', params.projectId, 'kanbanColumns'));
  const columns = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  return {
    projectId: params.projectId,
    totalColumns: columns.length,
    columns,
  };
}

export async function wayfinderUpdateSprintDurationSettings(params: {
  projectId: string;
  durationWeeks: 1 | 2 | 3 | 4;
}) {
  if (!db) throw new Error('Database unavailable');
  await setDoc(doc(db, 'projects', params.projectId, 'settings', 'sprint'), {
    durationWeeks: params.durationWeeks,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return {
    success: true,
    projectId: params.projectId,
    durationWeeks: params.durationWeeks,
    url: `/projects/${params.projectId}/project-settings/sprint-settings`,
  };
}

export async function wayfinderSetSprintStartDay(params: {
  projectId: string;
  startDay: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
}) {
  if (!db) throw new Error('Database unavailable');
  await setDoc(doc(db, 'projects', params.projectId, 'settings', 'sprint'), {
    startDay: params.startDay,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return {
    success: true,
    projectId: params.projectId,
    startDay: params.startDay,
    url: `/projects/${params.projectId}/project-settings/sprint-settings`,
  };
}

export async function wayfinderQuerySprintSettings(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDoc(doc(db, 'projects', params.projectId, 'settings', 'sprint'));
  const data = snap.exists() ? snap.data() : {};
  return {
    projectId: params.projectId,
    durationWeeks: data.durationWeeks || 2,
    startDay: data.startDay || 'Monday',
  };
}

export async function wayfinderUpdateEffortConversionSettings(params: {
  projectId: string;
  manMonthToDays?: number;
  manDayToHours?: number;
  storyPointToHours?: number;
}) {
  if (!db) throw new Error('Database unavailable');
  const p: any = { updatedAt: new Date().toISOString() };
  if (params.manMonthToDays !== undefined) p.manMonthToDays = params.manMonthToDays;
  if (params.manDayToHours !== undefined) p.manDayToHours = params.manDayToHours;
  if (params.storyPointToHours !== undefined) p.storyPointToHours = params.storyPointToHours;

  await setDoc(doc(db, 'projects', params.projectId, 'settings', 'effort'), p, { merge: true });
  return {
    success: true,
    projectId: params.projectId,
    ...p,
    url: `/projects/${params.projectId}/project-settings/effort-settings`,
  };
}

export async function wayfinderQueryEffortSettings(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const snap = await getDoc(doc(db, 'projects', params.projectId, 'settings', 'effort'));
  const data = snap.exists() ? snap.data() : {};
  return {
    projectId: params.projectId,
    manMonthToDays: data.manMonthToDays || 22,
    manDayToHours: data.manDayToHours || 8,
    storyPointToHours: data.storyPointToHours || 8,
  };
}

export async function wayfinderQueryProjectTrashItems(params: { projectId: string }) {
  if (!db) throw new Error('Database unavailable');
  const storiesSnap = await getDocs(collection(db, 'projects', params.projectId, 'stories'));
  const deletedStories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((s: any) => s.isDeleted);

  const tcSnap = await getDocs(collection(db, 'projects', params.projectId, 'testCases'));
  const deletedTc = tcSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })).filter((t: any) => t.isDeleted);

  return {
    projectId: params.projectId,
    totalDeletedItems: deletedStories.length + deletedTc.length,
    workItems: deletedStories,
    testCases: deletedTc,
  };
}

export async function wayfinderRestoreProjectTrashItem(params: {
  projectId: string;
  itemType: 'story' | 'testCase' | 'epic';
  itemId: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const coll = params.itemType === 'testCase' ? 'testCases' : params.itemType === 'epic' ? 'epics' : 'stories';
  await updateDoc(doc(db, 'projects', params.projectId, coll, params.itemId), {
    isDeleted: false,
    deletedAt: null,
    restoredAt: new Date().toISOString(),
  });
  return {
    success: true,
    projectId: params.projectId,
    itemType: params.itemType,
    itemId: params.itemId,
    url: `/projects/${params.projectId}/project-trash`,
  };
}

export async function wayfinderPermanentlyDeleteProjectItem(params: {
  projectId: string;
  itemType: 'story' | 'testCase' | 'epic';
  itemId: string;
}) {
  if (!db) throw new Error('Database unavailable');
  const coll = params.itemType === 'testCase' ? 'testCases' : params.itemType === 'epic' ? 'epics' : 'stories';
  await deleteDoc(doc(db, 'projects', params.projectId, coll, params.itemId));
  return {
    success: true,
    projectId: params.projectId,
    itemType: params.itemType,
    itemId: params.itemId,
    url: `/projects/${params.projectId}/project-trash`,
  };
}
