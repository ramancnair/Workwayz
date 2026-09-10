'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { ReportIssueModal } from '@/components/ReportIssueModal';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    try {
      const payload = {
        errorMessage: error.message || 'Root global layout error',
        errorStack: error.stack || '',
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        silent: true,
        submitToGitHub: false,
      };

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/report-issue', JSON.stringify(payload));
      }
    } catch {
      // ignore
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full p-8 border rounded-2xl bg-card shadow-lg text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">Application Error</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            ProjectFlow encountered a critical issue while initializing the root layout.
          </p>

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
              message: error.message || 'Fatal Root Application Error',
              stack: error.stack,
            }}
          />
        </div>
      </body>
    </html>
  );
}
