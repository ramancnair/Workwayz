'use client';

import { useEffect, useRef } from 'react';

/**
 * GlobalErrorReporter
 * Catches unhandled browser exceptions and promise rejections across all pages,
 * sending silent diagnostic telemetry to the local 30-day rotating logs directory.
 */
export function GlobalErrorReporter() {
  const lastErrorRef = useRef<{ message: string; timestamp: number }>({
    message: '',
    timestamp: 0,
  });

  useEffect(() => {
    const sendLog = (message: string, stack?: string) => {
      const now = Date.now();
      // De-duplicate identical errors firing repeatedly within 5 seconds
      if (
        lastErrorRef.current.message === message &&
        now - lastErrorRef.current.timestamp < 5000
      ) {
        return;
      }
      lastErrorRef.current = { message, timestamp: now };

      const payload = {
        errorMessage: message,
        errorStack: stack || '',
        pageUrl: window.location.href,
        browserInfo: navigator.userAgent,
        silent: true, // Only archive to logs/, don't create GitHub ticket for unhandled async warnings
        submitToGitHub: false,
      };

      try {
        if (navigator.sendBeacon) {
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
        // Safe fallback - avoid recursive errors
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      // Ignore benign browser extension noise or next-themes script tag notice
      if (
        event.filename?.includes('chrome-extension://') ||
        event.filename?.includes('moz-extension://') ||
        event.message?.includes('Encountered a script tag')
      ) {
        return;
      }
      sendLog(
        event.message || 'Window runtime exception',
        event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let msg = 'Unhandled Promise Rejection';
      let stack = '';

      if (reason instanceof Error) {
        msg = reason.message;
        stack = reason.stack || '';
      } else if (typeof reason === 'string') {
        msg = reason;
      } else {
        try {
          msg = JSON.stringify(reason);
        } catch {
          msg = String(reason);
        }
      }

      sendLog(`Unhandled Promise Rejection: ${msg}`, stack);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
