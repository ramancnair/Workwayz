module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['features/**/*.ts', 'step-definitions/**/*.ts'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    publishQuiet: true
  },
  skipSetup: {
    paths: [
      'features/02_authentication_and_access.feature',
      'features/03_portfolio_management.feature',
      'features/04_initial_estimation.feature',
      'features/05_project_execution.feature',
      'features/07_my_account.feature',
      'features/08_project_settings.feature',
      'features/09_defects_list.feature'
    ],
    requireModule: ['ts-node/register'],
    require: ['features/**/*.ts', 'step-definitions/**/*.ts'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    publishQuiet: true
  }
};
