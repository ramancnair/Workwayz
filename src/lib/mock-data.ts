
import type { Story, Task, Epic, Sprint, Employee, TestCase } from '@/types';

export const employees: Employee[] = [
  {
    id: 'dev1',
    empId: 'D001',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@internal.com',
    phone: '555-0111',
    role: 'Developer',
    experience: 5,
    onboardingDate: new Date('2023-02-01').toISOString(),
    onshoreOrOffshore: 'Onshore',
    billedRate: 100,
    availability: 100,
    avatar: 'https://placehold.co/40x40.png'
  },
  {
    id: 'dev2',
    empId: 'D002',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob@internal.com',
    phone: '555-0112',
    role: 'Developer',
    experience: 3,
    onboardingDate: new Date('2023-05-20').toISOString(),
    onshoreOrOffshore: 'Offshore',
    billedRate: 80,
    availability: 100,
    avatar: 'https://placehold.co/40x40.png'
  },
  {
    id: 'dev3',
    empId: 'D003',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie@internal.com',
    phone: '555-0113',
    role: 'Developer',
    experience: 7,
    onboardingDate: new Date('2022-11-10').toISOString(),
    onshoreOrOffshore: 'Onshore',
    billedRate: 115,
    availability: 75,
    avatar: 'https://placehold.co/40x40.png'
  },
  {
    id: 'tester1',
    empId: 'T001',
    firstName: 'Diana',
    lastName: 'Prince',
    email: 'diana@internal.com',
    phone: '555-0211',
    role: 'Tester',
    experience: 4,
    onboardingDate: new Date('2023-03-15').toISOString(),
    onshoreOrOffshore: 'Offshore',
    billedRate: 60,
    availability: 100,
    avatar: 'https://placehold.co/40x40.png'
  },
  {
    id: 'tester2',
    empId: 'T002',
    firstName: 'Eve',
    lastName: 'Adams',
    email: 'eve@internal.com',
    phone: '555-0212',
    role: 'Tester',
    experience: 6,
    onboardingDate: new Date('2022-09-01').toISOString(),
    onshoreOrOffshore: 'Onshore',
    billedRate: 75,
    availability: 100,
    avatar: 'https://placehold.co/40x40.png'
  },
];

export const epics: Epic[] = [
  { id: 'epic1', title: 'User Management', description: 'Features related to user accounts and authentication.' },
  { id: 'epic2', title: 'Reporting & Analytics', description: 'Features related to data visualization and reporting.' },
];

export const sprints: Sprint[] = [
  { id: 'sprint1', title: 'Sprint 1', isCurrent: true, startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString(), endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString() },
];

export const stories: Story[] = [
  { id: 'story1', storyId: 'ST-1', title: 'User Authentication', description: 'Implement user sign-up and login functionality.', itemType: 'Story', epicId: 'epic1', sprintId: 'sprint1', status: 'In Progress', acceptanceCriteria: 'A user can successfully sign up and log in. Invalid credentials show an error.', assigneeId: 'dev1' },
  { id: 'story2', storyId: 'ST-2', title: 'Project Dashboard', description: 'Create a dashboard to display project statistics.', itemType: 'Story', epicId: 'epic2', sprintId: 'sprint1', status: 'In Progress', acceptanceCriteria: 'The dashboard displays total tasks, completed tasks, and completion rate.', assigneeId: 'dev2' },
  { id: 'story3', storyId: 'ST-3', title: 'Kanban Board', description: 'Develop a Kanban board for task management.', itemType: 'Story', sprintId: 'sprint1', status: 'To Do', acceptanceCriteria: 'Users can drag and drop stories between columns.' },
  { id: 'story4', storyId: 'ST-4', title: 'Password Reset', description: 'Allow users to reset their password via email.', itemType: 'Story', epicId: 'epic1', sprintId: 'sprint1', status: 'To Do', assigneeId: 'dev3' },
  { id: 'story5', storyId: 'ST-5', title: 'Export Dashboard as PDF', description: 'Allow users to export dashboard as PDF.', itemType: 'Story', epicId: 'epic2', sprintId: null, status: 'Done', acceptanceCriteria: 'The exported PDF matches the dashboard view.', assigneeId: 'dev2' },
];

export const testCases: TestCase[] = [
    { id: 'tc1', testCaseId: 'TC-1', title: 'Verify successful login', type: 'Functional', description: 'Enter valid credentials and click login.', expectedResult: 'User is redirected to dashboard.', status: 'Passed', assigneeId: 'tester1', storyId: 'story1', releaseId: 'rel1' },
    { id: 'tc2', testCaseId: 'TC-2', title: 'Verify failed login', type: 'Functional', description: 'Enter invalid credentials and click login.', expectedResult: 'Error message is displayed.', status: 'Passed', assigneeId: 'tester1', storyId: 'story1', releaseId: 'rel1' },
    { id: 'tc3', testCaseId: 'TC-3', title: 'Dashboard loading performance', type: 'Non-functional', description: 'Measure time to load dashboard with 100+ tasks.', expectedResult: 'Dashboard loads in under 2 seconds.', status: 'Not Run', assigneeId: 'tester2', storyId: 'story2', releaseId: 'rel1' },
];


export const tasks: Task[] = [
  {
    id: 'task1',
    title: 'Design login UI',
    description: 'Create wireframes and mockups for the login page.',
    status: 'Complete',
    assigneeId: 'dev1',
    storyId: 'story1',
    plannedStartDate: new Date('2024-07-01'),
    plannedEndDate: new Date('2024-07-03'),
    actualStartDate: new Date('2024-07-01'),
    actualEndDate: new Date('2024-07-03'),
  },
  {
    id: 'task2',
    title: 'Develop login API',
    description: 'Build the backend endpoint for user authentication.',
    status: 'Complete',
    assigneeId: 'dev2',
    storyId: 'story1',
    plannedStartDate: new Date('2024-07-04'),
    plannedEndDate: new Date('2024-07-08'),
    actualStartDate: new Date('2024-07-05'),
    actualEndDate: new Date('2024-07-09'),
  },
  {
    id: 'task3',
    title: 'Integrate login UI and API',
    description: 'Connect the frontend form with the authentication API.',
    status: 'In QA',
    assigneeId: 'dev1',
    storyId: 'story1',
    plannedStartDate: new Date('2024-07-09'),
    plannedEndDate: new Date('2024-07-11'),
    actualStartDate: new Date('2024-07-10'),
  },
  {
    id: 'task4',
    title: 'Stats component for dashboard',
    description: 'Create a reusable component for displaying key stats.',
    status: 'In Development',
    assigneeId: 'dev3',
    storyId: 'story2',
    plannedStartDate: new Date('2024-07-10'),
    plannedEndDate: new Date('2024-07-15'),
    actualStartDate: new Date('2024-07-11'),
  },
  {
    id: 'task5',
    title: 'Chart for task status',
    description: 'Implement a pie chart showing tasks by status.',
    status: 'In Development',
    assigneeId: 'dev2',
    storyId: 'story2',
    plannedStartDate: new Date('2024-07-12'),
    plannedEndDate: new Date('2024-07-17'),
    actualStartDate: new Date('2024-07-12'),
  },
  {
    id: 'task6',
    title: 'Create Kanban columns',
    description: 'Set up the UI for Kanban board swim lanes.',
    status: 'To Do',
    assigneeId: 'dev1',
    storyId: 'story3',
    plannedStartDate: new Date(),
    plannedEndDate: new Date(new Date().setDate(new Date().getDate() + 3)),
  },
  {
    id: 'task7',
    title: 'Implement Task Cards',
    description: 'Design and build the component for task cards.',
    status: 'To Do',
    assigneeId: 'dev3',
    storyId: 'story3',
    plannedStartDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    plannedEndDate: new Date(new Date().setDate(new Date().getDate() + 5)),
  },
];
