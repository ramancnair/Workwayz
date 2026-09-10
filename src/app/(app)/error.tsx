'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { ReportIssueModal } from '@/components/ReportIssueModal';

export default function AppSegmentErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Silently record the crash in local logs/ directory on mount
  useEffect(() => {
    try {
      const payload = {
        errorMessage: error.message || 'Unknown render failure',
        errorStack: error.stack || '',
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        silent: true, // Only logs to 30-day rotating logs/ without opening an issue yet
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
      // ignore telemetry errors
    }
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[65vh] p-6 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-5 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Something went wrong on this page
      </h2>

      <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">
        An error occurred while loading this view. The rest of the application is running normally, and you can freely navigate to any other section from the sidebar.
      </p>

      {error.digest && (
        <div className="mb-6 px-3 py-1 bg-muted/60 text-muted-foreground text-xs font-mono rounded border">
          Incident Digest: {error.digest}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>

        <Button asChild variant="secondary" className="gap-2">
          <Link href="/project-home">
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>
        </Button>

        <Button
          onClick={() => setReportModalOpen(true)}
          className="gap-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground"
        >
          <Bug className="w-4 h-4" /> Report Bug to GitHub
        </Button>
      </div>

      <ReportIssueModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        initialError={{
          message: error.message || 'Render crash in (app) segment',
          stack: error.stack,
        }}
      />
    </div>
  );
}
