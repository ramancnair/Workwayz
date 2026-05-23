


export type TaskStatus = 'To Do' | 'In Development' | 'In QA' | 'Complete';

export type Task = {
  id: string;
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
export type WorkItemType = 'Requirement/Story' | 'Bug' | 'Task' | 'Feature Change' | 'Sub Task';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low' | 'Backburner';
export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type StatusHistoryItem = {
  fromStatus: StoryStatus | null; // null for creation
  toStatus: StoryStatus;
  date: string; // ISO String
};

export type Story = {
  id: string;
  storyId: string;
  sortOrder?: number; // Used for Gantt chart ordering within parent group
  title: string;
  description: string;
  itemType: WorkItemType;
  acceptanceCriteria?: string;
  reporterId?: string;
  assigneeId?: string;
  epicId?: string;
  sprintId?: string | null;
  status: StoryStatus;
  statusHistory?: StatusHistoryItem[];
  estimatedHours?: number;
  priority?: Priority;
  severity?: BugSeverity;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  updatedAt?: string; // ISO String for tracking completion date
  createdAt?: string; // ISO String
  closedAt?: string; // ISO String
  effortDays?: number;
  impactedSystemId?: string; // For Sub-Task
  impactedSystemIds?: string[]; // For Story/Feature Change/Bug
  releaseId?: string;
  predecessorId?: string; // ID of the requirement type which should be completed before the item can start
  isDeleted?: boolean;
  deletedAt?: string;
  parentStoryId?: string;
  relatedTestCaseId?: string; // For Bug
  attachments?: string;
  foundInTestPlanId?: string; // For Bug tracking
  relatedBugId?: string;      // Trace regression bugs across environments
  developmentStartDate?: string; // ISO String
  completionDate?: string; // ISO String
};

export type SprintStatus = 'Yet to Start' | 'Current' | 'Completed' | 'Cancelled';

export type Sprint = {
  id: string;
  title: string;
  isCurrent: boolean; // DEPRECATED: Use status instead
  status?: SprintStatus;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
};

export type TestCaseStatus = 'Not Run' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
export type TestCaseType = 'Functional' | 'Non-functional';

export type TestPlan = {
  id: string;
  testPlanId: string;
  name: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  planType: 'Sprint' | 'Release';
  sprintId?: string;
  releaseId?: string;
  environmentId?: string;
  testCaseIds?: string[]; // IDs of test cases included in this plan
};

export type TestExecution = {
  testPlanId: string;
  assigneeId?: string;
  status: TestCaseStatus;
  executionDate?: string; // ISO string for the date part
  closeDate?: string; // ISO string for the date part
  statusHistory?: StatusHistoryItem[];
};

export type TestCase = {
  id: string;
  testCaseId: string;
  title: string;
  type: TestCaseType;
  description: string;
  expectedResult: string;
  storyId?: string;
  releaseId?: string;
  sprintId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  executions?: TestExecution[];
};

export type UserRole = 'Developer' | 'Tester' | 'Architect' | 'BA' | 'PM' | 'Program Director';

export type AccessLevel = 'Administrator' | 'Senior Management' | 'Project Manager' | 'Lead' | 'Team Member' | 'PMO';

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
  accessLevel?: AccessLevel;
  billedRate?: number;
  costRate?: number;
  costAmount?: number;
  costCurrency?: string;
  availability?: number;
  leavePeriods?: LeavePeriod[];
  isDeleted?: boolean;
  deletedAt?: string; // ISO String
  capabilities?: string[];
  isBcpSupport?: boolean;
};

export type Employee = User;

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
  isDeleted?: boolean;
  deletedAt?: string;
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
  isDeleted?: boolean;
  deletedAt?: string;
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
  isDeleted?: boolean;
  deletedAt?: string;
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
  isDeleted?: boolean;
  deletedAt?: string;
};

export type KanbanColumn = {
  id: string;
  name: string;
  order: number;
  isDefault: boolean;
  isDoneColumn: boolean;
};

export type HolidayType = 'National' | 'Regional' | 'Optional';

export type Holiday = {
  id: string;
  date: string; // ISO String
  description: string;
  type?: HolidayType;
};

export type ProjectSettings = {
  id: 'main';
  weeklyOffDays?: number[]; // 0 for Sunday, 6 for Saturday
  sprintDurationInWeeks?: number;
  sprintStartDay?: number; // 0 for Sunday, 1 for Monday etc.
  overrideGlobalHolidays?: boolean;
  manMonthToDays?: number;
  manDayToHours?: number;
  storyPointToHours?: number;
};

export type ImpactedSystemCategory = 'Technology' | 'Function';

export type ImpactedSystem = {
  id: string;
  name: string;
  description: string;
  category: ImpactedSystemCategory;
  explanation?: string;
  estimate?: number; // in man-days
  dailyBillingRate?: number;
};

export type ReleaseItemType = 'Release' | 'Stage' | 'Milestone';

export type Release = {
  id: string;
  releaseId: string;
  sortOrder?: number; // Used for Gantt chart ordering
  name: string;
  description: string;
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  milestoneDate?: string; // ISO String
  itemType: ReleaseItemType;
  parentReleaseId?: string;
  isCompleted?: boolean;
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

export type ProjectMethodology = 'Agile' | 'SDLC' | 'Hybrid';
export type PricingModel = 'Fixed Bid' | 'T&M';
export type ProjectStatus = 'Not Started' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled' | 'Initial Estimation';
export type RagStatus = 'Red' | 'Amber' | 'Green';

export type ProjectStatusHistoryItem = {
  date: string; // ISO String
  overallStatus?: RagStatus;
  scopeStatus?: RagStatus;
  costStatus?: RagStatus;
  timeStatus?: RagStatus;
  statusComments?: string;
};

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
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  overallStatus?: RagStatus;
  scopeStatus?: RagStatus;
  costStatus?: RagStatus;
  timeStatus?: RagStatus;
  statusComments?: string;
  statusHistory?: ProjectStatusHistoryItem[];
  isArchived?: boolean;
  archivedAt?: string; // ISO String
  projectValue?: number;
  monthlyBilledValue?: number;
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
  dailyBillingRate?: number;
};

export type Environment = {
  id: string;
  name: string;
  order: number;
  url?: string;
  renewalDate?: string; // ISO String
};

export type ProjectDocument = {
  id: string;
  name: string;
  location: string;
  createdAt: string; // ISO String
};

export type PaymentMilestoneStatus = 'TBD' | 'In Progress' | 'Milestone completed' | 'Invoice raised' | 'Payment Completed';

export type PaymentMilestone = {
  id: string;
  milestoneId: string;
  name: string;
  billingPercentage: number;
  amount: number;
  status: PaymentMilestoneStatus;
  attachments?: string;
  statusHistory?: {
    status: PaymentMilestoneStatus;
    date: string;
  }[];
};

export type CodeRepository = {
  id: string;
  name: string;
  url: string;
  expiryDate?: string; // ISO String
};

export type BugCriticality = 'Low' | 'Medium' | 'High' | 'Critical';

export type FixedCost = {
  id: string;
  name: string;
  cost: number;
  type?: 'One time' | 'Monthly';
};

export type ArchiveSettings = {
  id?: string;
  autoArchiveCompletedProjects: boolean;
  autoArchiveAfterMonths: string;
  autoDeleteArchivedProjects: boolean;
  autoDeleteAfterMonths: string;
  customDeleteMonths?: number;
};
