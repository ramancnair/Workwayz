Feature: Authentication and User Access Control
  As a visitor or team member of ProjectFlow
  I want to register an account, sign in securely, and handle password enforcement
  So that I can access my designated workspaces safely

  Scenario: Home Landing Page Overview and Navigation
    Given the visitor navigates to the ProjectFlow home landing page
    Then the value proposition "Manage Portfolios and Projects with Clarity" should be displayed
    And the page should highlight core functions:
      | Function              |
      | Portfolio Management  |
      | Project Tracking      |
      | Team Collaboration    |
    When the visitor clicks "Get Started"
    Then the user should be redirected to the Signup page
    When the visitor navigates back and clicks "Log In"
    Then the user should be redirected to the Login terminal

  Scenario Outline: New User Registration and Initial Permissions Boundary
    Given the user is on the Signup page
    When the user fills in First Name "<first_name>", Last Name "<last_name>"
    And the user enters Employee ID "<emp_id>", Phone "<phone>", and Experience "<experience>" years
    And the user enters Email "<email>" and Password "<password>"
    And the user submits the registration form
    Then the user account should be created successfully
    And upon logging in, the user should be restricted to the isolated "My Projects" dashboard
    And the user should not have peripheral system visibility until approved by an Administrator

    Examples:
      | first_name | last_name | emp_id  | phone        | experience | email             | password    |
      | Alice      | Smith     | EMP-101 | +15550192834 | 5          | alice@company.com | UserPass123! |
      | Bob        | Jones     | EMP-102 | +15550192835 | 3          | bob@company.com   | UserPass456! |

  Scenario: Standard User Login
    Given an active approved user "alice@company.com" exists with password "UserPass123!"
    When the user enters Email "alice@company.com" and Password "UserPass123!" on the Login terminal
    And the user clicks "Log In"
    Then the user should be authenticated successfully
    And redirected to their primary dashboard workspace

  Scenario: Forced Password Reset on First Login for Admin-Created Profiles
    Given an administrator provisions a user profile "charlie@company.com" with default initial password "P@ssword"
    When the user logs in with Email "charlie@company.com" and Password "P@ssword"
    Then the system should enforce an immediate redirect to the secure password update panel
    When the user submits a new compliant password "NewSecurePass88!"
    Then the user password should be updated
    And the user should be granted access to their authorized workspace

  Scenario: Interact with Ask Gemini Helper Overlay
    Given an authenticated user is on any ProjectFlow workspace container
    When the user clicks the "Ask Gemini" overlay button
    Then the embedded AI helper panel should open
    When the user types a prompt "How do I filter red health projects?"
    Then the Ask Gemini panel should return intelligent assistance instructions
