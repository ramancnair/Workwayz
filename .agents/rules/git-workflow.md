---
trigger: always_on
---

# Git Workflow, Quality Gates, and Living Documents Policy

- **Author Info**: Always use `ramancnair6282` and `ramancnair6282@gmail.com`.
- **Automated Verification After Functional Changes**:
  - Automatically run **ESLint** (`npm run lint`), **Vitest** (`npm test`), and **Playwright** (`npm run test:e2e`) after any functional changes.
  - Ensure all quality checks and test suites pass cleanly.
- **Living Documents Synchronization**:
  - Keep living documents updated after every functional change:
    - `Workwayz_Test_Plan.html` (automatically synced by Vitest and Playwright test matrix reporters).
    - `docs/testplan.md` (updated when test suites or test cases are modified).
    - Any relevant living specifications or architectural blueprints in `docs/`.
- **Auto Commit & Push**:
  - After completing major changes, functional modifications, or fixes, and verifying that quality checks and tests pass with living documents updated, automatically stage, commit, and push to the active tracking branch.
  - Use conventional commit messages (e.g. `feat:`, `fix:`, `chore:`, `refactor:`, `test:`).
  - Maintain author attribution as `ramancnair6282 <ramancnair6282@gmail.com>`.
