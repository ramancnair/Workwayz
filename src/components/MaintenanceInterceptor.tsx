'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Settings, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MaintenanceInterceptor() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // 1. Listen for explicit update start from Admin UI (same tab)
    const handleUpdateStart = () => setIsMaintenance(true);
    window.addEventListener('pf_maintenance_start', handleUpdateStart);

    // 2. Listen for storage events (if update started in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pf_system_updating' && e.newValue === 'true') {
        setIsMaintenance(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Intercept global fetch to catch 503s
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 503) {
        setIsMaintenance(true);
      }
      return response;
    };

    // 4. Also check on tab focus (visibility change) - passive check
    const checkOnFocus = async () => {
      if (isMaintenance) return; // Already in maintenance
      try {
        const res = await originalFetch('/api/health/maintenance', { headers: { 'Cache-Control': 'no-cache' } });
        if (res.status === 503) setIsMaintenance(true);
      } catch (e) {
        // Ignore fetch errors in passive check
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkOnFocus();
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkOnFocus);
    
    // Initial passive check on mount
    checkOnFocus();

    return () => {
      window.removeEventListener('pf_maintenance_start', handleUpdateStart);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkOnFocus);
      window.fetch = originalFetch;
    };
  }, [isMaintenance]);

  // Active polling ONLY starts when we enter maintenance mode
  useEffect(() => {
    if (!isMaintenance) return;

    const checkRecovery = async () => {
      try {
        const res = await fetch('/api/health/maintenance', {
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (res.status === 200) {
          // Server is back!
          localStorage.removeItem('pf_system_updating');
          window.location.reload();
        }
      } catch (err) {
        setReconnectAttempts(prev => prev + 1);
      }
    };

    // Poll aggressively (every 3 seconds) since we are actively waiting for reboot
    const interval = setInterval(checkRecovery, 3000);
    return () => clearInterval(interval);
  }, [isMaintenance]);

  if (!isMaintenance) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-all duration-300">
      <div className="flex flex-col items-center justify-center text-center max-w-md p-8 bg-card border border-border shadow-2xl rounded-2xl animate-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-primary/5">
          <Settings className="w-8 h-8 text-primary animate-[spin_4s_linear_infinite]" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-3">
          System Update in Progress
        </h1>
        
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          ProjectFlow is currently installing a software update. Please do not close or refresh this page. The system will automatically reload once the update is complete.
        </p>

        <div className="flex items-center justify-center gap-3 px-4 py-2 bg-muted rounded-full">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {reconnectAttempts > 3 ? 'Waiting for server to restart...' : 'Installing...'}
          </span>
        </div>

        {reconnectAttempts > 10 && (
          <div className="mt-6 flex items-start gap-2 p-3 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-left text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              The server is taking longer than expected to restart. You may try refreshing manually in a few minutes if this screen persists.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
