'use client';

import { PageHeader } from '@/components/PageHeader';
import { GanttChart } from '@/components/gantt/GanttChart';

export default function ProjectPlanPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col min-w-0">
      <PageHeader 
        title="Project Plan" 
        description="View and manage the project timeline using a Gantt chart."
      />
      <div className="flex-1 min-h-[500px] min-w-0">
        <GanttChart />
      </div>
    </div>
  );
}
