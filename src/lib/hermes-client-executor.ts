import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
} from '@/lib/db-provider';
import type {
  Story,
  Epic,
  Sprint,
  TestCase,
  WorkItemType,
  BugSeverity,
  Priority,
  KanbanColumn,
  ProjectSettings,
  Environment,
} from '@/types';

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

// 1. Client Execute: Create Portfolio
export async function executeClientCreatePortfolio(params: { name: string; description?: string }) {
  if (!db) throw new Error('Database is not initialized on client');
  
  const portSnap = await getDocs(collection(db, 'portfolios'));
  const trimmedName = params.name.trim();

  // Check if portfolio already exists (case-insensitive)
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

  // Calculate next sequential PF ID (PF001, PF002, ...)
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

// 2. Client Execute: Create Project
export async function executeClientCreateProject(params: {
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
  if (!db) throw new Error('Database is not initialized on client');

  // Resolve target portfolio
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

  // If still not resolved, use first active portfolio or create default PF001
  if (!portfolioId) {
    const activePort = portSnap.docs.find((d: any) => !d.data().isDeleted);
    if (activePort) {
      portfolioId = activePort.id;
    } else {
      const defaultPort = await executeClientCreatePortfolio({
        name: 'Main Portfolio',
        description: 'Default portfolio',
      });
      portfolioId = defaultPort.id;
    }
  }

  // Calculate standard Project ID (P + YY + 5-digit sequence, e.g. P2600001)
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
    console.warn('Non-fatal initializing project subcollections on client:', err);
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

// 3. Client Execute: Create Work Item (Story, Bug, Task, Feature Change, Sub Task)
export async function executeClientCreateWorkItem(params: {
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

// 4. Client Execute: Update Work Item
export async function executeClientUpdateWorkItem(params: {
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

  let targetDocRef = doc(storiesRef, storyIdOrDocId);
  let docSnap = await getDoc(targetDocRef);

  if (!docSnap.exists || (typeof docSnap.exists === 'function' && !docSnap.exists())) {
    const q = query(storiesRef, where('storyId', '==', storyIdOrDocId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
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

// 5. Client Execute: Create Epic
export async function executeClientCreateEpic(params: {
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

// 6. Client Execute: Create Sprint
export async function executeClientCreateSprint(params: {
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

// 7. Client Execute: Create Test Case
export async function executeClientCreateTestCase(params: {
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

// 8. Client Execute: Create RAID Item
export async function executeClientCreateRaidItem(params: {
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

// 9. Client Execute: Update Project Summary / Details
export async function executeClientUpdateProjectDetails(params: {
  projectId: string;
  summary?: string;
  description?: string;
  name?: string;
  pricingModel?: 'Fixed Bid' | 'T&M';
  status?: string;
  projectManagerId?: string;
  overallStatus?: 'Red' | 'Amber' | 'Green';
}) {
  const { projectId, ...updates } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  await updateDoc(projectDocRef, sanitizeData({ ...updates, updatedAt: new Date().toISOString() }));

  return {
    success: true,
    id: projectId,
    projectId,
    summary: updates.summary,
    description: updates.description,
    name: updates.name,
    status: updates.status,
    url: `/projects/${projectId}/project-details/specifications`,
  };
}

// 10. Client Execute: Add Impacted System
export async function executeClientAddImpactedSystem(params: {
  projectId: string;
  name: string;
  description?: string;
  category?: 'Technology' | 'Function';
  estimate?: number;
  dailyBillingRate?: number;
}) {
  const { projectId, name, description = '', category = 'Technology', estimate = 0, dailyBillingRate = 0 } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const payload = sanitizeData({
    name,
    description,
    category,
    estimate: Number(estimate) || 0,
    dailyBillingRate: Number(dailyBillingRate) || 0,
    createdAt: new Date().toISOString(),
  });

  const doc1 = await addDoc(collection(projectDocRef, 'initialImpactedSystems'), payload);
  try {
    await addDoc(collection(projectDocRef, 'impactedSystems'), payload);
  } catch (e) {
    // Non-fatal if collection doesn't exist
  }

  return {
    success: true,
    id: doc1.id,
    name,
    category,
    estimate,
    dailyBillingRate,
    projectId,
    url: `/projects/${projectId}/project-details/specifications`,
  };
}

// 11. Client Execute: Add Horizontal
export async function executeClientAddHorizontal(params: {
  projectId: string;
  name: string;
  weightage?: number;
  dailyBillingRate?: number;
  isEnabled?: boolean;
}) {
  const { projectId, name, weightage = 10, dailyBillingRate = 0, isEnabled = true } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const payload = sanitizeData({
    name,
    weightage: Number(weightage) || 0,
    dailyBillingRate: Number(dailyBillingRate) || 0,
    isEnabled,
    createdAt: new Date().toISOString(),
  });

  const doc1 = await addDoc(collection(projectDocRef, 'initialHorizontals'), payload);
  try {
    await addDoc(collection(projectDocRef, 'horizontals'), payload);
  } catch (e) {
    // Non-fatal
  }

  return {
    success: true,
    id: doc1.id,
    name,
    weightage,
    dailyBillingRate,
    projectId,
    url: `/projects/${projectId}/project-details/specifications`,
  };
}

// 12. Client Execute: Bulk Update Specifications
export async function executeClientUpdateSpecifications(params: {
  projectId: string;
  summary?: string;
  impactedSystems?: Array<{
    name: string;
    description?: string;
    category?: 'Technology' | 'Function';
    estimate?: number;
    dailyBillingRate?: number;
  }>;
  horizontals?: Array<{
    name: string;
    weightage?: number;
    dailyBillingRate?: number;
  }>;
}) {
  const { projectId, summary, impactedSystems, horizontals } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);

  // Update summary on project doc
  if (summary) {
    await updateDoc(projectDocRef, sanitizeData({ summary, updatedAt: new Date().toISOString() }));
  }

  // Insert Impacted Systems
  if (impactedSystems && Array.isArray(impactedSystems) && impactedSystems.length > 0) {
    for (const sys of impactedSystems) {
      const payload = sanitizeData({
        name: sys.name,
        description: sys.description || '',
        category: sys.category || 'Technology',
        estimate: Number(sys.estimate) || 0,
        dailyBillingRate: Number(sys.dailyBillingRate) || 0,
        createdAt: new Date().toISOString(),
      });
      await addDoc(collection(projectDocRef, 'initialImpactedSystems'), payload);
      try {
        await addDoc(collection(projectDocRef, 'impactedSystems'), payload);
      } catch (e) {}
    }
  }

  // Insert Horizontals
  if (horizontals && Array.isArray(horizontals) && horizontals.length > 0) {
    for (const h of horizontals) {
      const payload = sanitizeData({
        name: h.name,
        weightage: Number(h.weightage) || 0,
        dailyBillingRate: Number(h.dailyBillingRate) || 0,
        isEnabled: true,
        createdAt: new Date().toISOString(),
      });
      await addDoc(collection(projectDocRef, 'initialHorizontals'), payload);
      try {
        await addDoc(collection(projectDocRef, 'horizontals'), payload);
      } catch (e) {}
    }
  }

  return {
    success: true,
    projectId,
    summary,
    systemsCount: impactedSystems?.length || 0,
    horizontalsCount: horizontals?.length || 0,
    url: `/projects/${projectId}/project-details/specifications`,
  };
}

// 13. Client Execute: Update Sprint
export async function executeClientUpdateSprint(params: {
  projectId: string;
  sprintId: string;
  status?: 'Yet to Start' | 'Current' | 'Completed' | 'Cancelled';
  startDate?: string;
  endDate?: string;
  title?: string;
}) {
  const { projectId, sprintId, ...updates } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const sprintRef = doc(projectDocRef, 'sprints', sprintId);

  // Check if updating by ID or document ID
  let targetRef = sprintRef;
  const snapshot = await getDocs(collection(projectDocRef, 'sprints'));
  const match = snapshot.docs.find((d: any) => d.id === sprintId || d.data().title === sprintId);
  if (match) targetRef = match.ref;

  const payload: any = sanitizeData({ ...updates, updatedAt: new Date().toISOString() });
  if (updates.status === 'Current') {
    payload.isCurrent = true;
  }
  await updateDoc(targetRef, payload);

  return {
    success: true,
    id: targetRef.id,
    sprintId,
    status: updates.status,
    projectId,
    url: `/projects/${projectId}/development/backlog`,
  };
}

// 14. Client Execute: Assign Story to Sprint
export async function executeClientAssignStoryToSprint(params: {
  projectId: string;
  storyId: string;
  sprintId: string | null;
}) {
  const { projectId, storyId, sprintId } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const snapshot = await getDocs(collection(projectDocRef, 'stories'));
  const match = snapshot.docs.find((d: any) => d.id === storyId || d.data().storyId === storyId);

  if (!match) throw new Error(`Story ${storyId} not found in project ${projectId}`);

  await updateDoc(match.ref, sanitizeData({ sprintId, updatedAt: new Date().toISOString() }));

  return {
    success: true,
    id: match.id,
    storyId: match.data().storyId || storyId,
    sprintId,
    projectId,
    url: `/projects/${projectId}/development/backlog`,
  };
}

// 15. Client Execute: Create Test Plan / Cycle
export async function executeClientCreateTestPlan(params: {
  projectId: string;
  name: string;
  planType: 'Sprint' | 'Release';
  startDate?: string;
  endDate?: string;
  environmentId?: string;
  sprintId?: string;
  releaseId?: string;
}) {
  const { projectId, name, planType, startDate, endDate, environmentId, sprintId, releaseId } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const snapshot = await getDocs(collection(projectDocRef, 'testPlans'));
  const newIdNumber = snapshot.size > 0
    ? Math.max(0, ...snapshot.docs
      .map((d: any) => d.data().testPlanId)
      .filter((id: string | undefined) => id && typeof id === 'string')
      .map((id: string) => parseInt(id.replace('TP-', ''), 10) || 0)
    ) + 1
    : 1;

  const testPlanId = `TP-${newIdNumber}`;
  const payload = sanitizeData({
    testPlanId,
    name,
    planType,
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    environmentId: environmentId || 'Dev',
    sprintId,
    releaseId,
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

// 16. Client Execute: Create Release or Milestone
export async function executeClientCreateRelease(params: {
  projectId: string;
  name: string;
  description?: string;
  itemType: 'Release' | 'Stage' | 'Milestone';
  startDate?: string;
  endDate?: string;
  milestoneDate?: string;
}) {
  const { projectId, name, description = '', itemType, startDate, endDate, milestoneDate } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const snapshot = await getDocs(collection(projectDocRef, 'releases'));

  const prefixMap: Record<string, string> = {
    Release: 'REL',
    Stage: 'S',
    Milestone: 'M',
  };
  const prefix = prefixMap[itemType] || 'REL';
  const existingCount = snapshot.docs.filter((d: any) => d.data().itemType === itemType).length;
  const releaseId = `${prefix}-${existingCount + 1}`;

  const payload = sanitizeData({
    releaseId,
    name,
    description,
    itemType,
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    milestoneDate: milestoneDate || endDate,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(projectDocRef, 'releases'), payload);

  return {
    success: true,
    id: docRef.id,
    releaseId,
    name,
    itemType,
    projectId,
    url: `/projects/${projectId}/releases`,
  };
}

// 17. Client Execute: Create Payment Milestone
export async function executeClientCreatePaymentMilestone(params: {
  projectId: string;
  name: string;
  billingPercentage: number;
  amount: number;
  status?: 'TBD' | 'In Progress' | 'Milestone completed' | 'Invoice raised' | 'Payment Completed';
}) {
  const { projectId, name, billingPercentage, amount, status = 'TBD' } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const snapshot = await getDocs(collection(projectDocRef, 'paymentMilestones'));

  const newIdNumber = snapshot.size > 0
    ? Math.max(0, ...snapshot.docs
      .map((d: any) => d.data().milestoneId)
      .filter((id: string | undefined) => id && typeof id === 'string')
      .map((id: string) => parseInt(id.replace('PM-', ''), 10) || 0)
    ) + 1
    : 1;

  const milestoneId = `PM-${newIdNumber}`;
  const payload = sanitizeData({
    milestoneId,
    name,
    billingPercentage: Number(billingPercentage) || 0,
    amount: Number(amount) || 0,
    status,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(projectDocRef, 'paymentMilestones'), payload);

  return {
    success: true,
    id: docRef.id,
    milestoneId,
    name,
    amount,
    status,
    projectId,
    url: `/projects/${projectId}/pmo/fb-payment-milestones`,
  };
}

// 18. Client Execute: Assign Project Resource
export async function executeClientAssignProjectResource(params: {
  projectId: string;
  userId?: string;
  name?: string;
  role: 'Developer' | 'Tester' | 'Architect' | 'BA' | 'PM' | 'Program Director';
  onboardingDate?: string;
  offloadingDate?: string;
  billedRate?: number;
  costRate?: number;
}) {
  const { projectId, userId, name, role, onboardingDate, offloadingDate, billedRate = 0, costRate = 0 } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);

  // Find user from all users or create placeholder
  let empId = userId;
  let firstName = name || 'Resource';
  let lastName = '';
  let email = '';

  if (userId) {
    const allUsersSnapshot = await getDocs(collection(db, 'employees'));
    const found = allUsersSnapshot.docs.find((d: any) => d.id === userId || d.data().empId === userId || `${d.data().firstName} ${d.data().lastName}`.toLowerCase().includes(userId.toLowerCase()));
    if (found) {
      const uData = found.data();
      empId = found.id;
      firstName = uData.firstName || firstName;
      lastName = uData.lastName || '';
      email = uData.email || '';
    }
  }

  const safeEmpId = empId || `EMP-${Date.now()}`;
  const payload = sanitizeData({
    id: safeEmpId,
    empId: safeEmpId,
    firstName,
    lastName,
    email,
    role,
    onboardingDate: onboardingDate || new Date().toISOString(),
    offloadingDate: offloadingDate || null,
    billedRate: Number(billedRate) || 0,
    costRate: Number(costRate) || 0,
    createdAt: new Date().toISOString(),
  });

  await setDoc(doc(projectDocRef, 'employees', safeEmpId), payload);

  return {
    success: true,
    id: safeEmpId,
    name: `${firstName} ${lastName}`.trim(),
    role,
    projectId,
    url: `/projects/${projectId}/resources/project-resources`,
  };
}

// 19. Client Execute: Log Work (Timesheet)
export async function executeClientLogWork(params: {
  projectId: string;
  employeeId?: string;
  date?: string;
  itemId: string;
  hours: number;
  itemType?: 'WorkItem' | 'Meeting' | 'Other';
  description?: string;
}) {
  const { projectId, employeeId = 'emp1', date = new Date().toISOString().split('T')[0], itemId, hours, itemType = 'WorkItem', description } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const worklogDocId = `${employeeId}-${date}`;
  const worklogRef = doc(projectDocRef, 'worklogs', worklogDocId);

  const newLogItem = {
    itemId,
    itemType,
    hours: Number(hours) || 0,
    description: description || '',
  };

  const existingDoc = await getDocs(collection(projectDocRef, 'worklogs'));
  const found = existingDoc.docs.find((d: any) => d.id === worklogDocId);

  if (found) {
    const data = found.data();
    const items = data.items || [];
    items.push(newLogItem);
    const totalHours = items.reduce((acc: number, cur: any) => acc + (cur.hours || 0), 0);
    await updateDoc(worklogRef, sanitizeData({ items, totalHours, updatedAt: new Date().toISOString() }));
  } else {
    await setDoc(worklogRef, sanitizeData({
      id: worklogDocId,
      employeeId,
      date,
      items: [newLogItem],
      totalHours: Number(hours) || 0,
      createdAt: new Date().toISOString(),
    }));
  }

  return {
    success: true,
    id: worklogDocId,
    hours,
    itemId,
    date,
    projectId,
    url: `/projects/${projectId}/resources/worklog`,
  };
}

// 20. Client Execute: Add Environment
export async function executeClientAddEnvironment(params: {
  projectId: string;
  name: string;
  order?: number;
  url?: string;
}) {
  const { projectId, name, order = 0, url = '' } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const payload = sanitizeData({
    name,
    order: Number(order) || 0,
    url,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(projectDocRef, 'environments'), payload);

  return {
    success: true,
    id: docRef.id,
    name,
    url,
    projectId,
    urlPath: `/projects/${projectId}/project-settings`,
  };
}

// 21. Client Execute: Add Code Repository
export async function executeClientAddCodeRepository(params: {
  projectId: string;
  name: string;
  url: string;
}) {
  const { projectId, name, url } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const payload = sanitizeData({
    name,
    url,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(projectDocRef, 'codeRepositories'), payload);

  return {
    success: true,
    id: docRef.id,
    name,
    url,
    projectId,
    urlPath: `/projects/${projectId}/pmo/business-continuity`,
  };
}

// 22. Client Execute: Add Fixed Cost
export async function executeClientAddFixedCost(params: {
  projectId: string;
  name: string;
  cost: number;
  type?: 'One time' | 'Monthly';
}) {
  const { projectId, name, cost, type = 'One time' } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const payload = sanitizeData({
    name,
    cost: Number(cost) || 0,
    type,
    createdAt: new Date().toISOString(),
  });

  const docRef = await addDoc(collection(projectDocRef, 'fixedCosts'), payload);

  return {
    success: true,
    id: docRef.id,
    name,
    cost,
    type,
    projectId,
    url: `/projects/${projectId}/pmo/fb-billing`,
  };
}

// 23. Client Execute: Update RAID Item
export async function executeClientUpdateRaidItem(params: {
  projectId: string;
  raidType: 'risk' | 'assumption' | 'issue' | 'dependency';
  itemId: string;
  status?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  mitigationPlan?: string;
  residualRisk?: string;
}) {
  const { projectId, raidType, itemId, ...updates } = params;
  if (!db || !projectId) throw new Error('Database or Project ID is missing');

  const projectDocRef = doc(db, 'projects', projectId);
  const collectionNameMap: Record<string, string> = {
    risk: 'risks',
    assumption: 'assumptions',
    issue: 'issues',
    dependency: 'dependencies',
  };
  const collName = collectionNameMap[raidType] || 'issues';
  const idField = `${raidType}Id`;

  const snapshot = await getDocs(collection(projectDocRef, collName));
  const match = snapshot.docs.find((d: any) => d.id === itemId || d.data()[idField] === itemId);

  if (!match) throw new Error(`${raidType} ${itemId} not found`);

  await updateDoc(match.ref, sanitizeData({ ...updates, updatedAt: new Date().toISOString() }));

  return {
    success: true,
    id: match.id,
    itemId: match.data()[idField] || itemId,
    raidType,
    status: updates.status,
    projectId,
    url: `/projects/${projectId}/raid-dashboard`,
  };
}

// Master Dispatcher for client-side tool execution
export async function executeHermesActionOnClient(action: any) {
  const toolName = action.toolName;
  const params = action.params || action;

  try {
    switch (toolName) {
      case 'createPortfolio':
        return await executeClientCreatePortfolio(params);
      case 'createProject':
        return await executeClientCreateProject(params);
      case 'createWorkItem':
        return await executeClientCreateWorkItem(params);
      case 'updateWorkItem':
        return await executeClientUpdateWorkItem(params);
      case 'createEpic':
        return await executeClientCreateEpic(params);
      case 'createSprint':
        return await executeClientCreateSprint(params);
      case 'updateSprint':
        return await executeClientUpdateSprint(params);
      case 'assignStoryToSprint':
        return await executeClientAssignStoryToSprint(params);
      case 'createTestCase':
        return await executeClientCreateTestCase(params);
      case 'createTestPlan':
        return await executeClientCreateTestPlan(params);
      case 'createRaidItem':
        return await executeClientCreateRaidItem(params);
      case 'updateRaidItem':
        return await executeClientUpdateRaidItem(params);
      case 'updateProjectDetails':
      case 'updateProjectSummary':
        return await executeClientUpdateProjectDetails(params);
      case 'addImpactedSystem':
        return await executeClientAddImpactedSystem(params);
      case 'addHorizontal':
        return await executeClientAddHorizontal(params);
      case 'updateProjectSpecifications':
        return await executeClientUpdateSpecifications(params);
      case 'createRelease':
        return await executeClientCreateRelease(params);
      case 'createPaymentMilestone':
        return await executeClientCreatePaymentMilestone(params);
      case 'assignProjectResource':
        return await executeClientAssignProjectResource(params);
      case 'logWork':
        return await executeClientLogWork(params);
      case 'addEnvironment':
        return await executeClientAddEnvironment(params);
      case 'addCodeRepository':
        return await executeClientAddCodeRepository(params);
      case 'addFixedCost':
        return await executeClientAddFixedCost(params);
      default:
        console.warn(`Unknown client action tool: ${toolName}`);
        return action;
    }
  } catch (err) {
    console.error(`Error executing ${toolName} on client:`, err);
    throw err;
  }
}

