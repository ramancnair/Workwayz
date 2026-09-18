import { supabase as _supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

const supabase = _supabase as any;
export const db = supabase;

// ============================================================================
// Timestamp polyfill (mirrors Firestore Timestamp)
// ============================================================================
export class Timestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }

    static now() {
        return Timestamp.fromDate(new Date());
    }

    static fromDate(date: Date) {
        return new Timestamp(Math.floor(date.getTime() / 1000), 0);
    }

    toDate() {
        return new Date(this.seconds * 1000);
    }
}

// ============================================================================
// LOCAL PUB-SUB — the core mechanism for real-time UI updates.
// ============================================================================

interface Listener {
    collectionPath: string;
    ref: any;
    onNext: (snapshot: any) => void;
    onError?: (err: any) => void;
}

const listeners: Listener[] = [];

function getCollectionPath(docPath: string): string {
    const parts = docPath.split('/');
    if (parts.length >= 2) {
        return parts.slice(0, -1).join('/');
    }
    return docPath;
}

const pendingNotifications = new Set<string>();
let notificationScheduled = false;
let channelCounter = 0;

export function scheduleListenerNotification(changedDocPath: string) {
    const collPath = getCollectionPath(changedDocPath);
    pendingNotifications.add(collPath);
    pendingNotifications.add(changedDocPath);
    const collName = collPath.split('/').pop();
    if (collName) {
        pendingNotifications.add(collName);
    }

    if (!notificationScheduled) {
        notificationScheduled = true;
        queueMicrotask(() => {
            const paths = new Set(pendingNotifications);
            pendingNotifications.clear();
            notificationScheduled = false;

            const pathList = Array.from(paths);
            for (const listener of listeners) {
                let shouldFire = false;
                for (let i = 0; i < pathList.length; i++) {
                    const p = pathList[i];
                    if (p === listener.collectionPath || p === listener.ref.path) {
                        shouldFire = true;
                        break;
                    }
                }
                if (shouldFire) {
                    if (listener.ref.type === 'doc') {
                        getDoc(listener.ref)
                            .then(listener.onNext)
                            .catch(err => { if (listener.onError) listener.onError(err); });
                    } else {
                        getDocs(listener.ref)
                            .then(listener.onNext)
                            .catch(err => { if (listener.onError) listener.onError(err); });
                    }
                }
            }
        });
    }
}

// ============================================================================
// Value Serialization & Data Hydration
// ============================================================================

export function serializeValue(val: any): any {
    if (val === null || val === undefined) return val;
    if (val instanceof Timestamp || (typeof val === 'object' && 'seconds' in val && 'nanoseconds' in val)) {
        return new Date(val.seconds * 1000).toISOString();
    }
    if (val instanceof Date) {
        return val.toISOString();
    }
    if (typeof val === 'object' && typeof val.toDate === 'function') {
        return val.toDate().toISOString();
    }
    if (Array.isArray(val)) {
        return val.map(serializeValue);
    }
    return val;
}

function hydrateData(data: any): any {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) {
        return data.map(hydrateData);
    }
    if (typeof data === 'object') {
        if ('seconds' in data && 'nanoseconds' in data && Object.keys(data).length === 2) {
            return new Timestamp(data.seconds, data.nanoseconds);
        }
        const hydrated: any = {};
        for (const key in data) {
            hydrated[key] = hydrateData(data[key]);
        }
        // Expose both createdAt and created_at if either exists
        if (hydrated.created_at !== undefined && hydrated.createdAt === undefined) {
            hydrated.createdAt = hydrated.created_at;
        } else if (hydrated.createdAt !== undefined && hydrated.created_at === undefined) {
            hydrated.created_at = hydrated.createdAt;
        }
        // Expose both updatedAt and updated_at if either exists
        if (hydrated.updated_at !== undefined && hydrated.updatedAt === undefined) {
            hydrated.updatedAt = hydrated.updated_at;
        } else if (hydrated.updatedAt !== undefined && hydrated.updated_at === undefined) {
            hydrated.updated_at = hydrated.updatedAt;
        }
        return hydrated;
    }
    return data;
}

// ============================================================================
// Ref constructors
// ============================================================================
export const collection = (dbInstanceOrDocRef: any, ...paths: string[]) => {
    let path = '';
    if (dbInstanceOrDocRef && typeof dbInstanceOrDocRef === 'object' && dbInstanceOrDocRef.path) {
        path = `${dbInstanceOrDocRef.path}/${paths.join('/')}`;
    } else {
        path = paths.join('/');
    }
    const id = path.split('/').pop() || '';
    return { type: 'collection', path, id };
};

export const doc = (dbInstanceOrColOrDocRef: any, ...paths: string[]) => {
    let path = '';
    if (dbInstanceOrColOrDocRef && typeof dbInstanceOrColOrDocRef === 'object' && dbInstanceOrColOrDocRef.path) {
        const subPath = (paths.length > 0 && paths[0]) ? paths.join('/') : uuidv4();
        path = `${dbInstanceOrColOrDocRef.path}/${subPath}`;
    } else {
        const pathStr = paths.join('/');
        path = pathStr || uuidv4();
    }
    const id = path.split('/').pop() || '';
    return { type: 'doc', path, id };
};

// ============================================================================
// Path helpers & Schema Mapping (Firebase <-> Supabase)
// ============================================================================

export function parsePathDetails(fullPath: string) {
    const parts = fullPath.split('/');
    let projectId: string | null = null;
    let testCycleId: string | null = null;
    let testPlanId: string | null = null;
    let collectionName = 'unknown';

    if (parts[0] === 'projects') {
        if (parts.length <= 2) {
            projectId = parts[1] || null;
            collectionName = 'projects';
        } else if (parts.length >= 5 && (parts[2] === 'testCycles' || parts[2] === 'test_cycles') && (parts[4] === 'testCases' || parts[4] === 'test_cases')) {
            projectId = parts[1];
            collectionName = 'test_cycle_test_cases';
            testCycleId = parts[3];
        } else if (parts.length >= 5 && (parts[2] === 'testPlans' || parts[2] === 'test_plans') && (parts[4] === 'testCases' || parts[4] === 'test_cases')) {
            projectId = parts[1];
            collectionName = 'test_plan_test_cases';
            testPlanId = parts[3];
        } else {
            projectId = parts[1];
            // For projects/:id/:collectionName or projects/:id/:collectionName/:docId
            collectionName = parts[2] || 'unknown';
        }
    } else if (parts[0] === 'settings' && parts.length > 1) {
        if (parts[1] === 'archiveSettings' || parts[1] === 'archive_settings') {
            collectionName = 'archive_settings';
        } else if (parts[1] === 'accessControlSettings' || parts[1] === 'accessSettings' || parts[1] === 'access_control_settings') {
            collectionName = 'access_control_settings';
        } else {
            collectionName = 'project_settings';
        }
    } else {
        collectionName = parts[0];
    }

    return { projectId, testCycleId, testPlanId, collectionName };
}

/**
 * Maps all Firebase collection names (both camelCase and snake_case)
 * directly to their respective Supabase PostgreSQL relational table.
 */
export const COLLECTION_TO_TABLE: Record<string, string> = {
    // Root entities
    portfolios: 'portfolios',
    employees: 'employees',
    users: 'employees',
    allUsers: 'employees',
    projects: 'projects',
    holidays: 'holidays',

    // Settings
    settings: 'project_settings',
    projectSettings: 'project_settings',
    project_settings: 'project_settings',
    accessControlSettings: 'access_control_settings',
    access_control_settings: 'access_control_settings',
    accessSettings: 'access_control_settings',
    archiveSettings: 'archive_settings',
    archive_settings: 'archive_settings',

    // Work items & Kanban
    epics: 'epics',
    sprints: 'sprints',
    stories: 'stories',
    kanbanColumns: 'kanban_columns',
    kanban_columns: 'kanban_columns',

    // Impacted Systems & Horizontals
    initialImpactedSystems: 'initial_impacted_systems',
    initial_impacted_systems: 'initial_impacted_systems',
    impactedSystems: 'impacted_systems',
    impacted_systems: 'impacted_systems',
    initialHorizontals: 'initial_horizontals',
    initial_horizontals: 'initial_horizontals',
    horizontals: 'horizontals',

    // QA & Testing
    testCases: 'test_cases',
    test_cases: 'test_cases',
    testPlans: 'test_plans',
    test_plans: 'test_plans',
    testCycles: 'test_cycles',
    test_cycles: 'test_cycles',
    testPlanTestCases: 'test_plan_test_cases',
    test_plan_test_cases: 'test_plan_test_cases',
    testCycleTestCases: 'test_cycle_test_cases',
    test_cycle_test_cases: 'test_cycle_test_cases',

    // RAID logs
    risks: 'risks',
    assumptions: 'assumptions',
    issues: 'issues',
    dependencies: 'dependencies',

    // Timesheets
    worklogs: 'worklogs',
    worklogSubmissions: 'worklog_submissions',
    worklog_submissions: 'worklog_submissions',

    // PMO, Releases & Assets
    releases: 'releases',
    documents: 'project_documents',
    projectDocuments: 'project_documents',
    project_documents: 'project_documents',
    paymentMilestones: 'payment_milestones',
    payment_milestones: 'payment_milestones',
    codeRepositories: 'code_repositories',
    code_repositories: 'code_repositories',
    environments: 'environments',
    fixedCosts: 'fixed_costs',
    fixed_costs: 'fixed_costs',
    projectMembers: 'project_members',
    project_members: 'project_members',
};

export function resolveTableName(rawName: string): string {
    if (COLLECTION_TO_TABLE[rawName]) {
        return COLLECTION_TO_TABLE[rawName];
    }
    // Also try converting camelCase to snake_case automatically
    const snake = rawName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (COLLECTION_TO_TABLE[snake]) {
        return COLLECTION_TO_TABLE[snake];
    }
    return 'firebase_compat';
}

export const TABLE_COLUMNS: Record<string, string[]> = {
    portfolios: ['id', 'name', 'description', 'isDeleted', 'deletedAt', 'created_at'],
    employees: ['id', 'empId', 'firstName', 'lastName', 'email', 'phone', 'avatar', 'clientEmpId', 'clientEmail', 'role', 'experience', 'employmentStartDate', 'employmentEndDate', 'onboardingDate', 'offloadingDate', 'accessLevel', 'billedRate', 'costRate', 'costAmount', 'costCurrency', 'availability', 'leavePeriods', 'capabilities', 'isBcpSupport', 'isDeleted', 'deletedAt', 'isEnabled', 'uid', 'created_at'],
    access_control_settings: ['id', 'pageAccess', 'crudAccess'],
    archive_settings: ['id', 'autoArchiveCompletedProjects', 'autoArchiveAfterMonths', 'autoDeleteArchivedProjects', 'autoDeleteAfterMonths', 'customDeleteMonths'],
    holidays: ['id', 'projectId', 'date', 'description', 'type'],
    project_settings: ['id', 'projectId', 'weeklyOffDays', 'sprintDurationInWeeks', 'sprintStartDay', 'overrideGlobalHolidays', 'manMonthToDays', 'manDayToHours', 'storyPointToHours', 'allocatedPaidLeavesPerYear', 'allowCarryOver', 'carryOverLimit'],
    projects: ['id', 'name', 'portfolioId', 'summary', 'description', 'projectManagerId', 'pricingModel', 'status', 'startDate', 'endDate', 'overallStatus', 'scopeStatus', 'costStatus', 'timeStatus', 'statusComments', 'statusHistory', 'isArchived', 'archivedAt', 'projectValue', 'isProjectValueOverridden', 'monthlyBilledValue', 'pmoApproval', 'isDeleted', 'deletedAt', 'created_at'],
    project_members: ['id', 'projectId', 'employeeId', 'role', 'onboardingDate', 'offloadingDate', 'billedRate', 'costRate', 'availability'],
    epics: ['id', 'projectId', 'title', 'description', 'created_at'],
    sprints: ['id', 'projectId', 'sprintId', 'title', 'status', 'startDate', 'endDate', 'isCurrent', 'created_at'],
    kanban_columns: ['id', 'projectId', 'name', 'order', 'isDefault', 'isDoneColumn'],
    stories: ['id', 'projectId', 'storyId', 'sortOrder', 'title', 'description', 'itemType', 'acceptanceCriteria', 'reporterId', 'assigneeId', 'epicId', 'sprintId', 'status', 'resolution', 'statusHistory', 'estimatedHours', 'priority', 'severity', 'startDate', 'endDate', 'updatedAt', 'createdAt', 'closedAt', 'effortDays', 'impactedSystemId', 'impactedSystemIds', 'releaseId', 'predecessorId', 'parentStoryId', 'relatedTestCaseId', 'attachments', 'foundInTestPlanId', 'foundInTestCycleId', 'relatedBugId', 'developmentStartDate', 'completionDate', 'isDeleted', 'deletedAt'],
    test_cases: ['id', 'projectId', 'testCaseId', 'title', 'type', 'description', 'expectedResult', 'storyId', 'releaseId', 'sprintId', 'assigneeId', 'attachment', 'isDeleted', 'deletedAt'],
    test_plans: ['id', 'projectId', 'testPlanId', 'name', 'startDate', 'endDate', 'planType', 'sprintId', 'releaseId', 'environmentId', 'created_at'],
    test_plan_test_cases: ['id', 'testPlanId', 'originalTestCaseId', 'testCaseId', 'title', 'type', 'description', 'expectedResult', 'storyId', 'releaseId', 'sprintId', 'status', 'assigneeId', 'executionDate', 'closeDate', 'statusHistory', 'attachment'],
    test_cycles: ['id', 'projectId', 'testCycleId', 'testPlanId', 'name', 'startDate', 'endDate', 'planType', 'sprintId', 'releaseId', 'environmentId', 'testCaseIds', 'created_at'],
    test_cycle_test_cases: ['id', 'testCycleId', 'testPlanId', 'testCycleName', 'testPlanName', 'originalTestCaseId', 'testCaseId', 'title', 'type', 'description', 'expectedResult', 'storyId', 'releaseId', 'sprintId', 'status', 'assigneeId', 'executionDate', 'closeDate', 'statusHistory', 'actualResult', 'defectId', 'effortHours', 'actualEffortHours', 'attachment', 'attachments'],
    initial_impacted_systems: ['id', 'projectId', 'name', 'description', 'category', 'explanation', 'estimate', 'dailyBillingRate', 'created_at'],
    impacted_systems: ['id', 'projectId', 'name', 'description', 'category', 'explanation', 'estimate', 'dailyBillingRate', 'isInitial'],
    initial_horizontals: ['id', 'projectId', 'name', 'weightage', 'isEnabled', 'dailyBillingRate', 'created_at'],
    horizontals: ['id', 'projectId', 'name', 'weightage', 'isEnabled', 'dailyBillingRate', 'isInitial'],
    risks: ['id', 'projectId', 'riskId', 'description', 'severity', 'probability', 'mitigationPlan', 'residualRisk', 'contingencyPlan', 'isDeleted', 'deletedAt'],
    assumptions: ['id', 'projectId', 'assumptionId', 'description', 'category', 'status', 'validationDate', 'ownerId', 'isDeleted', 'deletedAt'],
    issues: ['id', 'projectId', 'issueId', 'description', 'priority', 'status', 'reportedDate', 'resolvedDate', 'assigneeId', 'isDeleted', 'deletedAt'],
    dependencies: ['id', 'projectId', 'dependencyId', 'description', 'type', 'dependencyOn', 'expectedByDate', 'status', 'ownerId', 'isDeleted', 'deletedAt'],
    worklogs: ['id', 'projectId', 'employeeId', 'date', 'items', 'totalHours'],
    worklog_submissions: ['id', 'projectId', 'employeeId', 'weekStartDate', 'submittedAt'],
    releases: ['id', 'projectId', 'releaseId', 'name', 'description', 'sortOrder', 'startDate', 'endDate', 'milestoneDate', 'itemType', 'parentReleaseId', 'isCompleted'],
    payment_milestones: ['id', 'projectId', 'milestoneId', 'name', 'billingPercentage', 'amount', 'status', 'attachments', 'statusHistory'],
    project_documents: ['id', 'projectId', 'name', 'location', 'createdAt', 'isDeleted', 'deletedAt'],
    code_repositories: ['id', 'projectId', 'name', 'url', 'expiryDate'],
    environments: ['id', 'projectId', 'name', 'order', 'url', 'renewalDate'],
    fixed_costs: ['id', 'projectId', 'name', 'cost', 'type'],
};

export function sanitizeForTable(tableName: string, data: any): any {
    const colList = TABLE_COLUMNS[tableName];
    if (!colList) return data;
    const allowed = new Set(colList);

    const result: any = {};
    for (const key of Object.keys(data)) {
        let targetKey = key;
        if (!allowed.has(targetKey)) {
            if (targetKey === 'createdAt' && allowed.has('created_at')) {
                targetKey = 'created_at';
            } else if (targetKey === 'created_at' && allowed.has('createdAt')) {
                targetKey = 'createdAt';
            } else if (targetKey === 'updatedAt' && allowed.has('updated_at')) {
                targetKey = 'updated_at';
            } else if (targetKey === 'updated_at' && allowed.has('updatedAt')) {
                targetKey = 'updatedAt';
            }
        }

        if (allowed.has(targetKey)) {
            result[targetKey] = serializeValue(data[key]);
        }
    }
    return result;
}

// ============================================================================
// Write operations
// ============================================================================
export const addDoc = async (colRef: any, data: any) => {
    const docId = uuidv4();
    const fullPath = `${colRef.path}/${docId}`;
    const { projectId, testCycleId, testPlanId, collectionName } = parsePathDetails(fullPath);
    const tableName = resolveTableName(collectionName);

    if (tableName !== 'firebase_compat') {
        let insertData: any = { ...data, id: docId };
        if (projectId && tableName !== 'projects' && tableName !== 'portfolios' && tableName !== 'employees') {
            insertData.projectId = projectId;
        }
        if (testCycleId) {
            insertData.testCycleId = testCycleId;
        }
        if (testPlanId) {
            insertData.testPlanId = testPlanId;
        }

        const sanitized = sanitizeForTable(tableName, insertData);
        const { error } = await supabase!.from(tableName).insert([sanitized]);
        if (error) throw error;
    } else {
        const { error } = await supabase!.from('firebase_compat').upsert({
            collection_name: collectionName,
            path: fullPath,
            project_id: projectId,
            data: data,
            updated_at: new Date().toISOString()
        }, { onConflict: 'path' });
        if (error) throw error;
    }

    scheduleListenerNotification(fullPath);
    return { id: docId, path: fullPath };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
    const fullPath = docRef.path;
    const { projectId, testCycleId, testPlanId, collectionName } = parsePathDetails(fullPath);
    const tableName = resolveTableName(collectionName);
    const docId = fullPath.split('/').pop();

    if (tableName !== 'firebase_compat') {
        let upsertData: any = { ...data, id: docId };
        if (projectId && tableName !== 'projects' && tableName !== 'portfolios' && tableName !== 'employees') {
            upsertData.projectId = projectId;
        }
        if (testCycleId) {
            upsertData.testCycleId = testCycleId;
        }
        if (testPlanId) {
            upsertData.testPlanId = testPlanId;
        }

        if (options?.merge) {
            const { data: existing } = await supabase!.from(tableName).select('*').eq('id', docId).single();
            if (existing) {
                let mergedData: any = { ...existing };
                for (const key in upsertData) {
                    if (upsertData[key] && upsertData[key].type === 'arrayUnion') {
                        const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                        mergedData[key] = [...currentArr, ...upsertData[key].elements];
                    } else if (upsertData[key] && upsertData[key].type === 'arrayRemove') {
                        const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                        const toRemove = JSON.stringify(upsertData[key].elements);
                        mergedData[key] = currentArr.filter((el: any) => !toRemove.includes(JSON.stringify(el)));
                    } else {
                        mergedData[key] = upsertData[key];
                    }
                }
                const sanitized = sanitizeForTable(tableName, mergedData);
                const { error } = await supabase!.from(tableName).update(sanitized).eq('id', docId);
                if (error) throw error;
            } else {
                for (const key in upsertData) {
                    if (upsertData[key] && (upsertData[key].type === 'arrayUnion' || upsertData[key].type === 'arrayRemove')) {
                        upsertData[key] = upsertData[key].type === 'arrayUnion' ? upsertData[key].elements : [];
                    }
                }
                const sanitized = sanitizeForTable(tableName, upsertData);
                const { error } = await supabase!.from(tableName).insert([sanitized]);
                if (error) throw error;
            }
        } else {
            for (const key in upsertData) {
                if (upsertData[key] && (upsertData[key].type === 'arrayUnion' || upsertData[key].type === 'arrayRemove')) {
                    upsertData[key] = upsertData[key].type === 'arrayUnion' ? upsertData[key].elements : [];
                }
            }
            const sanitized = sanitizeForTable(tableName, upsertData);
            const { error } = await supabase!.from(tableName).upsert(sanitized, { onConflict: 'id' });
            if (error) throw error;
        }
    } else {
        if (options?.merge) {
            const { data: existing } = await supabase!.from('firebase_compat').select('data').eq('path', fullPath).single();
            let mergedData = existing ? { ...existing.data } : {};
            
            for (const key in data) {
                if (data[key] && data[key].type === 'arrayUnion') {
                    const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                    mergedData[key] = [...currentArr, ...data[key].elements];
                } else if (data[key] && data[key].type === 'arrayRemove') {
                    const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                    const toRemove = JSON.stringify(data[key].elements);
                    mergedData[key] = currentArr.filter((el: any) => !toRemove.includes(JSON.stringify(el)));
                } else {
                    mergedData[key] = data[key];
                }
            }
            const { error } = await supabase!.from('firebase_compat').upsert({
                path: fullPath,
                collection_name: collectionName,
                project_id: projectId,
                data: mergedData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'path' });
            if (error) throw error;
        } else {
            const { error } = await supabase!.from('firebase_compat').upsert({
                path: fullPath,
                collection_name: collectionName,
                project_id: projectId,
                data: data,
                updated_at: new Date().toISOString()
            }, { onConflict: 'path' });
            if (error) throw error;
        }
    }

    scheduleListenerNotification(fullPath);
};

export const updateDoc = async (docRef: any, data: any) => {
    return setDoc(docRef, data, { merge: true });
};

export const deleteDoc = async (docRef: any) => {
    const pathStr = docRef.path;
    const { collectionName } = parsePathDetails(pathStr);
    const tableName = resolveTableName(collectionName);
    const docId = pathStr.split('/').pop();

    if (tableName !== 'firebase_compat') {
        const { error } = await supabase!.from(tableName).delete().eq('id', docId);
        if (error) throw error;
    } else {
        const { error } = await supabase!.from('firebase_compat').delete().eq('path', pathStr);
        if (error) throw error;
    }
    
    scheduleListenerNotification(pathStr);
};

// ============================================================================
// Read operations
// ============================================================================
export const getDoc = async (docRef: any) => {
    const fullPath = docRef.path;
    const { collectionName } = parsePathDetails(fullPath);
    const tableName = resolveTableName(collectionName);
    const docId = fullPath.split('/').pop();

    if (tableName !== 'firebase_compat') {
        const { data, error } = await supabase!.from(tableName).select('*').eq('id', docId).single();
        if (error && error.code !== 'PGRST116') throw error;
        return {
            id: docId,
            exists: () => !!data,
            data: () => data ? hydrateData(data) : undefined
        };
    } else {
        const { data, error } = await supabase!.from('firebase_compat').select('*').eq('path', fullPath).single();
        if (error && error.code !== 'PGRST116') throw error;
        return {
            id: docId,
            exists: () => !!data,
            data: () => data ? hydrateData(data.data) : undefined
        };
    }
};

export const query = (colRef: any, ...constraints: any[]) => {
    return { ...colRef, constraints };
};

export const where = (fieldPath: string, opStr: string, value: any) => {
    return { type: 'where', fieldPath, opStr, value };
};

export const getDocs = async (queryRef: any) => {
    const { projectId, testCycleId, testPlanId, collectionName } = queryRef.path
        ? parsePathDetails(queryRef.path)
        : { projectId: null, testCycleId: null, testPlanId: null, collectionName: queryRef.collectionId || 'unknown' };

    const targetCollection = queryRef.type === 'collectionGroup' ? queryRef.collectionId : collectionName;
    if (!targetCollection) throw new Error("Invalid query, no collection specified");

    const tableName = resolveTableName(targetCollection);
    let request = supabase!.from(tableName).select('*');

    if (tableName !== 'firebase_compat') {
        if (testCycleId) {
            request = request.eq('testCycleId', testCycleId);
        }
        if (testPlanId) {
            request = request.eq('testPlanId', testPlanId);
        }
        if (projectId && tableName !== 'projects' && tableName !== 'portfolios' && tableName !== 'employees') {
            request = request.eq('projectId', projectId);
        }

        if (queryRef.constraints) {
            const colList = TABLE_COLUMNS[tableName];
            const allowed = colList ? new Set(colList) : null;

            for (const c of queryRef.constraints) {
                if (c.type === 'where') {
                    let field = c.fieldPath;
                    if (allowed && !allowed.has(field)) {
                        if (field === 'createdAt' && allowed.has('created_at')) field = 'created_at';
                        else if (field === 'created_at' && allowed.has('createdAt')) field = 'createdAt';
                        else if (field === 'updatedAt' && allowed.has('updated_at')) field = 'updated_at';
                        else if (field === 'updated_at' && allowed.has('updatedAt')) field = 'updatedAt';
                    }

                    if (c.opStr === '==') {
                        request = request.eq(field, serializeValue(c.value));
                    }
                }
            }
        }

        const { data, error } = await request;
        if (error) throw error;

        let filteredData = data || [];

        // Apply != constraints in memory
        if (queryRef.constraints) {
            for (const c of queryRef.constraints) {
                if (c.type === 'where' && c.opStr === '!=') {
                    filteredData = filteredData.filter((row: any) => {
                        let val = row[c.fieldPath];
                        if (val === undefined && c.fieldPath === 'createdAt') val = row['created_at'];
                        if (val === undefined && c.fieldPath === 'created_at') val = row['createdAt'];
                        if (val === undefined && c.fieldPath === 'updatedAt') val = row['updated_at'];
                        if (val === undefined && c.fieldPath === 'updated_at') val = row['updatedAt'];
                        return val !== c.value;
                    });
                }
            }
        }

        const docs = filteredData.map((row: any) => {
            return {
                id: row.id,
                ref: { path: queryRef.path ? `${queryRef.path}/${row.id}` : `${targetCollection}/${row.id}` },
                data: () => hydrateData(row)
            };
        });

        return {
            size: docs.length,
            empty: docs.length === 0,
            docs,
            forEach: (cb: any) => docs.forEach(cb)
        };
    } else {
        // firebase_compat fallback
        let targetDepth = 0;
        if (queryRef.type === 'collectionGroup') {
            request = request.eq('collection_name', targetCollection);
        } else if (queryRef.path) {
            targetDepth = queryRef.path.split('/').length + 1;
            request = request.eq('collection_name', targetCollection).like('path', `${queryRef.path}/%`);
        }

        if (queryRef.constraints) {
            for (const c of queryRef.constraints) {
                if (c.type === 'where') {
                    if (c.opStr === '==') {
                        if (typeof c.value === 'string') {
                            request = request.eq(`data->>${c.fieldPath}`, c.value);
                        } else if (typeof c.value === 'boolean') {
                            request = request.eq(`data->${c.fieldPath}`, c.value);
                        } else {
                            request = request.eq(`data->${c.fieldPath}`, c.value);
                        }
                    }
                }
            }
        }

        const { data, error } = await request;
        if (error) throw error;

        let filteredData = data || [];
        if (targetDepth > 0) {
            filteredData = filteredData.filter((row: any) => row.path.split('/').length === targetDepth);
        }

        if (queryRef.constraints) {
            for (const c of queryRef.constraints) {
                if (c.type === 'where' && c.opStr === '!=') {
                    filteredData = filteredData.filter((row: any) => {
                        const val = row.data ? row.data[c.fieldPath] : undefined;
                        return val !== c.value;
                    });
                }
            }
        }

        const docs = filteredData.map((row: any) => {
            const docId = row.path.split('/').pop();
            return {
                id: docId,
                ref: { path: row.path },
                data: () => hydrateData(row.data)
            };
        });

        return {
            size: docs.length,
            empty: docs.length === 0,
            docs,
            forEach: (cb: any) => docs.forEach(cb)
        };
    }
};

// ============================================================================
// Batch writes with Relational Dependency Ordering
// ============================================================================

/**
 * Phase 1: Roots (Portfolios, Employees, Projects, Project Settings, Holidays)
 * Phase 2: Independent Subcollections / Parents (Epics, Sprints, Test Cycles, Kanban Columns, etc.)
 * Phase 3: Dependent Children (Stories with epicId/sprintId, Test Cases, Cycle Test Cases, RAID)
 * Phase 4: Leaf Logs (Worklogs)
 * Phase 5: Fallback
 */
const TABLE_DEPENDENCY_ORDER: Record<string, number> = {
    portfolios: 1,
    employees: 1,
    access_control_settings: 1,
    archive_settings: 1,
    project_settings: 1,
    holidays: 1,
    projects: 1,

    epics: 2,
    sprints: 2,
    kanban_columns: 2,
    initial_impacted_systems: 2,
    impacted_systems: 2,
    initial_horizontals: 2,
    horizontals: 2,
    environments: 2,
    fixed_costs: 2,
    code_repositories: 2,
    releases: 2,
    test_plans: 2,
    test_cycles: 2,
    payment_milestones: 2,
    project_documents: 2,
    project_members: 2,

    stories: 3,
    test_cases: 3,
    test_plan_test_cases: 3,
    test_cycle_test_cases: 3,
    risks: 3,
    assumptions: 3,
    issues: 3,
    dependencies: 3,

    worklogs: 4,
    worklog_submissions: 4,

    firebase_compat: 5,
};

export const writeBatch = (dbInstance: any) => {
    const operations: any[] = [];
    return {
        set: (docRef: any, data: any, options?: any) => {
             operations.push({ type: 'set', docRef, data, options });
        },
        update: (docRef: any, data: any) => {
             operations.push({ type: 'update', docRef, data });
        },
        delete: (docRef: any) => {
             operations.push({ type: 'delete', docRef });
        },
        commit: async () => {
            const affectedPaths: string[] = [];

            // Group operations by foreign key dependency phases
            const phases: any[][] = [[], [], [], [], [], []];
            for (const op of operations) {
                const fullPath = op.docRef.path;
                affectedPaths.push(fullPath);
                const { collectionName } = parsePathDetails(fullPath);
                const table = resolveTableName(collectionName);
                const priority = TABLE_DEPENDENCY_ORDER[table] || 3;
                phases[priority].push(op);
            }

            // Commit each phase sequentially so parents commit before dependent children
            for (let p = 1; p <= 5; p++) {
                const phaseOps = phases[p];
                if (phaseOps.length === 0) continue;

                // Execute operations within the phase in concurrent chunks
                const CHUNK_SIZE = 50;
                for (let i = 0; i < phaseOps.length; i += CHUNK_SIZE) {
                    const chunk = phaseOps.slice(i, i + CHUNK_SIZE);
                    await Promise.all(chunk.map(async (op: any) => {
                        if (op.type === 'set') {
                            await setDoc(op.docRef, op.data, op.options);
                        } else if (op.type === 'update') {
                            await updateDoc(op.docRef, op.data);
                        } else if (op.type === 'delete') {
                            await deleteDoc(op.docRef);
                        }
                    }));
                }
            }

            for (const p of affectedPaths) {
                scheduleListenerNotification(p);
            }
        }
    };
};

// ============================================================================
// Array field helpers
// ============================================================================
export const arrayUnion = (...elements: any[]) => {
    return { type: 'arrayUnion', elements };
};

export const arrayRemove = (...elements: any[]) => {
    return { type: 'arrayRemove', elements };
};

// ============================================================================
// onSnapshot
// ============================================================================
export const onSnapshot = (ref: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) => {
    const collectionPath = ref.type === 'collectionGroup' ? ref.collectionId : ref.path;
    const listenerObj: Listener = { collectionPath, ref, onNext, onError };
    listeners.push(listenerObj);

    // Initial fetch
    if (ref.type === 'doc') {
        getDoc(ref).then(onNext).catch(err => {
            console.error('onSnapshot initial fetch error:', err);
            if (onError) onError(err);
        });
    } else {
        getDocs(ref).then(onNext).catch(err => {
            console.error('onSnapshot initial fetch error:', err);
            if (onError) onError(err);
        });
    }

    // Secondary: Supabase Realtime
    let channel: any = null;
    try {
        let identifier = ref.path || ref.collectionId || 'all';
        let collectionName = 'unknown';
        if (ref.type === 'collectionGroup') {
            collectionName = ref.collectionId;
        } else if (ref.path) {
            const { collectionName: parsedName } = parsePathDetails(ref.path);
            collectionName = parsedName;
        }

        const tableName = resolveTableName(collectionName);
        const channelName = `realtime_${identifier.replace(/[^a-zA-Z0-9]/g, '_')}_${channelCounter++}`;

        if (tableName !== 'firebase_compat') {
            channel = supabase!.channel(channelName)
                .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload: any) => {
                    const changedId = payload.new?.id || payload.old?.id;
                    const docPath = ref.path ? (ref.path.split('/').length % 2 === 0 ? ref.path : `${ref.path}/${changedId}`) : `${collectionName}/${changedId}`;
                    
                    const isExactDoc = ref.type === 'doc' && ref.path.endsWith(changedId);
                    const isDirectChild = ref.type !== 'doc' && ref.path && docPath.startsWith(ref.path);
                    const isMatchingGroup = ref.type === 'collectionGroup' && tableName === resolveTableName(ref.collectionId);

                    if (isExactDoc || isDirectChild || isMatchingGroup) {
                        if (ref.type === 'doc') {
                            getDoc(ref).then(onNext).catch(err => { if (onError) onError(err); });
                        } else {
                            getDocs(ref).then(onNext).catch(err => { if (onError) onError(err); });
                        }
                    }
                })
                .subscribe();
        } else {
            channel = supabase!.channel(channelName)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'firebase_compat' }, (payload: any) => {
                const changedPath = payload.new?.path || payload.old?.path || '';
                const isExactDoc = ref.type === 'doc' && changedPath === ref.path;
                const isDirectChild = ref.type !== 'doc' && ref.path &&
                    changedPath.startsWith(ref.path + '/') &&
                    changedPath.split('/').length === ref.path.split('/').length + 1;
                const isMatchingGroup = ref.type === 'collectionGroup' &&
                    (payload.new?.collection_name === ref.collectionId || payload.old?.collection_name === ref.collectionId);

                if (isExactDoc || isDirectChild || isMatchingGroup) {
                    if (ref.type === 'doc') {
                        getDoc(ref).then(onNext).catch(err => { if (onError) onError(err); });
                    } else {
                        getDocs(ref).then(onNext).catch(err => { if (onError) onError(err); });
                    }
                }
            })
            .subscribe();
        }
    } catch (e) {
        // Fallback to local pub-sub
    }

    return () => {
        const index = listeners.indexOf(listenerObj);
        if (index > -1) listeners.splice(index, 1);
        if (channel) {
            try { supabase!.removeChannel(channel); } catch (e) { }
        }
    };
};

// ============================================================================
// Ordering & collection groups
// ============================================================================
export const orderBy = (fieldPath: string, directionStr: string = 'asc') => {
    return { type: 'orderBy', fieldPath, directionStr };
};

export const collectionGroup = (dbInstance: any, collectionId: string) => {
    return { type: 'collectionGroup', collectionId };
};
