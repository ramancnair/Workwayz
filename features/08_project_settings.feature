Feature: Project Settings and Holidays
  As a Project Manager
  I want to configure project-specific settings and view project holidays
  So that I can tailor the project environment to my team's needs

  Scenario: Configure Project Board Settings
    Given a PM opens the "Board Settings" for project "PRJ-100"
    When the PM adds a new board column
    Then the new column should be visible in the board configuration

  Scenario: Configure Project Sprint Settings
    Given a PM opens the "Sprint Settings" for project "PRJ-100"
    When the PM sets the Sprint Duration to "2 Weeks" and Start Day to "Monday"
    Then the sprint settings should be saved successfully

  Scenario: Configure Project Effort Settings
    Given a PM opens the "Effort Settings" for project "PRJ-100"
    When the PM sets Story Point Hours to "8" and Working Hours Per Day to "8"
    Then the effort settings should be saved successfully

  Scenario: View Project Holidays Calendar
    Given a user opens the "Holidays" calendar for project "PRJ-100"
    Then the project holiday calendar should be displayed

  Scenario: View Project Leave Calendar
    Given a user opens the "Leave Calendar" for project "PRJ-100"
    Then the project leave calendar should be displayed
