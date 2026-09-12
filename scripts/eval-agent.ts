import fs from 'fs';
import path from 'path';
import { retrieveCandidateTools } from '../src/ai/tools/tool-retriever';

interface TestCase {
  id: string;
  domain: string;
  prompt: string;
  expectedTools: string[];
  requiredParams: string[];
}

interface EvalResult {
  id: string;
  domain: string;
  prompt: string;
  expectedTools: string[];
  retrievedTools: string[];
  passed: boolean;
  durationMs: number;
}

async function runEvaluation() {
  const isLive = process.argv.includes('--live');
  const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/agent-eval-matrix.json');

  if (!fs.existsSync(fixturePath)) {
    console.error(`Benchmark dataset not found at ${fixturePath}`);
    process.exit(1);
  }

  const testCases: TestCase[] = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  console.log('\n======================================================');
  console.log(`🤖 FlowPilot Agent Benchmark Evaluation (${isLive ? 'LIVE LLM' : 'RETRIEVAL RECALL'})`);
  console.log(`📊 Evaluating ${testCases.length} Golden-Set Intents`);
  console.log('======================================================\n');

  const results: EvalResult[] = [];
  let passedCount = 0;

  for (const tc of testCases) {
    const startTime = Date.now();
    let retrievedTools: string[] = [];
    let passed = false;

    if (isLive) {
      try {
        const { flowpilotAgent } = await import('../src/ai/flows/flowpilot-agent');
        const output = await flowpilotAgent({
          messages: [{ role: 'user', content: tc.prompt }],
          currentProjectId: 'test-proj-001',
          currentProjectName: 'ProjectFlow Core',
        });
        const executedTools = (output.executedActions || []).map((a: any) => a.toolName);
        retrievedTools = executedTools;
        passed = tc.expectedTools.some((t) => executedTools.includes(t));
      } catch (err: any) {
        console.warn(`[Live Eval Error on ${tc.id}]:`, err.message);
        passed = false;
      }
    } else {
      // Deterministic Retrieval Benchmark
      const retrieval = await retrieveCandidateTools({
        lastUserMessage: tc.prompt,
        currentProjectId: 'test-proj-001',
        currentProjectName: 'ProjectFlow Core',
        maxResults: 14,
      });
      retrievedTools = retrieval.candidateToolNames;
      passed = tc.expectedTools.some((expected) => retrievedTools.includes(expected));
    }

    const durationMs = Date.now() - startTime;
    if (passed) passedCount++;

    results.push({
      id: tc.id,
      domain: tc.domain,
      prompt: tc.prompt,
      expectedTools: tc.expectedTools,
      retrievedTools: retrievedTools.slice(0, 5),
      passed,
      durationMs,
    });

    const statusBadge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`${statusBadge} ${tc.id} (${tc.domain}): "${tc.prompt.slice(0, 48)}..." [${durationMs}ms]`);
  }

  const recallRate = ((passedCount / testCases.length) * 100).toFixed(1);
  console.log('\n------------------------------------------------------');
  console.log(`📈 Summary: ${passedCount}/${testCases.length} Passed (${recallRate}% Recall)`);
  console.log('------------------------------------------------------\n');

  // Export report to docs
  const reportDir = path.resolve(process.cwd(), 'docs/eval-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportFile = path.join(reportDir, 'agent-eval-latest.json');
  fs.writeFileSync(
    reportFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mode: isLive ? 'live-llm' : 'retrieval-benchmark',
        total: testCases.length,
        passed: passedCount,
        recallRate: `${recallRate}%`,
        results,
      },
      null,
      2
    )
  );

  console.log(`📄 Saved benchmark report to docs/eval-reports/agent-eval-latest.json\n`);
  if (passedCount < testCases.length * 0.85) {
    process.exit(1);
  }
}

runEvaluation().catch((err) => {
  console.error('Evaluation runner failed:', err);
  process.exit(1);
});
