/**
 * GitHub Issue Reporter utility.
 * Sends user-reported defects and crash reports directly to the GitHub repository.
 */

export interface GitHubIssuePayload {
  title?: string;
  errorMessage: string;
  errorStack?: string;
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

  const issueTitle = payload.title || `[User Bug]: ${payload.errorMessage.slice(0, 80)}`;

  // Construct structured Markdown body
  const bodySections: string[] = [];

  bodySections.push(`## 🐞 User Bug Report`);
  
  if (payload.userDescription && payload.userDescription.trim()) {
    bodySections.push(`### 💬 User Description\n> ${payload.userDescription.trim().replace(/\n/g, '\n> ')}`);
  } else {
    bodySections.push(`*No user comments provided.*`);
  }

  bodySections.push(`### 📋 Context & Environment
| Field | Value |
| :--- | :--- |
| **Page URL** | \`${payload.pageUrl || 'Unknown'}\` |
| **Severity** | \`${(payload.severity || 'high').toUpperCase()}\` |
| **Reported At** | \`${new Date().toISOString()}\` |
| **Reported By** | \`${payload.userEmail || 'Anonymous / Guest'}\` |
| **Client Agent** | \`${payload.browserInfo || 'Unknown'}\` |
`);

  bodySections.push(`### ⚠️ Error Message
\`\`\`text
${payload.errorMessage}
\`\`\`
`);

  if (payload.errorStack && payload.errorStack.trim()) {
    bodySections.push(`<details>
<summary><b>🔍 View Stack Trace</b></summary>

\`\`\`text
${payload.errorStack.trim()}
\`\`\`
</details>`);
  }

  bodySections.push(`\n---\n*Reported automatically from ProjectFlow application.*`);

  const issueBody = bodySections.join('\n\n');

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ProjectFlow-App',
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
