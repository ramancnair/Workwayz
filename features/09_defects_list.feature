Feature: Defects List View
  As a QA Tester
  I want to view and manage defects in a flat list
  So that I can quickly triage and update bugs across the project

  Scenario: View and log a defect from the flat list
    Given a QA Tester opens the "Defects List" for project "PRJ-100"
    Then the defects list table should be displayed
    When the tester logs a new defect with Title "Login Button Missing", Severity "High", and Assignee "John Doe"
    Then the new defect should appear in the defects list
