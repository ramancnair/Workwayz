import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { updateTestMatrix, TestResultItem } from '../../scripts/testMatrixUpdater';

export default class PlaywrightMatrixReporter implements Reporter {
  private results: Map<string, TestResultItem> = new Map();

  onTestEnd(test: TestCase, result: TestResult) {
    // Extract TC ID from test title, e.g. "TC-AUTH-001: Public landing page displays..."
    const match = test.title.match(/TC-[A-Z]+-\d+/);
    if (match) {
      const id = match[0];
      let status: 'PASS' | 'FAIL' | 'SKIPPED' | 'TIMEOUT' = 'PASS';
      if (result.status === 'passed') status = 'PASS';
      else if (result.status === 'timedOut') status = 'TIMEOUT';
      else if (result.status === 'skipped') status = 'SKIPPED';
      else status = 'FAIL';

      const durationSec = (result.duration / 1000).toFixed(1) + 's';

      // Store/overwrite with the latest attempt/result for this test
      this.results.set(id, {
        id,
        status,
        duration: durationSec,
        error: result.error?.message,
      });
    }
  }

  onEnd(_result: FullResult) {
    if (this.results.size > 0) {
      updateTestMatrix({
        source: 'playwright',
        results: Array.from(this.results.values()),
      });
    }
  }
}
