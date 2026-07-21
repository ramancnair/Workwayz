Feature: Setup Wizard Configuration
  As a System Administrator launching ProjectFlow for the first time
  I want to configure the database, authentication, super admin account, and generative AI settings
  So that the application boots up with a secure and fully integrated infrastructure foundation

  Background:
    Given the user opens the ProjectFlow application for the first time
    Then the step-by-step Setup Wizard is displayed

  Scenario Outline: Configure Primary Database Connection
    Given the user is on the "Database Setup" step of the wizard
    When the user enters the project name "<project_name>"
    And the user selects the database provider "<provider>"
    And the user enters the project ID "<project_id>" and API key "<api_key>"
    And the user clicks "Save Changes"
    Then the database configuration should be saved successfully
    When the user clicks "Next →"
    Then the wizard should navigate to the "Authentication Setup" step

    Examples:
      | provider  | project_name      | project_id           | api_key                   |
      | Firebase  | ProjectFlow-Cloud | pf-prod-10293        | AIzaSyD-ExampleKey123456  |
      | Supabase  | ProjectFlow-Supa  | sb-proj-55412        | eyJhbGciOiJIUzI1NiIsIn... |

  Scenario: Configure Authentication Providers and SSO Connections
    Given the user is on the "Authentication Setup" step of the wizard
    Then the authentication provider binding should automatically default to "Firebase Auth" for Firebase database
    When the user toggles "Enable Google SSO" to active
    And the user toggles "Enable GitHub SSO" to active
    And the user clicks "Save Changes"
    Then the SSO integration settings should be stored
    When the user clicks "Next →"
    Then the wizard should navigate to the "Super Admin User Creation" step

  Scenario Outline: Create Master Super Admin User
    Given the user is on the "Super Admin User Creation" step of the wizard
    When the user enters User Name "<user_name>"
    And the user enters Email ID "<email>"
    And the user enters Password "<password>" and re-enters Password "<confirm_password>"
    And the user submits the admin creation form
    Then the master admin account should be created with role "Administrator"
    And the wizard should navigate to the "AI Configuration Setup" step

    Examples:
      | user_name | email             | password    | confirm_password |
      | John Doe  | admin@example.com | SecureP@ss1 | SecureP@ss1      |

  Scenario Outline: Configure Generative AI Foundation Model
    Given the user is on the "AI Configuration Setup" step of the wizard
    When the user enters AI Profile Name "<ai_profile_name>"
    And the user selects AI Provider "<ai_provider>"
    And the user inputs API Key "<api_key>"
    And optionally provides Default Model Override "<model_override>"
    And the user clicks "Save Changes"
    Then the AI provider integration state should be updated
    When the user clicks "Next →"
    Then the wizard should navigate to the "Finish Setup" step

    Examples:
      | ai_profile_name   | ai_provider   | api_key           | model_override     |
      | Gemini-Production | Google Gemini | AIzaSyB-GeminiKey | gemini-1.5-pro     |
      | Claude-Studio     | Claude        | sk-ant-api-key    | claude-3-5-sonnet  |
      | Local-Ollama      | Ollama        | http://localhost  | llama3:latest      |
      | ChatGPT-Profile   | ChatGPT       | sk-openai-key123  | gpt-4o             |
      | LMStudio-Local    | LM Studio     | http://localhost  | mistral-7b-instruct|

  Scenario: Verify Infrastructure Matrix and Finalize Application Setup
    Given the user is on the "Finish Setup" step of the wizard
    Then the summary checks matrix should display:
      | Component           | Status       |
      | Database            | Configured   |
      | Authentication      | Configured   |
      | Admin Account       | Ready        |
      | AI Integration      | Active       |
    When the user clicks "Complete Setup"
    Then structural system parameters should be written to configuration
    And the ProjectFlow application instance should boot successfully into the home landing page
