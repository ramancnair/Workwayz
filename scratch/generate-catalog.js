const fs = require('fs');
const path = require('path');

const extracted = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted-tools.json'), 'utf8'));

// Helper to assign categories and relevant domain aliases
function enrichTool(tool) {
  const name = tool.name.toLowerCase();
  const desc = tool.description.toLowerCase();
  let category = 'general';
  let aliases = [];
  let keywords = [];

  if (name.includes('testcase') || name.includes('testplan') || name.includes('testexecution') || name.includes('defect') || name.includes('qa') || name.includes('testing')) {
    category = 'qa_testing';
    aliases.push('qa', 'testing', 'test case', 'test cycle', 'test plan', 'defect', 'bug', 'sit', 'uat', 'regression');
  } else if (name.includes('raid') || name.includes('risk') || name.includes('assumption') || name.includes('issue') || name.includes('dependency')) {
    category = 'governance_raid';
    aliases.push('raid', 'governance', 'risk', 'assumption', 'issue', 'dependency', 'blocker', 'mitigation');
  } else if (name.includes('sprint') || name.includes('epic') || name.includes('burndown') || name.includes('velocity') || name.includes('backlog') || name.includes('kanban')) {
    category = 'agile_sprints';
    aliases.push('agile', 'scrum', 'sprint', 'epic', 'backlog', 'burndown', 'velocity', 'kanban', 'wip limit');
  } else if (name.includes('impacted') || name.includes('horizontal') || name.includes('specification') || name.includes('estimation') || name.includes('initial')) {
    category = 'specifications_estimation';
    aliases.push('specs', 'specifications', 'impacted systems', 'horizontals', 'estimation', 'architecture', 'mandays', 'billing rate');
  } else if (name.includes('workitem') || name.includes('story') || name.includes('subtask') || name.includes('defect') || name.includes('task')) {
    category = 'work_items';
    aliases.push('user story', 'task', 'bug', 'defect', 'feature change', 'sub task', 'kanban item');
  } else if (name.includes('leave') || name.includes('holiday') || name.includes('absence')) {
    category = 'time_leaves';
    aliases.push('leave', 'holiday', 'pto', 'vacation', 'absence', 'balance', 'sick leave');
  } else if (name.includes('resource') || name.includes('user') || name.includes('utilization') || name.includes('team') || name.includes('workload') || name.includes('role')) {
    category = 'resources';
    aliases.push('resource', 'team member', 'engineer', 'allocation', 'utilization', 'workload', 'rate', 'user directory');
  } else if (name.includes('worklog') || name.includes('work')) {
    category = 'time_leaves';
    aliases.push('worklog', 'timesheet', 'log hours', 'effort');
  } else if (name.includes('release') || name.includes('milestone')) {
    category = 'releases_milestones';
    aliases.push('release', 'version', 'milestone', 'payment milestone', 'delivery');
  } else if (name.includes('pmo') || name.includes('billing') || name.includes('invoice') || name.includes('contract') || name.includes('tnm') || name.includes('bcp')) {
    category = 'pmo_financials';
    aliases.push('pmo', 'financials', 'billing', 'invoice', 'fixed billing', 'time and materials', 'tnm', 'bcp', 'disaster recovery');
  } else if (name.includes('portfolio') || name.includes('project')) {
    category = 'portfolio_project';
    aliases.push('portfolio', 'project', 'container', 'archive', 'duplicate');
  } else if (name.includes('trash') || name.includes('restore') || name.includes('permanentlydelete')) {
    category = 'settings_trash';
    aliases.push('trash', 'restore', 'recycle bin', 'recover', 'permanently delete', 'purge');
  } else if (name.includes('environment') || name.includes('setting') || name.includes('column') || name.includes('gantt') || name.includes('repo')) {
    category = 'settings_environments';
    aliases.push('environment', 'settings', 'gantt', 'git repository', 'columns');
  }

  // Generate a dense searchable text representation
  const paramText = tool.params.join(' ');
  const aliasText = aliases.join(' ');
  const searchText = `${tool.name} | Category: ${category} | Aliases: ${aliasText} | Description: ${tool.description} | Parameters: ${paramText}`;

  return {
    name: tool.name,
    varName: tool.varName,
    category,
    description: tool.description,
    params: tool.params,
    aliases,
    searchText
  };
}

const enriched = extracted.map(enrichTool);

// Verify category counts
const counts = {};
enriched.forEach(t => {
  counts[t.category] = (counts[t.category] || 0) + 1;
});
console.log('Category distribution:', counts);

// Now generate src/ai/tools/tool-catalog.ts
const tsContent = `// Auto-generated Tool Catalog for FlowPilot RAG Tool Selection
// Total Tools: ${enriched.length}

export interface ToolMetadata {
  name: string;
  varName: string;
  category: string;
  description: string;
  params: string[];
  aliases: string[];
  searchText: string;
}

export const TOOL_CATALOG: ToolMetadata[] = ${JSON.stringify(enriched, null, 2)};

export const TOOL_CATALOG_MAP = new Map<string, ToolMetadata>(
  TOOL_CATALOG.map((t) => [t.name, t])
);
`;

const catalogPath = path.join(__dirname, '../src/ai/tools/tool-catalog.ts');
fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
fs.writeFileSync(catalogPath, tsContent, 'utf8');
console.log('Written tool-catalog.ts successfully to', catalogPath);
