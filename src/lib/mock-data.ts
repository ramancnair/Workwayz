import type { User, Story, Task, TestCase, Bug } from '@/types';

export const developers: User[] = [
  { id: 'dev1', name: 'Alice', avatar: '/avatars/01.png' },
  { id: 'dev2', name: 'Bob', avatar: '/avatars/02.png' },
  { id: 'dev3', name: 'Charlie', avatar: '/avatars/03.png' },
];

export const testers: User[] = [
  { id: 'tester1', name: 'Diana', avatar: '/avatars/04.png' },
  { id: 'tester2', name: 'Eve', avatar: '/avatars/05.png' },
];

export const stories: Story[] = [
  { id: 'story1', title: 'User Authentication', description: 'Implement user sign-up and login functionality.' },
  { id: 'story2', title: 'Project Dashboard', description: 'Create a dashboard to display project statistics.' },
  { id: 'story3', title: 'Kanban Board', description: 'Develop a Kanban board for task management.' },
];

export const tasks: Task[] = [
  {
    id: 'task1',
    title: 'Design login UI',
    description: 'Create wireframes and mockups for the login page.',
    status: 'Complete',
    assignee: developers[0],
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
    assignee: developers[1],
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
    assignee: developers[0],
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
    assignee: developers[2],
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
    assignee: developers[1],
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
    assignee: developers[0],
    storyId: 'story3',
    plannedStartDate: new Date(),
    plannedEndDate: new Date(new Date().setDate(new Date().getDate() + 3)),
  },
  {
    id: 'task7',
    title: 'Implement Task Cards',
    description: 'Design and build the component for task cards.',
    status: 'To Do',
    assignee: developers[2],
    storyId: 'story3',
    plannedStartDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    plannedEndDate: new Date(new Date().setDate(new Date().getDate() + 5)),
  },
];

export const testCases: TestCase[] = [
  {
    id: 'tc1',
    title: 'Valid user login',
    description: 'Test login with correct credentials.',
    status: 'Pass',
    assignee: testers[0],
    storyId: 'story1',
  },
  {
    id: 'tc2',
    title: 'Invalid user login',
    description: 'Test login with incorrect password.',
    status: 'Fail',
    assignee: testers[0],
    storyId: 'story1',
  },
  {
    id: 'tc3',
    title: 'Dashboard stats display',
    description: 'Verify that all statistics on the dashboard are displayed correctly.',
    status: 'Not Run',
    assignee: testers[1],
    storyId: 'story2',
  },
  {
    id: 'tc4',
    title: 'Non-existent user login',
    description: 'Test login with a username that does not exist.',
    status: 'Pass',
    assignee: testers[0],
    storyId: 'story1',
  },
];

export const bugs: Bug[] = [
  {
    id: 'bug1',
    title: 'Error message not shown for wrong password',
    description: 'When a user enters a wrong password, no error message is displayed.',
    status: 'Open',
    severity: 'High',
    testCaseId: 'tc2',
  },
  {
    id: 'bug2',
    title: 'Login button remains disabled',
    description: 'The login button remains disabled after entering credentials.',
    status: 'In Progress',
    severity: 'Medium',
    testCaseId: 'tc2',
  },
];
