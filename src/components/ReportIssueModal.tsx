'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Bug, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';

interface ReportIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialError?: {
    name?: string;
    code?: string;
    digest?: string;
    message: string;
    stack?: string;
    componentStack?: string;
  } | null;
}

export function ReportIssueModal({
  open,
  onOpenChange,
  initialError,
}: ReportIssueModalProps) {
  const [userDescription, setUserDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    success: boolean;
    issueNumber?: number;
    issueUrl?: string;
    message?: string;
  } | null>(null);

  // Autofill user email if stored in localStorage
  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem('projectflow_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.email) setUserEmail(parsed.email);
        }
      } catch {
        // ignore
      }
      setSubmittedResult(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const errorName = initialError?.name || '';
      const errorCode = initialError?.code || initialError?.digest || '';
      const errorMessage = initialError?.message || 'Manual user-reported issue';
      const fullErrorMessage = errorName && !errorMessage.startsWith(errorName)
        ? `${errorName}: ${errorMessage}`
        : errorMessage;

      const payload = {
        errorName,
        errorCode,
        errorMessage: fullErrorMessage,
        errorStack: initialError?.stack || '',
        componentStack: initialError?.componentStack || '',
        userDescription,
        userEmail,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        submitToGitHub: true,
        labels: ['user-reported', 'bug'],
      };

      const res = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setSubmittedResult({
          success: true,
          issueNumber: data.gitHubIssue?.number,
          issueUrl: data.gitHubIssue?.url,
          message: data.gitHubIssue
            ? `Issue #${data.gitHubIssue.number} successfully created on GitHub!`
            : 'Error report saved to server diagnostic logs.',
        });
      } else {
        setSubmittedResult({
          success: false,
          message: data.error || 'Failed to submit report. Please try again.',
        });
      }
    } catch (err: any) {
      setSubmittedResult({
        success: false,
        message: err.message || 'Network error occurred while submitting.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUserDescription('');
    setSubmittedResult(null);
    setShowTechnicalDetails(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bug className="w-5 h-5" />
            </div>
            <DialogTitle>Report a Bug / Issue</DialogTitle>
          </div>
          <DialogDescription>
            Help us fix this problem. Submitting this will log the error in our diagnostic logs and create a tracked bug on our team&apos;s GitHub project board.
          </DialogDescription>
        </DialogHeader>

        {submittedResult ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            {submittedResult.success ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-semibold">Thank You! Report Submitted</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {submittedResult.message}
                </p>
                {submittedResult.issueUrl && (
                  <Button asChild variant="outline" className="mt-2 gap-2">
                    <a
                      href={submittedResult.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Issue #{submittedResult.issueNumber} on GitHub
                    </a>
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-semibold">Submission Failed</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {submittedResult.message}
                </p>
              </>
            )}

            <DialogFooter className="w-full mt-4">
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-description">
                What were you trying to do? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="user-description"
                placeholder="e.g., I clicked save on the project details page after changing the milestone date..."
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                rows={3}
                required
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email">Your Email (Optional)</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="name@company.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>

            {initialError && (
              <div className="border rounded-lg p-3 bg-muted/40 space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center justify-between w-full font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    Captured Technical Details
                  </span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="space-y-2 pt-2 border-t mt-1 font-mono text-[11px] text-muted-foreground overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-destructive">
                        {initialError.name && !initialError.message.startsWith(initialError.name)
                          ? `${initialError.name}: `
                          : ''}
                        {initialError.message}
                      </p>
                      {(initialError.digest || initialError.code) && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border">
                          Code: {initialError.code || initialError.digest}
                        </span>
                      )}
                    </div>
                    {initialError.stack && (
                      <pre className="p-2 bg-background rounded border max-h-40 overflow-x-auto overflow-y-auto whitespace-pre text-[10px] leading-relaxed">
                        {initialError.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !userDescription.trim()} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting to GitHub...
                  </>
                ) : (
                  <>
                    <Bug className="w-4 h-4" />
                    Submit Bug Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
