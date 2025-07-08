
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
  description: string;
};

export type StoryStatus = 'To Do' | 'In Progress' | 'Done';

export type Story = {
  id: string;
  storyId: string;
  title: string;
  description: string;
  acceptanceCriteria?: string;
  assigneeId?: string;
  epicId?: string;
  sprintId?: string | null;
  status: StoryStatus;
};

export type Sprint = {
  id: string;
  title: string;
  isCurrent: boolean;
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
};

export type OnshoreOffshore = 'Onshore' | 'Offshore';

export type Employee = {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  clientEmpId?: string;
  clientEmail?: string;
  role?: string;
  experience?: number;
  onboardingDate?: string; // ISO String
  offloadingDate?: string; // ISO String
  onshoreOrOffshore?: OnshoreOffshore;
  billedRate?: number;
  availability?: number;
};
