Feature: System Administration and Governance Settings
  As a System Administrator
  I want to control role-based page and CRUD access, manage database/auth/AI reconfigurations, and handle project archiving and trash recovery
  So that system security, infrastructure adaptability, and lifecycle retention are enforced

  Scenario: Page Access Matrix Role Visibility Configuration
    Given the Administrator accesses "Portfolio Settings & Access Settings"
    When the Admin configures visibility toggles on the "Page Access Matrix" across roles:
      | Role              | Level Page Type  | Visibility State |
      | Administrator     | Admin Level      | Enabled          |
      | Senior Management | Portfolio Level  | Enabled          |
      | Project Manager   | Project Level    | Enabled          |
      | Team Member       | Admin Level      | Disabled         |
    And saves the matrix settings
    Then page access enforcement should apply immediately upon next user navigation

  Scenario: Granular CRUD Privilege Assignment
    Given the Administrator is on the "CRUD Access Grid"
    When setting permission controls across scopes:
      | Scope Level                       | Create | Read | Update | Delete |
      | Portfolio Level                   | No     | Yes  | No     | No     |
      | Project Level                     | Yes    | Yes  | Yes    | No     |
      | Story/Feature/Task Level          | Yes    | Yes  | Yes    | Yes    |
      | Sub-tasks/Bugs/Test Cases Level   | Yes    | Yes  | Yes    | Yes    |
    Then the system authorization rules should restrict user actions based on these exact permissions

  Scenario Outline: Infrastructure Re-Configuration Post-Deployment
    Given the Administrator opens the "<terminal_panel>"
    When the Admin updates infrastructure configuration parameters for "<provider_or_service>"
    And saves changes
    Then the runtime environment connection to "<provider_or_service>" should update without requiring application re-initialization

    Examples:
      | terminal_panel                        | provider_or_service |
      | Database Management Panel             | Supabase Migration  |
      | Authentication Configuration Panel    | Google OAuth SSO    |
      | Authentication Configuration Panel    | Facebook OAuth      |
      | Authentication Configuration Panel    | Apple SSO           |
      | Generative AI Configuration Board     | Claude 3.5 Sonnet   |

  Scenario: Project Archiving Lifecycle Automation
    Given the Administrator navigates to the "Project Archiving Console"
    When setting an automated archiving policy of "6 months post-closure"
    Then completed projects inactive for more than 6 months should automatically move to the Archived state

  Scenario: Archive Auto-Deletion Rule Configuration
    Given the Administrator is on the "Project Archiving Console"
    When the Admin configures an auto-deletion rule for archived projects after "12 months in archive"
    Then archived projects that exceed the 12-month archive threshold should be automatically scheduled for permanent deletion
    And the Admin should receive a system notification before permanent deletion executes

  Scenario: Trash Control 30-Day Recovery Window
    Given a project "Legacy CRM Upgrade" was deleted 10 days ago
    When the Administrator accesses the "Trash Control Terminal"
    Then "Legacy CRM Upgrade" should appear in the trash container showing "20 days remaining in retention window"
    When the Admin clicks "Restore Project"
    Then "Legacy CRM Upgrade" should be fully recovered with all historical data intact

  Scenario: Permanent Deletion After 30-Day Window Expiration
    Given a deleted project has exceeded its strict 30-day trash retention boundary
    When the automated trash cleanup daemon runs
    Then the project and its associated artifacts should be permanently erased from the database
