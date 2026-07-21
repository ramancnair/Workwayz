Feature: Portfolio and Enterprise Resource Management
  As a PM, Delivery Manager, or Executive
  I want to oversee portfolios, monitor executive health metrics, audit quality/estimations, track billing, manage resources, and administer leaves
  So that enterprise projects are delivered on budget with high quality and balanced utilization

  Scenario: My Projects PM View — Initial Estimations Requiring Validation
    Given a Project Manager "Sarah Connor" is logged in to ProjectFlow
    When the PM navigates to "My Projects"
    Then the workspace should display all active projects where Sarah Connor is staffed
    And a distinct "Initial Estimations" section should be visible listing projects pending engineering validation
    And clicking an item in the Initial Estimations list should navigate to that project's Initial Estimation workspace

  Scenario: Create New Project under Parent Portfolio
    Given the PM is on the "Projects Home" page
    When the PM clicks "Create New Project"
    And the user selects Parent Portfolio "Digital Transformation Portfolio"
    And the user enters Project Name "E-Commerce Mobile Portal"
    And sets Start Date "2026-08-01" and End Date "2027-02-01"
    And assigns Project Manager "Sarah Connor"
    And selects Pricing Model "Time & Material"
    And sets initial status to "Initial Estimation"
    And clicks "Save Project"
    Then the new project "E-Commerce Mobile Portal" should be created under "Digital Transformation Portfolio"

  Scenario: Unassigned Portfolio Fallback
    Given a user creates a project without choosing a specific portfolio
    When the project is saved
    Then the system should automatically map the project underneath "Unassigned Portfolio"

  Scenario: Executive Portfolio Health Dashboard Filtering
    Given the Senior Manager accesses the "Portfolio Dashboard"
    Then only active initiatives with health state designated as "Red" or "Yellow" should be aggregated
    And the dashboard layout should display:
      | Quadrant Section                |
      | High Potential Risks            |
      | Critical & High Priority Issues |
      | Red Health Projects             |

  Scenario: Audit Quality and Estimations Variance
    Given a Delivery Manager views the "Quality & Estimations" auditing panel
    Then the panel should display the three structural gates:
      | Gate                 | Description                          |
      | Initial Estimation   | High-level requirement phase         |
      | Planned Estimation   | Post-user story & sub-task breakout  |
      | Actual Effort        | Tallied from worklog entries         |
    And the KPI summary card should highlight:
      | Metric                     | Value         |
      | Active Portfolio Projects  | 12            |
      | Ballpark Estimations       | 450 Man-Days  |
      | Planned Effort             | 480 Man-Days  |
      | Actual Effort Consumed     | 310 Man-Days  |
      | Variance Percentage        | -5.2%         |

  Scenario: Defects Containment and Leakage Rate Monitoring
    Given the QA Director opens the "Defects Dashboard"
    Then the defect metrics should be categorized into:
      | Defect Phase        |
      | SIT Phase Defects   |
      | UAT Phase Defects   |
      | Production Leaks    |
    And the system should automatically calculate and display the macro "Average Leakage Rate %"

  Scenario: Overview Financial Ledger in Billing Dashboard
    Given the Financial Auditor views the "Billing Dashboard"
    Then the top-line summary should display Total Revenue, Resource Cost, Fixed Cost, Net Profit, and Realized/Collected Payments
    And the project ledger should display a zebra-striped breakdown distinguishing between "Time & Material" and "Fixed Bid" models

  Scenario: User Enablement Approval and Direct Ingestion
    Given an Administrator navigates to "Users & User List"
    Then the "Users Awaiting Enablement" queue should list pending self-registered users
    When the Admin approves user "Alice Smith"
    Then "Alice Smith" should be granted system access permissions
    When the Admin clicks "Add New User" and inputs:
      | Field            | Value              |
      | First Name       | David              |
      | Last Name        | Miller             |
      | Employee ID      | EMP-205            |
      | Phone            | +15550198765       |
      | Experience       | 8                  |
      | Access Level     | Project Manager    |
      | Password         | TempP@ss2026!      |
      | Resource Cost    | 65 USD/hour        |
    And submits the modal
    Then the new user "David Miller" should be provisioned directly into the resource pool

  Scenario: Resource Utilization Saturation Monitoring
    Given a Resource Manager opens "Resource Utilization"
    When searching for employee "John Doe" (EMP-101)
    Then the Availability Outlook card should show operational capacity saturation
    And if capacity exceeds 100% (e.g. "Utilization at 248%"), it should highlight an excessive multi-project staffing alert
    And the monthly color-coded Availability Grid should update day-by-day availability

  Scenario: AI Auto-fill Holiday Calendar
    Given an Administrator is on "Holidays & Holiday Calendar"
    When the user configures Weekly Off-Days as "Saturday" and "Sunday"
    And clicks "Auto-fill with AI" for region "United States - 2026"
    Then the yearly holidays grid should automatically populate official domestic holidays

  Scenario: Leave Tracker Policy Constraints and Conflict Prevention
    Given a team member "Alice Smith" is allocated 100% to project "E-Commerce Mobile Portal"
    When "Alice Smith" applies for leave from "2026-09-01" to "2026-09-05" in "Leave Tracker"
    Then the policy engine should evaluate capacity constraints across all active projects
    And if approved, the system should prevent logging worklog hours on those approved leave dates
    And update the visual balance rail for "Annual Paid Leaves Quota"

  Scenario: Configure Global Leave Settings and Quotas
    Given an Administrator opens the "Leave Settings" page
    When the Admin sets "Annual Paid Leaves Quota" to 18 days
    And the Admin toggles "Allow Carry-Over Leaves" to enabled
    And sets "Carry-Over Days Limit" to 5
    And saves the settings
    Then the global leave quota should apply to all new and existing resources
    And the Resource Leave Accounts table should display individual staff leave balances:
      | Column Header       |
      | Staff Name          |
      | Role                |
      | Carry-Over Balance  |
      | Current Balance     |
      | Remaining Days      |

  Scenario: Quality KPI Plan Consumed Progress Rail Visibility
    Given the Delivery Manager views the "Quality & Estimations" auditing panel
    Then the KPI summary card should include a "Plan Consumed" progress rail
    And the rail should visually represent the percentage of planned effort already consumed against the total planned estimation
