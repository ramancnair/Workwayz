Feature: Project Lifecycle Execution and Operations
  As a Project Manager, Tech Lead, Developer, QA Engineer, or PMO Auditor
  I want to manage execution details, backlog items, testing cycles, RAID governance, and financial invoicing
  So that software delivery remains transparent, high quality, and contractually compliant

  Background:
    Given an active project "E-Commerce Mobile Portal" exists in the system

  Scenario: Manage Project Details and Interactive Health Sliders
    Given the PM opens the "Project Details & Status" page
    When the PM adjusts the Project Health Grid sliders:
      | Axis  | Indicator State |
      | Scope | Green           |
      | Cost  | Yellow          |
      | Time  | Green           |
    And saves changes
    Then the overall operational color indicator for "E-Commerce Mobile Portal" should be updated accordingly

  Scenario: Manage Active Milestones in Project Details
    Given the PM is on the "Project Details & Status" page for "E-Commerce Mobile Portal"
    When the PM adds a milestone "MVP Launch" with target date "2026-11-01"
    And adds a second milestone "Full Product Launch" with target date "2027-01-15"
    Then both milestones should appear in the Active Milestones section of the project details

  Scenario: PM Dashboard Execution Metrics Oversight
    Given the Delivery Director views the "PM Dashboard"
    Then the radial charts should display percentage completion against release targets
    And the time analytics should calculate planned vs logged worklog hours
    And the workload quality vector should flag high bug-to-delivery hour ratios
    And the swimlane residence chart should display average residence time across states:
      | Swimlane State |
      | To Do          |
      | In Progress    |
      | In QA          |
      | Done           |
    And the "Time by Resource" section should display average unit execution timelines mapped across individual team members

  Scenario: Epic Tracking Arrays in PM Dashboard
    Given the Delivery Director views the "PM Dashboard" for "E-Commerce Mobile Portal"
    Then the Epic Tracking section should display high-level component epics as linear progress arrays
    And each epic row should show its name and percentage completion

  Scenario: Configure Infrastructure Environments Matrix
    Given the Lead Architect opens "Specifications & Environments"
    When the user adds infrastructure environment layers:
      | Layer Name                   | Tier Code |
      | System Integration Testing   | SIT       |
      | User Acceptance Testing      | UAT       |
      | Production                   | PROD      |
    Then the pipeline environment matrix should reflect SIT, UAT, and PROD layers

  Scenario: Environment Ordering and Deletion in Specifications
    Given the Lead Architect is on the "Specifications & Environments" page for "E-Commerce Mobile Portal"
    When the Lead Architect reorders the environment layers placing "UAT" above "SIT"
    Then the environment list should reflect the new order
    When the Lead Architect deletes the "UAT" environment layer
    Then the "UAT" layer should be removed from the pipeline environment matrix

  Scenario: Resource Onboarding and Capability Integrity Check
    Given a Tech Lead assigns a user to "E-Commerce Mobile Portal"
    When the user capability does not match the project "Impacted Systems"
    Then the system should trigger a capability mapping error
    And Unless "Full-Stack Development" is configured as a generic target capability

  Scenario: Capacity Planning Ledger Sprint, Month and Week Views
    Given a PM opens "Project Resources & Capacity Planning" for "E-Commerce Mobile Portal"
    Then the capacity planning ledger should be visible with impacted software systems breakdown
    When the PM switches the view toggle to "Sprint"
    Then capacity should be displayed for the current sprint window
    When the PM switches the view toggle to "Month"
    Then capacity should be displayed for the current calendar month
    When the PM switches the view toggle to "Week"
    Then capacity should be displayed for the current week
    And the user should be able to toggle between "Days" and "Hours" measurement units

  Scenario: Daily Worklog Hour Logging
    Given a Developer "Alice Smith" opens the "Worklog" interface
    When "Alice Smith" selects date "2026-08-10"
    And logs 6 hours against Story "ST-101: User Login UI"
    And logs 2 hours against "Other" with mandatory text "Team Sync and Code Review"
    And submits the worklog entry
    Then 8 total worklog hours should be recorded for "Alice Smith" on "2026-08-10"

  Scenario: Resource Workload Calendar Health Monitor
    Given a PM opens the "Resource Workload" view for "E-Commerce Mobile Portal"
    Then the calendar grid should render for all staffed project engineers
    And healthy capacity blocks should appear in green for resources within normal allocation
    And over-allocated resources should be visually flagged with a warning indicator

  Scenario: Gantt Release Timeline and Milestone Freezes
    Given the PM views "Releases, Stages & Milestones"
    Then the Gantt chart timeline should render macro phases: Design, Development, Testing
    And display rigid milestone markers for "Design Freeze" and "Code Freeze"

  Scenario: Release Burnup Chart on Development Dashboard
    Given the PM opens the "Development Dashboard" for "E-Commerce Mobile Portal"
    Then the Sprint Burndown chart should display active sprint velocity
    And the cumulative Release Burnup chart should display overall release progress
    And both charts should update as worklogs and story completions are recorded

  Scenario: Story Point Monetization Bridge and Backlog Elaboration
    Given a Product Owner creates User Story "ST-202: Payment Gateway Integration"
    And the Tech Lead assigns 8 Story Points to "ST-202"
    When the PM executes the "Story Point Monetization Bridge" conversion
    Then the system should calculate the equivalent contract billing hours based on historical point velocity

  Scenario: Product Backlog Item Type Variety
    Given a BA opens the "Product Backlog" for "E-Commerce Mobile Portal"
    When the BA creates backlog items of each supported type:
      | Item Type        |
      | Requirement/Story|
      | Feature Change   |
      | Task             |
      | Bug              |
    Then all four item types should appear in the product backlog list with correct type labels

  Scenario: Full User Story Elaboration Flow
    Given BA "Jane Doe" creates User Story "ST-301: User Profile Management" in the backlog
    When Tech Lead "Bob" reviews the story and maps impacted components:
      | Component          |
      | Profile Service API|
      | Auth Gateway       |
    Then the story should display the impacted component dependency list
    When Developer "Alice Smith" adds sub-tasks under "ST-301":
      | Sub-task Title                  | Estimate (Hours) |
      | Implement profile update API    | 8                |
      | Write unit tests for API        | 4                |
      | Integrate with Auth Gateway     | 6                |
    Then the cumulative sub-task effort should form the size metric of "ST-301"
    And the story total should show 18 hours

  Scenario: Bulk Sub-Task Matrix High Velocity Scheduling
    Given a Tech Lead opens the "Bulk Sub-Tasks Matrix" for "E-Commerce Mobile Portal"
    Then a tabular workspace should display all atomic sub-tasks across the project
    When the Tech Lead selects multiple sub-tasks and assigns them to "Alice Smith"
    Then all selected sub-tasks should be routed to "Alice Smith" in bulk
    When the Tech Lead reschedules a batch of sub-tasks to "Sprint 4"
    Then all selected sub-tasks should show "Sprint 4" as their target sprint

  Scenario: Grooming Board Capacity Validation and Bulk Sub-Task Matrix
    Given the Tech Lead opens the "Grooming Board"
    When dragging User Story "ST-202" into "Sprint 3" cycle column
    Then the system checks real-time sprint capacity boundaries in the top header
    And if sub-task conditions are satisfied, marks the item with a green validation tick

  Scenario: Kanban Board Story vs Sub-Task Filtering and Engineer Sorting
    Given the Kanban board is open for "E-Commerce Mobile Portal"
    When the user applies the "User Stories" filter
    Then the Kanban should show only high-level user story cards
    When the user switches to the "Sub-Tasks" filter
    Then the Kanban should show only atomic sub-task cards
    When the user sorts the Kanban by engineer "Alice Smith"
    Then only tasks assigned to "Alice Smith" should be displayed on the board

  Scenario: Test Backlog Plan Execution and Coverage Score
    Given a QA Lead opens the "Testing Dashboard"
    Then the dashboard should calculate the "Story Test Coverage Metric %"
    When compiling an "SIT Execution Plan", the QA Lead selects test cases from the backlog
    And assigns execution dates
    Then the test plan should be saved and active for SIT execution

  Scenario: Testing Dashboard Charts - Bugs by Status, Velocity Trend and Leakage
    Given a QA Lead opens the "Testing Dashboard" for "E-Commerce Mobile Portal"
    Then the dashboard should display a pie chart for "Bugs by Status"
    And the dashboard should display a pie chart for "Open Bugs by Severity" with segments:
      | Severity |
      | Low      |
      | Medium   |
      | High     |
      | Critical |
    And the "Daily Testing Velocity Trend" chart should show cumulative test runs, closures, and bug identification lines
    And the "Test Leakage Bar Charts" should visualize defect distribution across SIT, UAT, and Prod by severity

  Scenario: Log New Defect and Embed Story Context
    Given a QA Tester opens "Defect Tracker"
    When the tester clicks "Add New Defect" and fills:
      | Field                 | Value                                     |
      | Title                 | Token Timeout on Checkout                 |
      | Severity              | High                                      |
      | Target Sprint         | Sprint 3                                  |
      | Related Story ID      | ST-202                                    |
      | Found In Test Plan    | SIT Execution Plan 1                      |
    And submits the defect form
    Then the defect card should automatically embed into developer story "ST-202" context
    And appear in the "In Triage" column of the Defect Kanban Board

  Scenario: Defect Kanban Column State Transitions
    Given a defect "Token Timeout on Checkout" exists in the Defect Kanban board
    When the QA Lead drags the defect from "In Triage" to "Defect Backlog"
    Then the defect should appear in the "Defect Backlog" column
    When a developer picks it up and moves it to "In Progress"
    Then the defect should appear in the "In Progress" column
    When the developer resolves it and moves it to "Retest"
    Then the defect should appear in the "Retest" column
    When the QA verifies the fix and moves it to "Closed"
    Then the defect should appear in the "Closed" column

  Scenario: RAID Log Governance and AI Generator Modules
    Given the Risk Manager accesses the "RAID Dashboard"
    When the Risk Manager clicks "AI Risk Gen"
    Then the AI engine should analyze project parameters and suggest common domain risks
    When the user clicks "AI Gen Assumptions" and "AI Gen Dependencies"
    Then project assumptions and third-party dependencies should be suggested and logged

  Scenario: RAID Risk Severity and Probability Computation
    Given the Risk Manager is on the "Risks Ledger" in the RAID dashboard
    When the Risk Manager logs a new risk with Severity "High" and Probability "Medium"
    Then the system should compute and display an active risk level flag for the risk
    And the risk should appear in the Risks Ledger table with correct severity, probability, and computed risk level

  Scenario: RAID Project Issues Portal Workflow
    Given the Delivery Manager opens the "Project Issues Portal" in the RAID dashboard
    When the Manager logs a new issue "Client has not provided UAT credentials"
    And categorizes it as an operational block
    Then the issue should appear in the Issues table
    And it should be distinguishable from engineering bugs logged in the Defect Tracker

  Scenario: PMO Phase Gate Validation for Initialization and Production
    Given a PMO Auditor reviews project documents in "PMO & Project Documents"
    When the project attempts to initialize without a verified "Statement of Work (SOW)" URL link
    Then initialization should be blocked by the phase gate
    When attempting a Production Deployment release without QA lead sign-off validation
    Then the phase gate should prevent release authorization

  Scenario: PMO External Document URL Registration
    Given a PMO Auditor is on the "PMO & Project Documents" page
    When the auditor registers an external document URL for "Statement of Work (SOW)" pointing to "https://drive.company.com/sow-ecomm.pdf"
    Then the SOW entry should appear in the document repository with the registered URL
    And the SOW phase gate status should update to "Verified"

  Scenario Outline: Financial Invoicing Ledger Processing
    Given a project configured with pricing model "<pricing_model>"
    When the monthly financial calculation engine runs for "<pricing_model>"
    Then the invoice ledger should calculate "<calculation_rule>"

    Examples:
      | pricing_model     | calculation_rule                                                       |
      | Fixed Bid         | Fixed budget vs billed/cost rates per day and deliverable milestones   |
      | Time & Material  | Billed hours scanned against LOP absences and Overtime worklog entries |

  Scenario: Fixed Bid Fixed Costs Module and System Invoicing Table
    Given the Finance Manager opens the "Fixed Bid Billing & Invoicing Ledger" for "E-Commerce Mobile Portal"
    When the Finance Manager adds fixed cost line items:
      | Description                  | Amount (USD) |
      | GitHub Repository Fee        | 200          |
      | Third-Party Server Hosting   | 800          |
      | Architectural Setup Fee      | 1500         |
    Then the Fixed Costs Module should list all three line items
    And the System Invoicing Table should combine active resource tallies with fixed cost line items
    And output the absolute project contract value

  Scenario: Fixed Bid Payment Milestone State Transitions
    Given the Finance Manager is on the "FB Payment Milestones Dashboard" for "E-Commerce Mobile Portal"
    When the milestone "Alpha Delivery" is moved to state "Milestone Completed"
    Then the state change date should be logged
    When the milestone is advanced to "Invoice Raised"
    Then the Invoice Raised date should be recorded
    When the milestone is marked as "Payment Completed"
    Then the full state history log should show all transitions with their dates:
      | State                | Date       |
      | In Progress          | 2026-08-01 |
      | Milestone Completed  | 2026-09-15 |
      | Invoice Raised       | 2026-09-20 |
      | Payment Completed    | 2026-10-05 |

  Scenario: TnM Monthly Billing Period Timeline Terminal
    Given the Finance Manager views the "TnM Billing Ledger" for a Time & Material project
    Then the TnM Payment Milestones Terminal should display chronological monthly billing periods
    And each period frame should show invoice generation parameters (billing period dates, hours billed, LOP deductions, overtime additions)
    And the monthly invoice summary should be calculable from the period data

  Scenario: BCP Code Repository Access Token Validity Tracking
    Given the Delivery Manager is on the "BCP Profile" for "E-Commerce Mobile Portal"
    When the Manager registers a code repository entry:
      | Field                    | Value                       |
      | Repository URL           | https://github.com/org/repo |
      | Access Token Expiry Date | 2026-12-31                  |
    Then the repository entry should appear in the "Code Repository Logs" section
    And the system should display the access token validity frame with expiry date "2026-12-31"

  Scenario: Business Continuity Profile (BCP) and Backup Contact Assignment
    Given the Delivery Manager checks the "BCP Profile"
    Then infrastructure endpoints, SSL cert expiry dates, and repository token validity frames should be tracked
    When a primary developer is flagged as departing
    Then mapped backup contact details (Name, Role, Email, Phone) should immediately display for delivery continuity
