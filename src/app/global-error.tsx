'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { ReportIssueModal } from '@/components/ReportIssueModal';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string };
  reset: () => void;
}) {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const errorName = error.name || 'FatalError';
  const errorCode = error.digest || (error as any).code || '';
  const fullMessage = error.name && !error.message?.startsWith(error.name)
    ? `${error.name}: ${error.message || 'Root layout failure'}`
    : error.message || 'Fatal Root Application Error';

  useEffect(() => {
    try {
      const payload = {
        errorName,
        errorCode,
        errorMessage: fullMessage,
        errorStack: error.stack || '',
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        silent: true,
        submitToGitHub: false,
      };

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/report-issue', JSON.stringify(payload));
      } else {
        fetch('/api/report-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [error, errorName, errorCode, fullMessage]);

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full p-8 border rounded-2xl bg-card shadow-lg text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">Application Error</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Workwayz encountered a critical issue while initializing the root layout.
          </p>

          {error.digest && (
            <div className="mb-6 px-3 py-1 bg-muted/60 text-muted-foreground text-xs font-mono rounded border">
              Incident Digest: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Button onClick={() => reset()} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Reload App
            </Button>
            <Button
              onClick={() => setReportModalOpen(true)}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Bug className="w-4 h-4" /> Report Issue
            </Button>
          </div>

          <ReportIssueModal
            open={reportModalOpen}
            onOpenChange={setReportModalOpen}
            initialError={{
              name: errorName,
              code: errorCode,
              digest: error.digest,
              message: fullMessage,
              stack: error.stack,
            }}
          />
        </div>
      </body>
    </html>
  );
}
