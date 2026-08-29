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
export async function flowpilotCreateWorkItem(params: {
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
  const { projectId, itemType = 'Requirement/Story', title, description = '', priority = 'Medium', severity, status = 'To Do', ...rest } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const storiesSnapshot = await getDocs(collection(projectDocRef, 'stories'));

  const prefixMap: Record<WorkItemType, string> = {
    'Requirement/Story': 'ST',
    'Feature Change': 'FC',
    'Task': 'TASK',
    'Bug': 'BUG',
    'Sub Task': 'SUB',
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

  if (severity && itemType === 'Bug') {
    payload.severity = severity;
  }

  const docRef = await addDoc(collection(projectDocRef, 'stories'), sanitizeData(payload));

  const destinationUrl = itemType === 'Bug'
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
export async function flowpilotUpdateWorkItem(params: {
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

  const existingData = docSnap.data();
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
export async function flowpilotCreateProject(params: {
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
      const defaultPort = await flowpilotCreatePortfolio({
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
export async function flowpilotCreateEpic(params: {
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
export async function flowpilotCreateSprint(params: {
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
export async function flowpilotCreateTestCase(params: {
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
    url: `/projects/${projectId}/testing/test-backlog`,
  };
}

// 6b. Bulk Create / Generate Test Cases
export async function flowpilotBulkCreateTestCases(params: {
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
    url: `/projects/${projectId}/testing/test-backlog`,
  };
}

// 6c. Create Test Plan / Cycle
export async function flowpilotCreateTestPlan(params: {
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
  const planSnapshot = await getDocs(collection(projectDocRef, 'testPlans'));

  const existingNumbers = planSnapshot.docs
    .map((d: any) => d.data().testPlanId)
    .filter((id: string | undefined) => id && typeof id === 'string' && id.startsWith('TP-'))
    .map((id: string) => parseInt(id.replace('TP-', ''), 10) || 0);

  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const testPlanId = `TP-${nextNumber}`;

  const parseDate = (dStr: any) => {
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const payload = sanitizeData({
    testPlanId,
    name,
    planType,
    startDate: parseDate(startDate),
    endDate: parseDate(endDate),
    environmentId: environmentId || undefined,
    sprintId: sprintId || undefined,
    releaseId: releaseId || undefined,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(projectDocRef, 'testPlans'), payload);

  return {
    success: true,
    id: docRef.id,
    testPlanId,
    name,
    planType,
    projectId,
    url: `/projects/${projectId}/testing/test-cycle`,
  };
}

// 6d. Add Test Cases to Test Plan / Cycle
export async function flowpilotAddTestCasesToTestPlan(params: {
  projectId: string;
  planId?: string;
  testPlanId?: string;
  planName?: string;
  testCaseIds?: string[];
  executionDate?: string;
}) {
  const { projectId, executionDate } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);

  // Find target test plan
  const plansSnapshot = await getDocs(collection(projectDocRef, 'testPlans'));
  const planDoc = plansSnapshot.docs.find((d: any) => {
    const data = d.data();
    if (params.planId && (d.id === params.planId || data.testPlanId === params.planId)) return true;
    if (params.testPlanId && data.testPlanId === params.testPlanId) return true;
    if (params.planName && data.name?.toLowerCase().includes(params.planName.toLowerCase())) return true;
    return false;
  }) || plansSnapshot.docs[0];

  if (!planDoc) {
    throw new Error('No test plan found in this project. Please create a test cycle/plan first.');
  }

  const planId = planDoc.id;
  const planData = planDoc.data();
  const planPrefix = planData.testPlanId || 'TP-1';

  // Load project test cases
  const tcsSnapshot = await getDocs(collection(projectDocRef, 'testCases'));
  const allTestCases = tcsSnapshot.docs
    .map((d: any) => ({ id: d.id, ...d.data() }))
    .filter((tc: any) => !tc.isDeleted);

  // Load existing test cases in plan to prevent duplicates
  const existingInPlanSnapshot = await getDocs(collection(projectDocRef, 'testPlans', planId, 'testCases'));
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

    const newRef = doc(collection(projectDocRef, 'testPlans', planId, 'testCases'));
    const copy = sanitizeData({
      originalTestCaseId: originalTC.id,
      testCaseId: uniqueTestCaseId,
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
    url: `/projects/${projectId}/testing/test-plan`,
  };
}

// 6e. Update Test Case Execution Status in Test Cycle
export async function flowpilotUpdateTestCaseStatus(params: {
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
  const plansSnapshot = await getDocs(collection(projectDocRef, 'testPlans'));

  let foundDocRef: any = null;
  let targetPlanId = params.planId || '';

  for (const planDoc of plansSnapshot.docs) {
    if (targetPlanId && planDoc.id !== targetPlanId && planDoc.data().testPlanId !== targetPlanId) continue;
    const planTCs = await getDocs(collection(projectDocRef, 'testPlans', planDoc.id, 'testCases'));
    const match = planTCs.docs.find((d: any) => {
      const data = d.data();
      return (
        d.id === testCaseId ||
        data.testCaseId?.toLowerCase() === testCaseId.toLowerCase() ||
        data.originalTestCaseId === testCaseId ||
        data.testCaseId?.endsWith(`-${testCaseId}`)
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
export async function flowpilotCreateRaidItem(params: {
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

// 8. Query Project Context & Summary for FlowPilot
export async function flowpilotQueryProjectContext(projectId?: string) {
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

  const projData = projectSnap.data();

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
      bugsCount: stories.filter((s: any) => s.itemType === 'Bug').length,
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
export async function flowpilotListProjects() {
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
export async function flowpilotCreatePortfolio(params: { name: string; description?: string }) {
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
export async function flowpilotListPortfolios() {
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
export async function flowpilotArchiveProject(params: { projectId: string }) {
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
export async function flowpilotUnarchiveProject(params: { projectId: string }) {
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
export async function flowpilotDeleteProject(params: { projectId: string }) {
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
export async function flowpilotUpdatePortfolio(params: { portfolioId: string; name?: string; description?: string }) {
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
export async function flowpilotDeletePortfolio(params: { portfolioId: string }) {
  if (!db || !params.portfolioId) throw new Error('Database or Portfolio ID missing');
  // Check if active projects exist under this portfolio
  const projectsSnap = await getDocs(
    query(collection(db, 'projects'), where('portfolioId', '==', params.portfolioId), where('isDeleted', '==', false))
  );
  if (!projectsSnap.empty) {
    throw new Error(`Cannot delete portfolio: ${projectsSnap.size} active project(s) still belong to this portfolio.`);
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

// 17. Set Primary Project Manager
export async function flowpilotSetProjectManager(params: { projectId: string; projectManagerId: string; projectManagerName?: string }) {
  if (!db || !params.projectId) throw new Error('Database or Project ID missing');
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
export async function flowpilotAutogenProject(params: {
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
    await generateFullProjectData(db, projectId, params.projectName, {
      pricingModel: params.pricingModel || 'Fixed Bid',
      portfolioId: params.portfolioId || 'PF001',
    });
  } catch (err: any) {
    console.warn('[FlowPilot] Autogen subcollection creation warning:', err);
  }

  return {
    success: true,
    projectId,
    name: params.projectName,
    url: `/projects/${projectId}/project-details/pm-dashboard`,
  };
}

// 19. Portfolio Dashboard Summary
export async function flowpilotGetPortfolioDashboardSummary(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (params.portfolioId && params.portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === params.portfolioId);
  }

  const redProjects: any[] = [];
  const amberProjects: any[] = [];
  const greenProjects: any[] = [];
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
      if (pot > 6) highRisksCount++;
    });

    // Fetch issues
    const issuesSnap = await getDocs(collection(db, 'projects', proj.id, 'issues'));
    issuesSnap.docs.forEach((i: any) => {
      const data = i.data();
      if (data.status !== 'Closed' && data.status !== 'Resolved') {
        totalIssues++;
        if (data.priority === 'Critical' || data.priority === 'High') criticalIssuesCount++;
      }
    });
  }

  return {
    totalActiveProjects: projects.length,
    healthDistribution: {
      red: redProjects.length,
      amber: amberProjects.length,
      green: greenProjects.length,
    },
    redProjects,
    amberProjects,
    risks: {
      total: totalRisks,
      highPotential: highRisksCount,
    },
    issues: {
      totalOpen: totalIssues,
      criticalOrHigh: criticalIssuesCount,
    },
  };
}

// 20. Query Portfolio Risks
export async function flowpilotQueryPortfolioRisks(params: { portfolioId?: string; minPotential?: string }) {
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
export async function flowpilotQueryPortfolioIssues(params: { portfolioId?: string; priority?: string; status?: string }) {
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
export async function flowpilotQueryQualityEstimations(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (params.portfolioId && params.portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === params.portfolioId);
  }

  const projectEstimations: any[] = [];
  for (const proj of projects) {
    let devInitial = 0;
    let hzInitial = 0;

    const sysSnap = await getDocs(collection(db, 'projects', proj.id, 'impactedSystems'));
    sysSnap.docs.forEach((d: any) => {
      devInitial += d.data().estimate || 0;
    });

    const hzSnap = await getDocs(collection(db, 'projects', proj.id, 'horizontals'));
    hzSnap.docs.forEach((d: any) => {
      if (d.data().isEnabled !== false) {
        const wt = d.data().weightage || 0;
        hzInitial += (devInitial * wt) / 100;
      }
    });

    const totalInitial = devInitial > 0 ? devInitial + hzInitial : null;
    const storiesSnap = await getDocs(collection(db, 'projects', proj.id, 'stories'));
    let devPlannedHours = 0;
    storiesSnap.docs.forEach((s: any) => {
      const data = s.data();
      if (data.itemType === 'Requirement/Story' || data.itemType === 'Task') {
        devPlannedHours += data.estimatedHours || 0;
      }
    });
    const devPlannedDays = devPlannedHours / 8;
    const hzPlannedDays = (devPlannedDays * 15) / 100;
    const totalPlannedDays = devPlannedDays + hzPlannedDays;

    const logsSnap = await getDocs(collection(db, 'projects', proj.id, 'worklogs'));
    let actualHours = 0;
    logsSnap.docs.forEach((l: any) => {
      actualHours += l.data().hours || 0;
    });
    const actualDays = actualHours / 8;

    const variance = totalInitial ? totalPlannedDays - totalInitial : null;
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
export async function flowpilotQueryQualityDefects(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (params.portfolioId && params.portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === params.portfolioId);
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
export async function flowpilotQueryBillingOverview(params: { portfolioId?: string }) {
  if (!db) throw new Error('Database not initialized');
  const projectsSnap = await getDocs(collection(db, 'projects'));
  let projects = projectsSnap.docs
    .filter((d: any) => !d.data().isDeleted && !d.data().isArchived)
    .map((d: any) => ({ id: d.id, ...d.data() }));

  if (params.portfolioId && params.portfolioId !== 'all') {
    projects = projects.filter((p: any) => p.portfolioId === params.portfolioId);
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

  return {
    portfolioFinancials: {
      totalRevenue,
      totalResourceCost,
      totalFixedCosts,
      totalProfit,
      overallMarginPercentage: Math.round(overallMargin * 10) / 10,
    },
    projects: projectSummaries,
  };
}

// 25. Query Billing Rates & Benchmarks
export async function flowpilotQueryBillingRates(params: { projectId?: string }) {
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
export async function flowpilotUpdateResourceRate(params: {
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
export async function flowpilotUpdateSpecificationRate(params: {
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
export async function flowpilotQueryResourceUtilization(params: {
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
export async function flowpilotQueryAvailableResources(params: { role?: string; minAvailability?: number }) {
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
export async function flowpilotQueryOverallocatedResources() {
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
export async function flowpilotQueryHolidays(params: { year?: number }) {
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
export async function flowpilotCreateHoliday(params: {
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
export async function flowpilotDeleteHoliday(params: { holidayId: string }) {
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
export async function flowpilotQueryLeaveSettings() {
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
export async function flowpilotUpdateLeaveSettings(params: {
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
export async function flowpilotQueryLeaveRequests(params: { employeeId?: string; type?: string }) {
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
export async function flowpilotApplyLeave(params: {
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
export async function flowpilotDeleteLeave(params: { employeeId: string; leaveId: string }) {
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


