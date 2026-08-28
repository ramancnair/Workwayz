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
  writeBatch,
  Timestamp,
} from '@/lib/db-provider';
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

