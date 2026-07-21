Feature: My Account Management
  As a registered user
  I want to manage my personal profile and account security settings
  So that my information is up to date and my account is secure

  Scenario: Update user profile information
    Given a user is logged into the application
    And the user navigates to the "My Account" page
    When the user updates their profile with First Name "Jane", Last Name "Doe", and Phone "555-0199"
    Then the profile information should be saved successfully

  Scenario: Change account password
    Given a user is on the "My Account" page
    When the user changes their password from "OldPass123!" to "NewPass456!"
    Then the password update should be confirmed successfully
