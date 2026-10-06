/**
 * GitHub Issue Reporter utility.
 * Sends user-reported defects and crash reports directly to the GitHub repository.
 */

export interface GitHubIssuePayload {
  title?: string;
  errorName?: string;
  errorCode?: string;
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  userDescription?: string;
  pageUrl?: string;
  browserInfo?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  userEmail?: string;
  labels?: string[];
}

export interface GitHubIssueResult {
  success: boolean;
  issueNumber?: number;
  issueUrl?: string;
  error?: string;
}

/**
 * Generates an informative issue title including the error type and summary.
 */
export function buildIssueTitle(payload: GitHubIssuePayload): string {
  if (payload.title && payload.title.trim()) {
    return payload.title.trim();
  }

  const prefix = payload.errorName && !payload.errorMessage.startsWith(payload.errorName)
    ? `${payload.errorName}: `
    : '';

  const fullMsg = `${prefix}${payload.errorMessage}`.trim();
  return `[User Bug]: ${fullMsg.slice(0, 80)}`;
}

/**
 * Builds the complete Markdown body for a GitHub issue, ensuring the full
 * error code, error name, digest/code, and stack trace are uncollapsed and visible.
 */
export function buildIssueBody(payload: GitHubIssuePayload): string {
  const bodySections: string[] = [];

  bodySections.push(`## 🐞 User Bug Report`);

  if (payload.userDescription && payload.userDescription.trim()) {
    bodySections.push(`### 💬 User Description\n> ${payload.userDescription.trim().replace(/\n/g, '\n> ')}`);
  } else {
    bodySections.push(`*No user comments provided.*`);
  }

  // Construct Context & Environment table
  const envRows: [string, string][] = [
    ['Page URL', `\`${payload.pageUrl || 'Unknown'}\``],
  ];

  if (payload.errorName) {
    envRows.push(['Error Type', `\`${payload.errorName}\``]);
  }

  if (payload.errorCode) {
    envRows.push(['Error Code / Digest', `\`${payload.errorCode}\``]);
  }

  envRows.push(
    ['Severity', `\`${(payload.severity || 'high').toUpperCase()}\``],
    ['Reported At', `\`${new Date().toISOString()}\``],
    ['Reported By', `\`${payload.userEmail || 'Anonymous / Guest'}\``],
    ['Client Agent', `\`${payload.browserInfo || 'Unknown'}\``]
  );

  const envTable = [
    `### 📋 Context & Environment`,
    `| Field | Value |`,
    `| :--- | :--- |`,
    ...envRows.map(([k, v]) => `| **${k}** | ${v} |`),
  ].join('\n');

  bodySections.push(envTable);

  // Error Message Header
  const displayErrorName = payload.errorName || '';
  const displayErrorMessage = displayErrorName && !payload.errorMessage.startsWith(displayErrorName)
    ? `${displayErrorName}: ${payload.errorMessage}`
    : payload.errorMessage;

  bodySections.push(`### ⚠️ Error Message
\`\`\`text
${displayErrorMessage}
\`\`\`
`);

  // Full Error Code & Call Stack (Prominently displayed, not collapsed)
  const fullErrorTrace = (payload.errorStack && payload.errorStack.trim())
    ? payload.errorStack.trim()
    : displayErrorMessage;

  bodySections.push(`### 🔍 Full Error Code & Call Stack
\`\`\`text
${fullErrorTrace}
\`\`\`
`);

  // React Component Stack if available
  if (payload.componentStack && payload.componentStack.trim()) {
    bodySections.push(`### 🧩 React Component Stack
\`\`\`text
${payload.componentStack.trim()}
\`\`\`
`);
  }

  bodySections.push(`---\n*Reported automatically from Workwayz application.*`);

  return bodySections.join('\n\n');
}

export async function createGitHubIssue(payload: GitHubIssuePayload): Promise<GitHubIssueResult> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'ramancnair';
  const repo = process.env.GITHUB_REPO_NAME || 'ProjectFlow';

  if (!token) {
    return {
      success: false,
      error: 'GITHUB_TOKEN environment variable is not configured on the server.',
    };
  }

  const issueTitle = buildIssueTitle(payload);
  const issueBody = buildIssueBody(payload);

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Workwayz-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: payload.labels || ['user-reported', 'bug'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `GitHub API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      issueNumber: data.number,
      issueUrl: data.html_url,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to submit issue to GitHub API',
    };
  }
}

/**
 * Updates an existing GitHub issue (e.g., to revise title or Markdown body).
 */
export async function updateGitHubIssue(
  issueNumber: number,
  update: { title?: string; body?: string }
): Promise<GitHubIssueResult> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER || 'ramancnair';
  const repo = process.env.GITHUB_REPO_NAME || 'ProjectFlow';

  if (!token) {
    return {
      success: false,
      error: 'GITHUB_TOKEN environment variable is not configured on the server.',
    };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Workwayz-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `GitHub API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      issueNumber: data.number,
      issueUrl: data.html_url,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to update issue via GitHub API',
    };
  }
}
