
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

export type BugStatus = 'Open' | 'In Progress' | 'Fixed' | 'Closed';
export type BugSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type Bug = {
  id: string;
  title: string;
  description: string;
  status: BugStatus;
  severity: BugSeverity;
  testCaseId: string;
};

export type TestCaseStatus = 'Not Run' | 'Pass' | 'Fail';

export type TestCase = {
  id: string;
  title: string;
  description: string;
  status: TestCaseStatus;
  assigneeId: string;
  storyId: string;
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
