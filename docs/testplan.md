# ProjectFlow End-to-End Test Plan

This document outlines the test plan, test cases, execution status, and identified bugs for ProjectFlow.

## Test Plan Overview
The goal of this test plan is to verify the core functionalities of ProjectFlow as described in the product blueprint:
1. **Authentication**: Verify admin login.
2. **Project / Portfolio Management**: Create and manage portfolios and projects.
3. **Kanban Board & Task Management**: Create user stories and tasks, assign them, and transition them across lanes.
4. **Test Case Management**: Add test cases, assign to testers, and link to user stories.
5. **Bug Tracking**: Log and track bugs under test cases.
6. **Dashboards**: Verify development and testing dashboards populate correctly.
7. **AI Assistant**: Verify AI suggestions for tasks or test cases.

---

## Test Cases & Execution Status

| Test Case ID | Feature / Area | Test Case Description | Expected Result | Status | Notes |
|--------------|----------------|-----------------------|-----------------|--------|-------|
| **TC-01** | Authentication | Log in using the admin credentials (`test.admin@email.com` / `P@ssw0rd`). | Redirected to dashboard/home, user session established. | ✅ **Pass** | Redirected to `/my-projects`. "Test Admin" shown in sidebar. |
| **TC-02** | Portfolio Setup | Create a new Portfolio in Portfolio Settings. | Portfolio created and appears in the list. | **Not Run** | |
| **TC-03** | Project Setup | Create a new Project under the created Portfolio. | Project created and details are editable. | **Not Run** | |
| **TC-04** | Kanban Board | Create a User Story on the Kanban Board. | User Story appears in the "To Do" column. | **Not Run** | |
| **TC-05** | Kanban Board | Move a User Story from "To Do" to "In Development". | Story successfully transitions with smooth animations. | **Not Run** | |
| **TC-06** | Task Management | Add a Development Task under a User Story, assign to a user. | Task added, metadata (estimated time, assignee) updated. | **Not Run** | |
| **TC-07** | Test Case Management | Create a Test Case and link it to a User Story. | Test Case successfully created and linked. | **Not Run** | |
| **TC-08** | Bug Tracking | Fail a test case and log a Bug under it. | Bug created under the test case and appears in Bug Tracking. | **Not Run** | |
| **TC-09** | Dashboards | Verify PMO/Development Dashboard shows correct progress. | Charts and progress metrics reflect the created stories/tasks. | **Not Run** | |
| **TC-10** | Dashboards | Verify Testing Dashboard shows correct test/bug counts. | Testing dashboard displays correct test coverage and defect counts. | **Not Run** | |
| **TC-11** | AI Assistant | Request AI suggestions for improving a task or test case. | Suggestion list generated and displayed on screen. | **Not Run** | |

---

## Bug List

| Bug ID | Description | Severity | Status | Steps to Reproduce |
|--------|-------------|----------|--------|--------------------|
| - | No bugs found yet. | - | - | - |
