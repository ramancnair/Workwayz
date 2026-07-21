Feature: Initial Estimation and AI-Assisted Project Scoping
  As a Project Manager or Solution Architect
  I want to initialize scoping, leverage AI for stack and horizontal staffing recommendations, and generate baseline estimations
  So that project feasibility, impacted systems, staffing, and budget estimates are established accurately

  Background:
    Given the PM has created a new project "Cloud Payment Gateway Integration"
    And set the project status dropdown to "Initial Estimation"
    And entered the Project Summary scope text:
      """
      Build a scalable multi-tenant payment gateway integration supporting credit cards, PayPal, and Apple Pay with automated recurring billing, webhooks, and fraud detection.
      """

  Scenario Outline: Generate AI Architecture Stack Suggestions and Ingest Impacted Systems
    Given the user is on the Initial Estimation workspace for "Cloud Payment Gateway Integration"
    When the user clicks the "Stack Suggest" button
    Then the generative LLM engine analyzes the Project Summary scope text
    And presents 3 tailored architectural options:
      | Option | Architecture Suite | Key Technologies |
      | 1      | Next.js Full-Stack | Vercel, MongoDB, NextAuth, Stripe |
      | 2      | AWS Serverless     | Amplify, Lambda, DynamoDB, Cognito |
      | 3      | Microservices Suite| Kubernetes, PostgreSQL, Keycloak, Kafka |
    When the user selects "<selected_option>"
    Then those technical zones should be automatically ingested as structured lines under "Impacted Systems"
    When the user clicks "Add System" and manually enters "<manual_system>"
    Then "<manual_system>" should be appended to the Impacted Systems list

    Examples:
      | selected_option    | manual_system                  |
      | Next.js Full-Stack | Legacy Billing ERP Connector   |
      | AWS Serverless     | External Fraud Scoring Service |

  Scenario: Generate Horizontal Staffing Composition and Billing Rates
    Given the Impacted Systems list is configured for "Cloud Payment Gateway Integration"
    When the user clicks the "Horizontal Suggest" button
    Then the AI engine should output proportional staffing compositions across core practices:
      | Practice Role          | Suggested Allocation |
      | Project Management     | 15%                  |
      | Business Analysis      | 15%                  |
      | Solution Architecture  | 10%                  |
      | Full-Stack Development | 40%                  |
      | Quality Assurance      | 15%                  |
      | DevOps & Infrastructure| 5%                   |
    When the user assigns operational daily billing rates for each role
    Then the baseline horizontal rate structure should be calculated and stored

  Scenario: AI Effort Compilation and Estimation Confirmation
    Given the project scope, impacted systems, and horizontal staffing rates are established
    When the user clicks the "AI Estimator" utility button
    Then the AI model cross-references the scope matrix against global execution averages
    And outputs baseline effort allocations in Man-Days
    When the Project Manager fine-tunes effort adjustments
    And clicks "Confirm Estimation"
    Then the estimation lock should be applied
    And the project status should transition out of initialization into active status
