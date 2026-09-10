import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createGitHubIssue } from '@/lib/github-reporter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      errorMessage = 'Unknown application error',
      errorStack = '',
      userDescription = '',
      pageUrl = '',
      browserInfo = '',
      severity = 'high',
      userEmail = '',
      silent = false,
      submitToGitHub = true,
      labels = ['user-reported', 'bug'],
    } = body;

    const userAgent = req.headers.get('user-agent') || browserInfo || 'Unknown';
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Always record in our local 30-day rotating log file
    logger.error(`[Application Error Report] ${errorMessage}`, {
      errorMessage,
      errorStack,
      userDescription,
      pageUrl,
      userAgent,
      clientIp,
      userEmail,
      severity,
      timestamp: new Date().toISOString(),
      submittedToGitHub: submitToGitHub && !silent,
    });

    let gitHubResult = null;

    // 2. Submit to GitHub Issues if requested and not a silent telemetry ping
    if (submitToGitHub && !silent) {
      gitHubResult = await createGitHubIssue({
        errorMessage,
        errorStack,
        userDescription,
        pageUrl,
        browserInfo: userAgent,
        severity,
        userEmail,
        labels,
      });

      if (gitHubResult.success) {
        logger.info(`GitHub Issue #${gitHubResult.issueNumber} created for error`, {
          issueUrl: gitHubResult.issueUrl,
        });
      } else {
        logger.warn(`Failed to create GitHub Issue: ${gitHubResult.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      loggedLocally: true,
      gitHubIssue: gitHubResult?.success
        ? {
            number: gitHubResult.issueNumber,
            url: gitHubResult.issueUrl,
          }
        : null,
      gitHubError: gitHubResult && !gitHubResult.success ? gitHubResult.error : null,
    });
  } catch (err: any) {
    logger.error('Error handling /api/report-issue request', {
      error: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process error report',
      },
      { status: 500 }
    );
  }
}
