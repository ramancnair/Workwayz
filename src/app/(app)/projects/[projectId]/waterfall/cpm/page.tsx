'use client';

import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CpmChart } from '@/components/gantt/CpmChart';

export default function CriticalPathMethodPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        title="Critical Path Method (CPM)"
        description="Analyze the longest sequence of dependent tasks and measure the time required to complete the project."
      />
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <CpmChart />
      </div>
    </div>
  );
}
