import { updateTestMatrix, TestResultItem } from './testMatrixUpdater';

const FILE_TO_TC_MAP: Record<string, string> = {
  'permissions.test.ts': 'TC-UNIT-PERM-001',
  'utils.test.ts': 'TC-UNIT-UTIL-001',
  'auth-utils.test.ts': 'TC-UNIT-AUTH-001',
  'StatsCard.test.tsx': 'TC-COMP-STAT-001',
  'PageHeader.test.tsx': 'TC-COMP-HDR-001',
};

export default class VitestMatrixReporter {
  onTestRunEnd(testModules: any[], unhandledErrors: any[], reason?: string) {
    this.processModules(testModules);
  }

  // Backwards compatibility
  onFinished(files?: any[]) {
    this.processModules(files);
  }

  private processModules(modules?: any[]) {
    if (!modules || modules.length === 0) return;

    const results: TestResultItem[] = [];

    for (const mod of modules) {
      // Find filename across various possible properties in Vitest 3.x / 4.x
      const rawPath = mod.moduleId || mod.filepath || mod.name || '';
      const fileName = rawPath.split(/[/\\]/).pop() || '';
      const tcId = FILE_TO_TC_MAP[fileName];
      if (!tcId) continue;

      // In Vitest 4.x: mod.diagnostic() or mod.ok() or mod.result() or mod.state()
      let passed = true;
      if (typeof mod.ok === 'function') {
        passed = mod.ok();
      } else if (mod.result?.state) {
        passed = mod.result.state === 'pass';
      } else if (mod.state) {
        passed = mod.state === 'pass' || mod.state === 'passed';
      }

      // Check if diagnostic or errors exist
      if (mod.diagnostic?.()?.errors?.length > 0) {
        passed = false;
      }

      const rawDuration = mod.diagnostic?.()?.duration ?? mod.result?.duration;
      const duration = rawDuration != null ? `${Math.round(rawDuration)}ms` : undefined;

      results.push({
        id: tcId,
        status: passed ? 'PASS' : 'FAIL',
        duration,
      });
    }

    if (results.length > 0) {
      updateTestMatrix({
        source: 'vitest',
        results,
      });
    }
  }
}
