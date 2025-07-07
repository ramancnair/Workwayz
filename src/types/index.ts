export type User = {
  id: string;
  name: string;
  avatar: string;
};

export type TaskStatus = 'To Do' | 'In Development' | 'In QA' | 'Complete';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: User;
  storyId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
};

export type Story = {
  id: string;
  title: string;
  description: string;
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
  assignee: User;
  storyId: string;
};
