

'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren, useCallback } from 'react';
import { db, firebaseConfig } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  query,
  getDocs,
  where,
  Timestamp,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase, Risk, Assumption, Issue, Dependency, KanbanColumn, Holiday, ProjectSettings, ImpactedSystem, Release, Worklog, WorklogItem, WorklogSubmission, LeavePeriod, Project, Horizontal, User, Environment, WorkItemType, BugCriticality, RiskSeverity, RiskProbability, AssumptionCategory, AssumptionStatus, IssuePriority, IssueStatus, DependencyStatus, ProjectDocument, PaymentMilestone, CodeRepository, StatusHistoryItem, SprintStatus, FixedCost, TestPlan } from '@/types';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { usePathname } from 'next/navigation';

// Helper to remove undefined values from an object before sending to Firestore
const sanitizeForFirestore = (data: any) => {
    const sanitized: any = {};
    for (const key in data) {
        if (data[key] !== undefined) {
             if (typeof data[key] === 'number' && !Number.isNaN(data[key])) {
                sanitized[key] = data[key];
            } else if (typeof data[key] !== 'number') {
                sanitized[key] = data[key];
            }
        }
    }
    return sanitized;
};


interface ProjectContextType {
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
  testDate: Date | null;
  setTestDate: (date: Date | null) => void;
  
  // Project actions
  updateProject: (data: Partial<Omit<Project, 'id'>>) => Promise<boolean>;
  
  // Story actions
  addStory: (story: Omit<Story, 'id' | 'storyId'>, prefix?: string) => Promise<boolean>;
  autoGenerateStories: (counts: Record<WorkItemType, number>) => Promise<boolean>;
  updateStory: (storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>) => Promise<boolean>;
  deleteStory: (storyId: string) => Promise<boolean>;
  moveStoryToSprint: (storyId: string, sprintId: string | null) => Promise<boolean>;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => Promise<boolean>;
  moveStoryToEpic: (storyId: string, epicId: string | null) => Promise<boolean>;
  bulkUpdateSubTaskReleases: (releaseId: string) => Promise<boolean>;
  bulkDeleteStories: (storyIds: string[]) => Promise<boolean>;
  bulkMoveStoriesToEpic: (storyIds: string[], targetEpicId: string | null) => Promise<boolean>;
  bulkAssignSubTasks: (taskIds: string[], assigneeId: string | null) => Promise<boolean>;


  // Epic actions
  addEpic: (epic: Omit<Epic, 'id'>) => Promise<boolean>;
  updateEpic: (epicId: string, data: Partial<Omit<Epic, 'id'>>) => Promise<boolean>;
  deleteEpic: (epicId: string, deleteItems?: boolean) => Promise<boolean>;

  // Sprint actions
  addSprint: (sprint: { title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }) => Promise<boolean>;
  updateSprint: (sprintId: string, data: { title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }) => Promise<boolean>;
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
  
  // Bug actions
  autoGenerateBugs: (counts: Record<string, number>) => Promise<boolean>;

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
  autoGenerateIssues: (count: number) => Promise<boolean>;

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

  // Initial Estimation Actions
  addInitialImpactedSystem: (system: Omit<ImpactedSystem, 'id'>) => Promise<boolean>;
  updateInitialImpactedSystem: (systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>) => Promise<boolean>;
  deleteInitialImpactedSystem: (systemId: string) => Promise<boolean>;
  addInitialHorizontal: (horizontal: Omit<Horizontal, 'id'>) => Promise<boolean>;
  updateInitialHorizontal: (horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>) => Promise<boolean>;
  deleteInitialHorizontal: (horizontalId: string) => Promise<boolean>;
  confirmInitialEstimation: () => Promise<boolean>;

  // Horizontal Actions (live)
  addHorizontal: (horizontal: Omit<Horizontal, 'id'>) => Promise<boolean>;
  updateHorizontal: (horizontalId: string, data: Partial<Omit<Horizontal, 'id'>>) => Promise<boolean>;
  deleteHorizontal: (horizontalId: string) => Promise<boolean>;

  // Environment actions
  addEnvironment: (environment: Omit<Environment, 'id' | 'order'>) => Promise<boolean>;
  updateEnvironment: (environmentId: string, data: Partial<Omit<Environment, 'id' | 'order'>>) => Promise<boolean>;
  deleteEnvironment: (environmentId: string) => Promise<boolean>;
  updateEnvironmentOrder: (oldIndex: number, newIndex: number) => Promise<boolean>;

  // Worklog actions
  saveWorklog: (worklog: Omit<Worklog, 'id'>) => Promise<boolean>;
  submitWorklogForWeek: (employeeId: string, weekStartDate: string) => Promise<boolean>;
  
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

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const defaultKanbanColumns: Omit<KanbanColumn, 'id'>[] = [
  { name: 'To Do', order: 0, isDefault: true, isDoneColumn: false },
  { name: 'In Progress', order: 1, isDefault: true, isDoneColumn: false },
  { name: 'Done', order: 2, isDefault: true, isDoneColumn: true },
];

const defaultProjectSettings: Omit<ProjectSettings, 'id'> = {
  sprintDurationInWeeks: 2,
  sprintStartDay: 1, // Monday
  overrideGlobalHolidays: false,
  manMonthToDays: 22,
  manDayToHours: 8,
  storyPointToHours: 8,
};

const defaultHorizontals: Omit<Horizontal, 'id'>[] = [
    { name: 'Project Management', weightage: 10, isEnabled: true },
    { name: 'Business Analysis', weightage: 10, isEnabled: true },
    { name: 'Architecture', weightage: 10, isEnabled: true },
    { name: 'Quality Analysis', weightage: 15, isEnabled: true },
    { name: 'UI/UX', weightage: 5, isEnabled: false },
    { name: 'Dev Ops', weightage: 5, isEnabled: false },
];

const defaultFixedCosts: Omit<FixedCost, 'id'>[] = [
    { name: 'Software (Licenses etc)', cost: 0 },
    { name: 'Hardware (Hosting/GIT etc)', cost: 0 },
    { name: 'Miscellaneous', cost: 0 },
];

const defaultEnvironments: Omit<Environment, 'id'>[] = [
    { name: 'Dev', order: 0 },
    { name: 'SIT', order: 1 },
    { name: 'UAT', order: 2 },
    { name: 'Production', order: 3 },
    { name: 'VAPT', order: 4 },
    { name: 'Performance', order: 5 },
];

const standardDocs = [
  'SOW',
  'Requirements',
  'HLD/DD',
  'UI/UX Designs',
  'Lessons learned',
  'Status Reports',
  'BCP',
  'GIT',
  'Closure',
];

type CollectionName = 'epics' | 'stories' | 'sprints' | 'employees' | 'testCases' | 'risks' | 'assumptions' | 'issues' | 'dependencies' | 'kanbanColumns' | 'holidays' | 'releases' | 'impactedSystems' | 'horizontals' | 'initialImpactedSystems' | 'initialHorizontals' | 'fixedCosts' | 'environments' | 'worklogs' | 'worklogSubmissions' | 'settings' | 'project' | 'allUsers' | 'documents' | 'paymentMilestones' | 'codeRepositories' | 'testPlans';

const pageToCollectionMap: Record<string, CollectionName[]> = {
    '/development/dashboard': ['stories', 'sprints', 'releases', 'holidays', 'weeklyOffDays'],
    '/development/kanban': ['stories', 'epics', 'sprints', 'kanbanColumns', 'employees', 'environments', 'impactedSystems', 'releases', 'holidays', 'weeklyOffDays'],
    '/development/grooming': ['stories', 'sprints', 'projectSettings', 'epics', 'employees', 'environments', 'impactedSystems', 'holidays', 'weeklyOffDays', 'releases'],
    '/development/backlog': ['epics', 'stories', 'sprints', 'employees', 'releases', 'projectSettings', 'environments', 'impactedSystems', 'holidays', 'weeklyOffDays'],
    '/development/development-tasks': ['stories', 'employees', 'sprints', 'epics', 'holidays', 'impactedSystems', 'releases'],
    '/testing/dashboard': ['testCases', 'stories', 'sprints', 'releases', 'testPlans'],
    '/testing/test-plan': ['testCases', 'employees', 'releases', 'stories', 'testPlans', 'sprints', 'environments'],
    '/testing/test-cases': ['testCases', 'employees', 'stories', 'sprints', 'releases', 'environments', 'testPlans'],
    '/testing/bug-list': ['stories', 'employees', 'sprints', 'environments', 'releases', 'testCases'],
    '/project-details/project-dashboard': ['employees', 'allUsers', 'sprints', 'stories', 'releases', 'holidays', 'weeklyOffDays', 'epics', 'fixedCosts', 'worklogs'],
    '/project-details/architecture': ['environments', 'impactedSystems', 'horizontals'],
    '/initial-estimation/ballpark': ['initialImpactedSystems', 'initialHorizontals'],
    '/releases/project-releases': ['releases'],
    '/resources/project-resources': ['employees', 'allUsers', 'impactedSystems', 'stories', 'sprints', 'holidays', 'weeklyOffDays', 'horizontals'],
    '/resources/resource-gantt': ['stories', 'epics', 'employees', 'sprints'],
    '/resources/worklog': ['employees', 'stories', 'worklogs', 'worklogSubmissions', 'holidays'],
    '/resources/leave-tracker': ['employees', 'holidays', 'weeklyOffDays'],
    '/resources/leave-calendar': ['employees', 'holidays', 'weeklyOffDays'],
    '/raid-dashboard': ['risks', 'assumptions', 'issues', 'dependencies'],
    '/risks': ['risks'],
    '/assumptions': ['assumptions', 'employees'],
    '/issues': ['issues', 'employees'],
    '/dependencies': ['dependencies', 'employees'],
    '/holidays': ['holidays', 'projectSettings'],
    '/settings/board': ['kanbanColumns'],
    '/settings/sprint': ['projectSettings'],
    '/settings/effort': ['projectSettings'],
    '/pmo/documents': ['documents'],
    '/pmo/payment-milestones': ['paymentMilestones'],
    '/pmo/business-continuity': ['environments', 'codeRepositories', 'employees'],
    '/pmo/resource-billing': ['employees', 'holidays', 'weeklyOffDays', 'fixedCosts'],
};


export function ProjectProvider({ children, projectId }: PropsWithChildren<{ projectId: string }>) {
  const [project, setProject] = useState<Project | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [paymentMilestones, setPaymentMilestones] = useState<PaymentMilestone[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [projectHolidays, setProjectHolidays] = useState<Holiday[]>([]);
  const [globalHolidays, setGlobalHolidays] = useState<Holiday[]>([]);
  const [releasesAndMilestones, setReleasesAndMilestones] = useState<Release[]>([]);
  const [impactedSystems, setImpactedSystems] = useState<ImpactedSystem[]>([]);
  const [horizontals, setHorizontals] = useState<Horizontal[]>([]);
  const [initialImpactedSystems, setInitialImpactedSystems] = useState<ImpactedSystem[]>([]);
  const [initialHorizontals, setInitialHorizontals] = useState<Horizontal[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [codeRepositories, setCodeRepositories] = useState<CodeRepository[]>([]);
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [worklogSubmissions, setWorklogSubmissions] = useState<WorklogSubmission[]>([]);
  const [projectSettings, setProjectSettings] = useState<ProjectSettings | null>(null);
  const [globalSettings, setGlobalSettings] = useState<ProjectSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testDate, setTestDate] = useState<Date | null>(new Date());
  
  const pathname = usePathname();

  const holidays = projectSettings?.overrideGlobalHolidays ? projectHolidays : globalHolidays;
  const weeklyOffDays = projectSettings?.overrideGlobalHolidays 
    ? projectSettings?.weeklyOffDays ?? globalSettings?.weeklyOffDays ?? [0, 6] 
    : globalSettings?.weeklyOffDays ?? [0, 6];

  const getCollectionsForPage = useCallback((path: string): CollectionName[] => {
      const pageKey = Object.keys(pageToCollectionMap).find(key => path.endsWith(key));
      const baseCollections: CollectionName[] = ['project', 'settings'];
      if (!pageKey) return baseCollections;
      const mappedCollections = pageToCollectionMap[pageKey] || [];
      return [...new Set([...baseCollections, ...mappedCollections])];
  }, []);

  useEffect(() => {
    if (!db || !projectId) {
        if (!db) {
            setError(`Firebase is not configured correctly. The application is trying to use the Project ID: "${firebaseConfig.projectId || 'your-project-id'}". This is likely a placeholder. Please check your project setup in the Firebase Studio settings to ensure it's correctly linked to a Firebase project.`);
        }
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);

    const rootProjectDocRef = doc(db, 'projects', projectId);

    const allCollections: { name: CollectionName, setState: React.Dispatch<any>, isDoc: boolean }[] = [
        { name: 'project', setState: setProject, isDoc: true },
        { name: 'epics', setState: setEpics, isDoc: false },
        { name: 'stories', setState: setStories, isDoc: false },
        { name: 'sprints', setState: setSprints, isDoc: false },
        { name: 'employees', setState: setEmployees, isDoc: false },
        { name: 'testCases', setState: setTestCases, isDoc: false },
        { name: 'risks', setState: setRisks, isDoc: false },
        { name: 'assumptions', setState: setAssumptions, isDoc: false },
        { name: 'issues', setState: setIssues, isDoc: false },
        { name: 'dependencies', setState: setDependencies, isDoc: false },
        { name: 'documents', setState: setDocuments, isDoc: false },
        { name: 'paymentMilestones', setState: setPaymentMilestones, isDoc: false },
        { name: 'kanbanColumns', setState: setKanbanColumns, isDoc: false },
        { name: 'holidays', setState: setProjectHolidays, isDoc: false },
        { name: 'releases', setState: setReleasesAndMilestones, isDoc: false },
        { name: 'impactedSystems', setState: setImpactedSystems, isDoc: false },
        { name: 'horizontals', setState: setHorizontals, isDoc: false },
        { name: 'initialImpactedSystems', setState: setInitialImpactedSystems, isDoc: false },
        { name: 'initialHorizontals', setState: setInitialHorizontals, isDoc: false },
        { name: 'fixedCosts', setState: setFixedCosts, isDoc: false },
        { name: 'environments', setState: setEnvironments, isDoc: false },
        { name: 'codeRepositories', setState: setCodeRepositories, isDoc: false },
        { name: 'testPlans', setState: setTestPlans, isDoc: false },
        { name: 'worklogs', setState: setWorklogs, isDoc: false },
        { name: 'worklogSubmissions', setState: setWorklogSubmissions, isDoc: false },
        { name: 'settings', setState: setProjectSettings, isDoc: true },
    ];

    const neededCollectionNames = getCollectionsForPage(pathname);
    const neededCollections = allCollections.filter(c => neededCollectionNames.includes(c.name));
    
    const initialFetchPromises: Promise<any>[] = [];
    const unsubscribers = neededCollections.map(({ name, setState, isDoc }) => {
        let collectionRef: any;
         if (name === 'project') {
            collectionRef = rootProjectDocRef;
        } else if (name === 'settings') {
            collectionRef = doc(rootProjectDocRef, 'settings', 'main');
        } else {
            collectionRef = collection(rootProjectDocRef, name);
        }

        if (isDoc) {
            initialFetchPromises.push(getDoc(collectionRef));
        } else {
            initialFetchPromises.push(getDocs(collectionRef));
        }
        
        return onSnapshot(collectionRef, (snapshot: any) => {
            if (snapshot.docs) { // This is a query snapshot
                if (name === 'kanbanColumns' && snapshot.empty) {
                    const batch = writeBatch(db);
                    defaultKanbanColumns.forEach(col => {
                        const docRef = doc(collection(rootProjectDocRef, 'kanbanColumns'));
                        batch.set(docRef, col);
                    });
                    batch.commit().catch(e => console.error("Failed to set default Kanban columns", e));
                    return;
                }
                if (name === 'fixedCosts' && snapshot.empty) {
                    const batch = writeBatch(db);
                    defaultFixedCosts.forEach(cost => {
                        const docRef = doc(collection(rootProjectDocRef, 'fixedCosts'));
                        batch.set(docRef, cost);
                    });
                    batch.commit().catch(e => console.error("Failed to set default Fixed Costs", e));
                    return;
                }
                 // ... other default data logic
            }

            const formatData = (doc: any) => {
                const docData = doc.data();
                if (!docData) return { id: doc.id };
                const convertTimestamp = (field: any) => field?.toDate ? field.toDate().toISOString() : field;
                const dateFields: Record<string, string[]> = {
                    stories: ['startDate', 'endDate', 'deletedAt', 'updatedAt', 'developmentStartDate', 'completionDate'],
                    testCases: ['deletedAt', 'executionDate', 'closeDate'],
                    testPlans: ['startDate', 'endDate'],
                    risks: ['deletedAt'],
                    assumptions: ['validationDate', 'deletedAt'],
                    issues: ['reportedDate', 'resolvedDate', 'deletedAt'],
                    dependencies: ['expectedByDate', 'deletedAt'],
                    sprints: ['startDate', 'endDate'],
                    employees: ['onboardingDate', 'offloadingDate', 'employmentStartDate', 'employmentEndDate'],
                    releases: ['startDate', 'endDate', 'milestoneDate'],
                    worklogs: ['date'],
                    worklogSubmissions: ['weekStartDate', 'submittedAt'],
                    holidays: ['date'],
                    documents: ['createdAt'],
                    codeRepositories: ['expiryDate'],
                };
                if (dateFields[name]) {
                    dateFields[name].forEach(field => {
                        if (docData[field]) {
                            docData[field] = Array.isArray(docData[field])
                                ? docData[field].map(convertTimestamp)
                                : convertTimestamp(docData[field]);
                        }
                    });
                }
                if(name === 'employees' && docData.leavePeriods) {
                    docData.leavePeriods = docData.leavePeriods.map((lp: any) => ({
                        ...lp,
                        startDate: convertTimestamp(lp.startDate),
                        endDate: convertTimestamp(lp.endDate)
                    }))
                }
                if(name === 'stories' && docData.statusHistory) {
                    docData.statusHistory = docData.statusHistory.map((sh: any) => ({
                        ...sh,
                        date: convertTimestamp(sh.date),
                    }))
                }
                return { id: doc.id, ...docData };
            };
            
            if (snapshot.docs) { // QuerySnapshot
                const data = snapshot.docs.map(formatData);
                setState(data);
            } else if (snapshot.exists()) { // DocumentSnapshot
                setState(formatData(snapshot));
            } else {
                 if (name === 'settings') {
                    setDoc(doc(rootProjectDocRef, 'settings', 'main'), defaultProjectSettings).catch(e => console.error("Failed to set default project settings", e));
                 } else if (name === 'project') {
                    setError(`Project with ID "${projectId}" not found.`);
                 }
                 setState(isDoc ? null : []);
            }
        }, (err: any) => {
            console.error(`Error fetching ${name}:`, err);
            setError(`Failed to listen to the database. (Collection: ${name}, Error: ${err.message})`);
        });
    });
    
    // Global listeners that are always active
    const globalSettingsDocRef = doc(db, 'settings', 'main');
    const unsubGlobalSettings = onSnapshot(globalSettingsDocRef, (doc) => {
        setGlobalSettings(doc.exists() ? doc.data() as ProjectSettings : null);
    });

    const unsubGlobalHolidays = onSnapshot(collection(db, 'holidays'), (snapshot) => {
        const holidaysData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            } as Holiday
        });
        setGlobalHolidays(holidaysData);
    });
    
    const unsubAllUsers = onSnapshot(query(collection(db, 'employees'), where('isDeleted', '!=', true)), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setAllUsers(usersData);
    });

    Promise.all(initialFetchPromises).then(() => {
        setIsLoading(false);
    }).catch(err => {
        console.error("Error during initial data fetch:", err);
        setError("Failed to load initial project data.");
        setIsLoading(false);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
      unsubGlobalSettings();
      unsubGlobalHolidays();
      unsubAllUsers();
    }
  }, [projectId, pathname, getCollectionsForPage]);


  const updateProject = async (data: Partial<Omit<Project, 'id'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await updateDoc(doc(db, 'projects', projectId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update project.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  }
  
  const updateStoryEffort = async (storyId: string) => {
    if (!db || !projectId) return;
    const parentStoryRef = doc(db, 'projects', projectId, 'stories', storyId);

    const subItemsSnapshot = await getDocs(query(collection(db, 'projects', projectId, 'stories'), where('parentStoryId', '==', storyId)));
    const subItems = subItemsSnapshot.docs.map(doc => doc.data() as Story);

    const totalHours = subItems.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
    
    const updatePayload: any = { estimatedHours: totalHours };

    const subItemsWithDates = subItems.filter(s => s.developmentStartDate);
    if(subItemsWithDates.length > 0) {
      const parentDevStart = Math.min(...subItemsWithDates.map(s => new Date(s.developmentStartDate!).getTime()));
      updatePayload.developmentStartDate = new Date(parentDevStart).toISOString();

      const completedSubItems = subItems.filter(s => s.completionDate);
      if(completedSubItems.length === subItems.length) {
        const parentCompletion = Math.max(...completedSubItems.map(s => new Date(s.completionDate!).getTime()));
        updatePayload.completionDate = new Date(parentCompletion).toISOString();
      }
    }
    
    await updateDoc(parentStoryRef, updatePayload);
  };

  // Story Actions
  const addStory = async (story: Omit<Story, 'id' | 'storyId'>, prefixOverride?: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    const projectDocRef = doc(db, 'projects', projectId);
    try {
        const storiesSnapshot = await getDocs(collection(projectDocRef, 'stories'));
        const newIdNumber = storiesSnapshot.size > 0
            ? Math.max(0, ...storiesSnapshot.docs
                .map(doc => doc.data().storyId)
                .filter((id: string | undefined) => id && typeof id === 'string')
                .map((id: string) => parseInt(id.replace(/^[A-Z]+-/, ''), 10) || 0)
            ) + 1
            : 1;

        const defaultPrefixMap: Record<WorkItemType, string> = {
            'Requirement/Story': 'ST',
            'Feature Change': 'FC',
            'Task': 'TASK',
            'Bug': 'BUG',
            'Sub Task': 'SUB',
        };
        const prefix = prefixOverride || defaultPrefixMap[story.itemType] || 'ITEM';
        const storyId = `${prefix}-${newIdNumber}`;
        const now = (testDate || new Date()).toISOString();

        const { startDate, endDate, ...rest } = story;
        const payload: any = { 
            ...rest, 
            storyId, 
            isDeleted: false, 
            deletedAt: null,
            statusHistory: [{ fromStatus: null, toStatus: story.status, date: now }]
        };
        if (startDate) payload.startDate = Timestamp.fromDate(new Date(startDate));
        if (endDate) payload.endDate = Timestamp.fromDate(new Date(endDate));


        // If it's a sub-item (Bug) linked to a story, inherit the sprint
        if (['Bug'].includes(story.itemType) && story.parentStoryId) {
            const parentStory = stories.find(s => s.id === story.parentStoryId);
            if (parentStory && parentStory.sprintId) {
                payload.sprintId = parentStory.sprintId;
            }
        }
        
        await addDoc(collection(projectDocRef, 'stories'), sanitizeForFirestore(payload));

        if (story.itemType === 'Sub Task' && story.parentStoryId) {
            await updateStoryEffort(story.parentStoryId);
        }
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to add story.", e);
        return false;
    }
  };

  const autoGenerateStories = async (counts: Record<WorkItemType, number>): Promise<boolean> => {
    if (!db || !projectId) return false;
    
    const getRandomItem = <T,>(arr: T[]): T | undefined => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
    
    try {
      const batch = writeBatch(db);
      
      const storiesSnapshot = await getDocs(collection(db, 'projects', projectId, 'stories'));
        
      const highestId = storiesSnapshot.docs.reduce((maxId, doc) => {
        const storyId = doc.data().storyId;
        if (typeof storyId === 'string') {
          const numericPart = storyId.match(/\d+$/);
          if (numericPart) {
            return Math.max(maxId, parseInt(numericPart[0], 10));
          }
        }
        return maxId;
      }, 0);
      
      let currentIdCounter = highestId + 1;

      const prefixMap: Record<WorkItemType, string> = {
          'Requirement/Story': 'ST',
          'Feature Change': 'FC',
          'Task': 'TASK',
          'Bug': 'BUG',
          'Sub Task': 'SUB',
      };
      
      const itemTypes = Object.keys(counts) as WorkItemType[];
      
      for (const itemType of itemTypes) {
        const count = counts[itemType];
        for (let i = 0; i < count; i++) {
          const newStoryRef = doc(collection(db, 'projects', projectId, 'stories'));
          const now = (testDate || new Date()).toISOString();

          const newStory: Omit<Story, 'id'> = {
            storyId: `${prefixMap[itemType]}-${currentIdCounter}`,
            title: `Auto-generated ${itemType} ${i + 1}`,
            description: `This is an auto-generated description for ${itemType.toLowerCase()}.`,
            itemType: itemType,
            status: 'To Do',
            statusHistory: [{ fromStatus: null, toStatus: 'To Do', date: now }],
            epicId: getRandomItem(epics)?.id,
            sprintId: null,
            estimatedHours: Math.floor(Math.random() * 20) + 1,
            impactedSystemIds: [getRandomItem(impactedSystems)?.id].filter(Boolean) as string[],
            isDeleted: false,
            deletedAt: null
          };
          batch.set(newStoryRef, sanitizeForFirestore(newStory));
          currentIdCounter++;

          const numSubTasks = Math.floor(Math.random() * 3) + 2; // 2 to 4 subtasks
          for (let j = 0; j < numSubTasks; j++) {
            const newSubTaskRef = doc(collection(db, 'projects', projectId, 'stories'));
            const subTask: Omit<Story, 'id'> = {
              storyId: `SUB-${currentIdCounter}`,
              title: `Auto-generated sub-task ${j + 1} for ${newStory.storyId}`,
              itemType: 'Sub Task',
              status: 'To Do',
              statusHistory: [{ fromStatus: null, toStatus: 'To Do', date: now }],
              parentStoryId: newStoryRef.id,
              epicId: newStory.epicId,
              estimatedHours: Math.floor(Math.random() * 8) + 1,
              impactedSystemId: getRandomItem(impactedSystems)?.id,
              isDeleted: false,
              deletedAt: null
            };
            batch.set(newSubTaskRef, sanitizeForFirestore(subTask));
            currentIdCounter++;
          }
        }
      }

      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to auto-generate stories.", e);
      return false;
    }
  };

  const updateStory = async (storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    
    const storyRef = doc(db, 'projects', projectId, 'stories', storyId);
    const storyToUpdate = stories.find(s => s.id === storyId);
    
    if (!storyToUpdate) {
        console.error("Story to update not found in local cache:", storyId);
        return false;
    }

    try {
        const batch = writeBatch(db);
        const { startDate, endDate, ...rest } = data;
        
        // Use a mutable payload
        let payload: any = { ...rest, updatedAt: Timestamp.now().toDate().toISOString() };
        const now = (testDate || new Date()).toISOString();

        if (data.hasOwnProperty('assigneeId') && data.assigneeId === undefined) {
          payload.assigneeId = null;
        }

        if (data.status && data.status !== storyToUpdate.status) {
            const newHistoryEntry: StatusHistoryItem = {
                fromStatus: storyToUpdate.status || null,
                toStatus: data.status,
                date: now,
            };
            payload.statusHistory = arrayUnion(sanitizeForFirestore(newHistoryEntry));
            if (storyToUpdate.status === 'To Do' && data.status !== 'To Do' && !storyToUpdate.developmentStartDate) {
                payload.developmentStartDate = now;
            }
            if (data.status === 'Done' && !storyToUpdate.completionDate) {
                payload.completionDate = now;
            }
        }

        if (data.hasOwnProperty('startDate')) payload.startDate = startDate ? Timestamp.fromDate(new Date(startDate)) : null;
        if (data.hasOwnProperty('endDate')) payload.endDate = endDate ? Timestamp.fromDate(new Date(endDate)) : null;

        batch.update(storyRef, sanitizeForFirestore(payload));

        if (data.hasOwnProperty('sprintId') || data.hasOwnProperty('releaseId')) {
            const subTasks = stories.filter(s => s.parentStoryId === storyId && s.itemType === 'Sub Task');
            for (const task of subTasks) {
                const taskRef = doc(db, 'projects', projectId, 'stories', task.id);
                const subTaskUpdate: { sprintId?: string | null, releaseId?: string } = {};
                if (data.hasOwnProperty('sprintId')) subTaskUpdate.sprintId = data.sprintId;
                if (data.hasOwnProperty('releaseId')) subTaskUpdate.releaseId = data.releaseId;
                batch.update(taskRef, subTaskUpdate);
            }
        }

        await batch.commit();

        if (storyToUpdate.itemType === 'Sub Task' && storyToUpdate.parentStoryId) {
            await updateStoryEffort(storyToUpdate.parentStoryId);

            if (data.status) {
                const allSubTasksSnapshot = await getDocs(
                    query(collection(db, 'projects', projectId, 'stories'), where('parentStoryId', '==', storyToUpdate.parentStoryId))
                );
                const allSubTasks = allSubTasksSnapshot.docs.map(d => ({id: d.id, ...d.data() as Story}));
                
                const updatedSubTasks = allSubTasks.map(t => t.id === storyId ? { ...t, status: data.status! } : t);

                const firstStatus = updatedSubTasks[0]?.status;
                if (updatedSubTasks.length > 0 && updatedSubTasks.every(t => t.status === firstStatus)) {
                    const parentStory = stories.find(s => s.id === storyToUpdate.parentStoryId);
                    if (parentStory && parentStory.status !== firstStatus) {
                        await updateStory(parentStory.id, { status: firstStatus });
                    }
                }
            }
        }
        
        return true;
    } catch(e) {
      console.error("Firebase error updating story", e);
      return false;
    }
};


  const deleteStory = async (storyId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    const storyRef = doc(db, 'projects', projectId, 'stories', storyId);
    const storyToDelete = stories.find(s => s.id === storyId);

    await updateDoc(storyRef, { isDeleted: true, deletedAt: Timestamp.now() });

    if (storyToDelete?.itemType === 'Sub Task' && storyToDelete.parentStoryId) {
      await updateStoryEffort(storyToDelete.parentStoryId);
    }
    return true;
  };

  const moveStoryToSprint = async (storyId: string, sprintId: string | null): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      const storyRef = doc(db, 'projects', projectId, 'stories', storyId);
  
      // 1. Move the parent story
      batch.update(storyRef, { sprintId });
  
      // 2. Find and move all related sub-items (Bugs and Tasks)
      const q = query(collection(db, 'projects', projectId, 'stories'), where('parentStoryId', '==', storyId));
      const subItemsSnapshot = await getDocs(q);
  
      subItemsSnapshot.forEach(subItemDoc => {
        batch.update(doc(db, 'projects', projectId, 'stories', subItemDoc.id), { sprintId });
      });
  
      await batch.commit();
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to move story and sub-items to sprint.", { storyId, sprintId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const moveStoryStatus = (storyId: string, newStatus: StoryStatus) => updateStory(storyId, { status: newStatus });
  const moveStoryToEpic = (storyId: string, epicId: string | null) => updateStory(storyId, { epicId });

  const bulkUpdateSubTaskReleases = async (releaseIdCode: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      // Find the actual release ID from the release code (e.g., 'REL-1')
      const targetRelease = releasesAndMilestones.find(r => r.releaseId === releaseIdCode);
      if (!targetRelease) {
        console.error(`Release with code ${releaseIdCode} not found.`);
        return false;
      }
      const actualReleaseId = targetRelease.id;

      const batch = writeBatch(db);
      const subTasks = stories.filter(s => s.itemType === 'Sub Task');
      subTasks.forEach(task => {
        const taskRef = doc(db, 'projects', projectId, 'stories', task.id);
        batch.update(taskRef, { releaseId: actualReleaseId });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to bulk update sub-task releases.", e);
      return false;
    }
  };
  
  const bulkDeleteStories = async (storyIds: string[]): Promise<boolean> => {
    if (!db || !projectId || storyIds.length === 0) return false;
    try {
      const batch = writeBatch(db);
      storyIds.forEach(id => {
        const storyRef = doc(db, 'projects', projectId, 'stories', id);
        batch.update(storyRef, { isDeleted: true, deletedAt: Timestamp.now() });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to bulk delete stories.", e);
      return false;
    }
  };

  const bulkMoveStoriesToEpic = async (storyIds: string[], targetEpicId: string | null): Promise<boolean> => {
    if (!db || !projectId || storyIds.length === 0) return false;
    try {
      const batch = writeBatch(db);
      storyIds.forEach(id => {
        const storyRef = doc(db, 'projects', projectId, 'stories', id);
        batch.update(storyRef, { epicId: targetEpicId });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to bulk move stories.", e);
      return false;
    }
  };
  
  const bulkAssignSubTasks = async (taskIds: string[], assigneeId: string | null): Promise<boolean> => {
    if (!db || !projectId || taskIds.length === 0) return false;
    try {
      const batch = writeBatch(db);
      taskIds.forEach(id => {
        const taskRef = doc(db, 'projects', projectId, 'stories', id);
        batch.update(taskRef, { assigneeId: assigneeId });
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to bulk assign sub-tasks.", e);
      return false;
    }
  };

  
  // Epic Actions
  const addEpic = async (epic: Omit<Epic, 'id'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    if (epics.some(e => e.title.toLowerCase() === epic.title.toLowerCase())) {
        return false; // Name must be unique
    }
    try {
      await addDoc(collection(db, 'projects', projectId, 'epics'), sanitizeForFirestore(epic));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add epic.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateEpic = async (epicId: string, data: Partial<Omit<Epic, 'id'>>) => {
    if (!db || !projectId) return false;
    if (data.title && epics.some(e => e.id !== epicId && e.title.toLowerCase() === data.title!.toLowerCase())) {
        return false; // Name must be unique
    }
    try {
      await updateDoc(doc(db, 'projects', projectId, 'epics', epicId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update epic.", { id: epicId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteEpic = async (epicId: string, deleteItems = false): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'projects', projectId, 'epics', epicId));
      
      const q = query(collection(db, 'projects', projectId, 'stories'), where('epicId', '==', epicId));
      const storiesSnapshot = await getDocs(q);
      
      storiesSnapshot.forEach(storyDoc => {
        if (deleteItems) {
            batch.update(doc(db, 'projects', projectId, 'stories', storyDoc.id), { isDeleted: true, deletedAt: Timestamp.now() });
        } else {
            batch.update(doc(db, 'projects', projectId, 'stories', storyDoc.id), { epicId: null });
        }
      });

      await batch.commit();
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete epic.", { id: epicId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Sprint Actions
  const addSprint = async (sprint: { title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const payload: any = { title: sprint.title, status: sprint.status || 'Yet to Start', isCurrent: sprint.status === 'Current' };
      if (sprint.startDate) payload.startDate = Timestamp.fromDate(sprint.startDate);
      if (sprint.endDate) payload.endDate = Timestamp.fromDate(sprint.endDate);
      
      const batch = writeBatch(db);
      
      // If the new sprint is 'Current', set all others to 'Yet to Start' (or another appropriate status)
      if (payload.status === 'Current') {
        const sprintsSnapshot = await getDocs(collection(db, 'projects', projectId, 'sprints'));
        sprintsSnapshot.forEach(sprintDoc => {
          if (sprintDoc.data().status === 'Current') {
            batch.update(sprintDoc.ref, { status: 'Yet to Start', isCurrent: false });
          }
        });
      }

      const newSprintRef = doc(collection(db, 'projects', projectId, 'sprints'));
      batch.set(newSprintRef, sanitizeForFirestore(payload));

      await batch.commit();
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add sprint.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateSprint = async (sprintId: string, data: { title: string, startDate?: Date, endDate?: Date, status?: SprintStatus }): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const payload: any = { title: data.title, status: data.status, isCurrent: data.status === 'Current' };
      payload.startDate = data.startDate ? Timestamp.fromDate(data.startDate) : null;
      payload.endDate = data.endDate ? Timestamp.fromDate(data.endDate) : null;
      
      const batch = writeBatch(db);
      const sprintRef = doc(db, 'projects', projectId, 'sprints', sprintId);

      // If this sprint is becoming 'Current', ensure no others are
      if (payload.status === 'Current') {
        const sprintsSnapshot = await getDocs(collection(db, 'projects', projectId, 'sprints'));
        sprintsSnapshot.forEach(sprintDoc => {
          if (sprintDoc.id !== sprintId && sprintDoc.data().status === 'Current') {
            batch.update(sprintDoc.ref, { status: 'Completed', isCurrent: false });
          }
        });
      }
      
      batch.update(sprintRef, sanitizeForFirestore(payload));

      await batch.commit();
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update sprint.", { id: sprintId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };


  const deleteSprint = async (sprintId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'projects', projectId, 'sprints', sprintId));
        
        const q = query(collection(db, 'projects', projectId, 'stories'), where('sprintId', '==', sprintId));
        const storiesSnapshot = await getDocs(q);
        storiesSnapshot.forEach(storyDoc => {
            batch.update(doc(db, 'projects', projectId, 'stories', storyDoc.id), { sprintId: null });
        });

        await batch.commit();
        return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete sprint.", { id: sprintId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Employee Actions
  const addUserToProject = async (employee: Employee): Promise<boolean> => {
    if (!db || !projectId) return false;
    
    // Check if employee is already in the project
    if (employees.some(e => e.id === employee.id)) {
      return false;
    }
    
    try {
      // Add the employee document to the project's subcollection
      // We use setDoc with the global employee ID to keep them in sync
      await setDoc(doc(db, 'projects', projectId, 'employees', employee.id), sanitizeForFirestore(employee));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add employee to project.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const updateProjectUser = async (employeeId: string, data: Partial<Omit<Employee, 'id' | 'empId' | 'firstName' | 'lastName' | 'email' | 'phone'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const { onboardingDate, offloadingDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('onboardingDate')) payload.onboardingDate = onboardingDate ? Timestamp.fromDate(new Date(onboardingDate)) : null;
      if (data.hasOwnProperty('offloadingDate')) payload.offloadingDate = offloadingDate ? Timestamp.fromDate(new Date(offloadingDate)) : null;

      const employeeRef = doc(db, 'projects', projectId, 'employees', employeeId);
      await updateDoc(employeeRef, sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update project employee.", e);
      return false;
    }
  }

  const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'employees', employeeId));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete employee from project.", { id: employeeId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const addLeavePeriod = async (employeeId: string, leavePeriod: Omit<LeavePeriod, 'id'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const newLeavePeriod: LeavePeriod = {
        ...leavePeriod,
        id: uuidv4(),
        startDate: new Date(leavePeriod.startDate).toISOString(),
        endDate: new Date(leavePeriod.endDate).toISOString(),
      };
      
      const employeeRef = doc(db, 'projects', projectId, 'employees', employeeId);
      await updateDoc(employeeRef, {
        leavePeriods: arrayUnion(sanitizeForFirestore(newLeavePeriod))
      });
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add leave period.", e);
      return false;
    }
  };

  const deleteLeavePeriod = async (employeeId: string, leavePeriodId: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || !employee.leavePeriods) return false;

    const leavePeriodToDelete = employee.leavePeriods.find(p => p.id === leavePeriodId);
    if (!leavePeriodToDelete) return false;
    
    try {
      const employeeRef = doc(db, 'projects', projectId, 'employees', employeeId);
      await updateDoc(employeeRef, {
        leavePeriods: arrayRemove(sanitizeForFirestore(leavePeriodToDelete))
      });
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete leave period.", e);
      return false;
    }
  };

  // TestCase Actions
  const addTestCase = async (testCase: Omit<TestCase, 'id' | 'testCaseId'>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
        const testCasesSnapshot = await getDocs(collection(db, 'projects', projectId, 'testCases'));
        const newIdNumber = testCasesSnapshot.size > 0
            ? Math.max(0, ...testCasesSnapshot.docs
                .map(doc => doc.data().testCaseId)
                .filter((id: string | undefined) => id && typeof id === 'string')
                .map((id: string) => parseInt(id.replace('TC-', ''), 10) || 0)
            ) + 1
            : 1;

        const payload = { ...testCase, testCaseId: `TC-${newIdNumber}`, isDeleted: false, deletedAt: null };
        await addDoc(collection(db, 'projects', projectId, 'testCases'), sanitizeForFirestore(payload));
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to add test case.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };
  
  const autoGenerateTestCases = async (counts: Record<string, number>): Promise<boolean> => {
    if (!db || !projectId) return false;

    const getRandomItem = <T,>(arr: T[]): T | undefined => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
    const projectReleases = releasesAndMilestones.filter(r => r.itemType === 'Release');

    try {
      const batch = writeBatch(db);
      const testCasesSnapshot = await getDocs(collection(db, 'projects', projectId, 'testCases'));
      let currentIdCounter = testCasesSnapshot.size > 0 ? Math.max(0, ...testCasesSnapshot.docs.map(doc => parseInt(doc.data().testCaseId.replace('TC-', ''), 10) || 0)) + 1 : 1;

      const storiesToLink = stories.filter(s => s.itemType === 'Requirement/Story');

      for (const environmentId in counts) {
        const count = counts[environmentId];
        if (count === 0) continue;
        const environmentName = environments.find(e => e.id === environmentId)?.name || 'Unknown Env';

        for (let i = 0; i < count; i++) {
          const newTestCaseRef = doc(collection(db, 'projects', projectId, 'testCases'));
          const relatedStory = getRandomItem(storiesToLink);

          const newTestCase: Omit<TestCase, 'id'> = {
            testCaseId: `TC-${currentIdCounter}`,
            title: `Autogen TC for ${environmentName} #${i + 1}`,
            type: Math.random() > 0.3 ? 'Functional' : 'Non-functional',
            description: `Auto-generated test steps for ${environmentName}.`,
            expectedResult: 'The system should perform as expected.',
            status: 'Not Run',
            storyId: relatedStory?.id,
            sprintId: relatedStory?.sprintId,
            releaseId: getRandomItem(projectReleases)?.id,
            assigneeId: getRandomItem(employees)?.id,
            isDeleted: false,
            deletedAt: null,
          };
          
          batch.set(newTestCaseRef, sanitizeForFirestore(newTestCase));
          currentIdCounter++;
        }
      }
      
      await batch.commit();
      return true;

    } catch(e) {
      console.error("Firebase Error: Failed to auto-generate test cases.", e);
      return false;
    }
  };

  const updateTestCase = async (testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const { executionDate, closeDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('executionDate')) payload.executionDate = executionDate ? new Date(executionDate).toISOString() : null;
      if (data.hasOwnProperty('closeDate')) payload.closeDate = closeDate ? new Date(closeDate).toISOString() : null;
      if (data.hasOwnProperty('testPlanId') && data.testPlanId === undefined) {
          payload.testPlanId = null;
      }
      
      await updateDoc(doc(db, 'projects', projectId, 'testCases', testCaseId), sanitizeForFirestore(payload));
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

  const deleteTestPlan = async (id: string, deleteTestCases: boolean = false): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      // Delete the plan
      batch.delete(doc(db, 'projects', projectId, 'testPlans', id));
      
      const q = query(collection(db, 'projects', projectId, 'testCases'), where('testPlanId', '==', id));
      const testCasesSnapshot = await getDocs(q);

      testCasesSnapshot.forEach(tcDoc => {
        if (deleteTestCases) {
            batch.update(tcDoc.ref, { isDeleted: true, deletedAt: Timestamp.now() });
        } else {
            batch.update(tcDoc.ref, { testPlanId: null, executionDate: null });
        }
      });
      await batch.commit();
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete test plan.", e);
      return false;
    }
  };

  const autoGenerateBugs = async (counts: Record<string, number>): Promise<boolean> => {
    if (!db || !projectId) return false;

    const getRandomItem = <T,>(arr: T[]): T | undefined => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
    
    try {
      const batch = writeBatch(db);
      const storiesSnapshot = await getDocs(collection(db, 'projects', projectId, 'stories'));
      let currentIdCounter = storiesSnapshot.size > 0 ? Math.max(0, ...storiesSnapshot.docs.map(doc => parseInt(doc.data().storyId.replace(/^[A-Z]+-/, ''), 10) || 0)) + 1 : 1;

      const testCasesToLink = testCases;

      for (const environmentId in counts) {
        const count = counts[environmentId];
        if (count === 0) continue;
        const environmentName = environments.find(e => e.id === environmentId)?.name || 'Unknown Env';

        for (let i = 0; i < count; i++) {
          const newBugRef = doc(collection(db, 'projects', projectId, 'stories'));
          const relatedTestCase = getRandomItem(testCasesToLink);
          const now = (testDate || new Date()).toISOString();

          const newBug: Omit<Story, 'id'> = {
            storyId: `BUG-${currentIdCounter}`,
            title: `Autogen bug in ${environmentName}: Login fails on ${relatedTestCase?.testCaseId || 'general function'}`,
            description: `Auto-generated bug for ${environmentName}. Steps to reproduce: 1. Login. 2. Navigate to a page. 3. Observe error.`,
            itemType: 'Bug',
            status: 'To Do',
            statusHistory: [{ fromStatus: null, toStatus: 'To Do', date: now }],
            relatedTestCaseId: relatedTestCase?.id,
            sprintId: relatedTestCase?.sprintId,
            assigneeId: getRandomItem(employees.filter(e => e.role === 'Developer'))?.id,
            priority: getRandomItem(['High', 'Critical', 'Medium']),
            environmentId: environmentId,
            isDeleted: false,
            deletedAt: null,
          };
          
          batch.set(newBugRef, sanitizeForFirestore(newBug));
          currentIdCounter++;
        }
      }
      
      await batch.commit();
      return true;

    } catch(e) {
      console.error("Firebase Error: Failed to auto-generate bugs.", e);
      return false;
    }
  };

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
          ownerId: employees[Math.floor(Math.random() * employees.length)]?.id,
          isDeleted: false,
          deletedAt: null
        };
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
  
  const autoGenerateIssues = async (count: number): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'projects', projectId, 'issues'));
      let currentIdCounter = snapshot.size > 0 ? Math.max(0, ...snapshot.docs.map(doc => parseInt(doc.data().issueId.replace('I-', ''), 10) || 0)) + 1 : 1;
      
      const issueSamples = [
        'Development environment setup is delayed.',
        'Unexpected bug in the authentication module.',
        'Clarification needed on reporting requirements.',
        'Access to the testing server has been revoked.',
      ];
      const priorities: IssuePriority[] = ['Low', 'Medium', 'High', 'Critical'];
      const statuses: IssueStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

      for (let i = 0; i < count; i++) {
        const issueRef = doc(collection(db, 'projects', projectId, 'issues'));
        const newIssue: Omit<Issue, 'id' | 'reportedDate'> = {
          issueId: `I-${currentIdCounter++}`,
          description: issueSamples[i % issueSamples.length],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          assigneeId: employees[Math.floor(Math.random() * employees.length)]?.id,
          isDeleted: false,
          deletedAt: null
        };
        const payload = { ...newIssue, reportedDate: Timestamp.now() };
        batch.set(issueRef, payload);
      }
      await batch.commit();
      return true;
    } catch(e) {
      console.error("Firebase error generating issues", e);
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
          ownerId: employees[Math.floor(Math.random() * employees.length)]?.id,
          isDeleted: false,
          deletedAt: null
        };
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
      await updateDoc(doc(db, 'projects', projectId, 'impactedSystems', systemId), sanitizeForFirestore(data));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteImpactedSystem = async (systemId: string) => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'impactedSystems', systemId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
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
      await updateDoc(doc(db, 'projects', projectId, 'initialImpactedSystems', systemId), sanitizeForFirestore(data));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteInitialImpactedSystem = async (systemId: string) => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'initialImpactedSystems', systemId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
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
      await updateDoc(doc(db, 'projects', projectId, 'horizontals', horizontalId), sanitizeForFirestore(data));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteHorizontal = async (horizontalId: string) => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'horizontals', horizontalId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
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
      await updateDoc(doc(db, 'projects', projectId, 'initialHorizontals', horizontalId), sanitizeForFirestore(data));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
  };
  const deleteInitialHorizontal = async (horizontalId: string) => {
    if (!db || !projectId) return false;
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'initialHorizontals', horizontalId));
      return true;
    } catch (e) { console.error("Firebase Error", e); return false; }
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

  const submitWorklogForWeek = async (employeeId: string, weekStartDate: string): Promise<boolean> => {
    if (!db || !projectId) return false;
    try {
        const submissionId = `${employeeId}-${weekStartDate}`;
        const submissionRef = doc(db, 'projects', projectId, 'worklogSubmissions', submissionId);

        const payload = {
            employeeId,
            weekStartDate: Timestamp.fromDate(new Date(weekStartDate)),
            submittedAt: Timestamp.now(),
        };

        await setDoc(submissionRef, sanitizeForFirestore(payload));
        return true;
    } catch (e) {
        console.error("Firebase Error: Failed to submit worklog for week.", e);
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


  const value: ProjectContextType = {
    project,
    epics,
    stories: pathname.endsWith('/trash') ? stories : stories.filter(s => !s.isDeleted),
    sprints,
    employees,
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
    bulkMoveStoriesToEpic,
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
    autoGenerateBugs,
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
    autoGenerateIssues,
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
    addInitialImpactedSystem,
    updateInitialImpactedSystem,
    deleteInitialImpactedSystem,
    addInitialHorizontal,
    updateInitialHorizontal,
    deleteInitialHorizontal,
    confirmInitialEstimation,
    addHorizontal,
    updateHorizontal,
    deleteHorizontal,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    updateEnvironmentOrder,
    saveWorklog,
    submitWorklogForWeek,
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
