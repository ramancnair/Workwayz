'use client';

import { useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { GanttChart, GanttChartRef } from '@/components/gantt/GanttChart';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';

export default function ProjectPlanPage() {
  const ganttRef = useRef<GanttChartRef>(null);
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col min-w-0 overflow-hidden">
      <PageHeader 
        title="Project Plan" 
        description="View and manage the project timeline using a Gantt chart."
      >
        <Button onClick={() => ganttRef.current?.openAutogenDialog()}>
          <Wand2 className="mr-2 h-4 w-4" /> Autogen Dates
        </Button>
      </PageHeader>
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <GanttChart ref={ganttRef} />
      </div>
    </div>
  );
}
