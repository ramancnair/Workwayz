

export type TaskStatus = 'To Do' | 'In Development' | 'In QA' | 'Complete';

export type Task = {
  id:string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  storyId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
};

export type Epic = {
  id: string;
  title: string;
  description?: string;
};

export type StoryStatus = string;
export type WorkItemType = 'Story' | 'Bug' | 'Task' | 'Change' | 'Improvement';
export type BugCriticality = 'Low' | 'Medium' | 'High' | 'Critical';

export type Story = {
  id: string;
  storyId: string;
  title: string;
  description: string;
  itemType: WorkItemType;
  acceptanceCriteria?: string;
  assigneeId?: string;
  epicId?: string;
  sprintId?: string | null;
  status: StoryStatus;
  estimatedHours?: number;
  criticality?: BugCriticality;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  effortDays?: number;
  impactedSystemId?: string;
  releaseId?: string;
};

export type Sprint = {
  id: string;
  title: string;
  isCurrent: boolean;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
};

export type TestCaseStatus = 'Not Run' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
export type TestCaseType = 'Functional' | 'Non-functional';

export type TestCase = {
  id: string;
  testCaseId: string;
  title: string;
  type: TestCaseType;
  description: string;
  expectedResult: string;
  status: TestCaseStatus;
  assigneeId?: string;
  storyId?: string;
  releaseId?: string;
  sprintId?: string;
};

export type OnshoreOffshore = 'Onshore' | 'Offshore';

export type UserRole = 'Developer' | 'Tester' | 'Architect' | 'BA' | 'PM';

export type AccessLevel = 'Admin' | 'Portfolio Manager' | 'Project Manager' | 'Business Analyst' | 'Dev Lead' | 'Developer' | 'Test Lead' | 'Tester' | 'PMO' | 'Finance';

export type LeavePeriod = {
  id: string; // uuid on the client
  startDate: string; // ISO String
  endDate: string; // ISO String
};

export type User = {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  clientEmpId?: string;
  clientEmail?: string;
  role?: UserRole;
  experience?: number;
  onboardingDate?: string; // ISO String - Project Specific
  offloadingDate?: string; // ISO String - Project Specific
  employmentStartDate?: string; // ISO String - Global
  employmentEndDate?: string; // ISO String - Global
  domainExpertise?: string;
  accessLevel?: AccessLevel;
  onshoreOrOffshore?: OnshoreOffshore;
  billedRate?: number;
  availability?: number;
  leavePeriods?: LeavePeriod[];
  isDeleted?: boolean;
  deletedAt?: string; // ISO String
};

export type RiskSeverity = 1 | 2 | 3;
export type RiskProbability = 1 | 2 | 3;

export type Risk = {
  id: string;
  riskId: string;
  description: string;
  severity: RiskSeverity;
  probability: RiskProbability;
  mitigationPlan: string;
  residualRisk: string;
  contingencyPlan: string;
};

export type AssumptionStatus = 'Active' | 'Validated' | 'Invalidated';
export type AssumptionCategory = 'Technical' | 'Resource' | 'Business' | 'External';

export type Assumption = {
  id: string;
  assumptionId: string;
  description: string;
  category: AssumptionCategory;
  status: AssumptionStatus;
  validationDate?: string; // ISO String
  ownerId?: string;
};

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type Issue = {
  id: string;
  issueId: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  reportedDate: string; // ISO String
  resolvedDate?: string; // ISO String
  assigneeId?: string;
};

export type DependencyStatus = 'On Track' | 'At Risk' | 'Blocked';
export type DependencyType = 'Internal' | 'External';

export type Dependency = {
  id: string;
  dependencyId: string;
  description: string;
  type: DependencyType;
  dependencyOn: string;
  expectedByDate: string; // ISO String
  status: DependencyStatus;
  ownerId?: string;
};

export type KanbanColumn = {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  isDoneColumn: boolean;
};

export type Holiday = {
    id: string;
    date: string; // ISO String
    description: string;
};

export type ProjectSettings = {
    id: 'main';
    weeklyOffDays?: number[]; // 0 for Sunday, 6 for Saturday
    sprintDurationInWeeks?: number;
    sprintStartDay?: number; // 0 for Sunday, 1 for Monday etc.
    overrideGlobalHolidays?: boolean;
};

export type ImpactedSystemCategory = 'Technology' | 'Function';

export type ImpactedSystem = {
  id: string;
  name: string;
  description: string;
  category: ImpactedSystemCategory;
  explanation?: string;
  estimate?: number; // in man-days
};

export type ReleaseItemType = 'Release' | 'Stage' | 'Milestone';

export type Release = {
  id: string;
  releaseId: string;
  name: string;
  description: string;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  milestoneDate?: string; // ISO String
  itemType: ReleaseItemType;
  parentReleaseId?: string;
};

export type WorklogItem = {
  id: string; // Client-side UUID
  itemId: string; // Story ID, or special values like 'meeting'
  itemType: 'WorkItem' | 'Meeting' | 'Other';
  hours: number;
  description?: string; // Only for 'Other'
};

export type Worklog = {
  id: string; // employeeId-date (e.g., 'emp1-2024-07-25')
  employeeId: string;
  date: string; // ISO String
  items: Omit<WorklogItem, 'id'>[];
  totalHours: number;
};

export type WorklogSubmission = {
  id: string; // employeeId-weekStartDate (e.g., 'emp1-2024-07-21')
  employeeId: string;
  weekStartDate: string; // ISO string
  submittedAt: string; // ISO string
};

export type Portfolio = {
  id: string;
  name: string;
  description?: string;
  isDeleted?: boolean;
  deletedAt?: string; // ISO String
};

export type ProjectMethodology = 'Agile' | 'SDLC';
export type PricingModel = 'Fixed Price' | 'T&M' | 'Fixed Capacity';
export type ProjectStatus = 'Not Started' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled' | 'Initial Estimation';

export type Project = {
  id: string;
  name: string;
  description?: string;
  portfolioId: string;
  isDeleted?: boolean;
  deletedAt?: string; // ISO String
  summary?: string;
  projectManagerId?: string;
  methodology?: ProjectMethodology;
  pricingModel?: PricingModel;
  status?: ProjectStatus;
};

export type AccessControlSetting = {
  id: AccessLevel; // The access level itself is the ID
  pageAccess: Record<string, boolean>; // Key is page name, value is true/false
};

export type TrashedItem = {
  id: string;
  name: string;
  type: 'Portfolio' | 'Project' | 'User';
  deletedAt: string;
};

export type Horizontal = {
  id: string;
  name: string;
  weightage: number; // percentage
  isEnabled: boolean;
};

    
