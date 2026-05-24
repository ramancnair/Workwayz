"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '@/context/ProjectContext';
import { Play, Square } from 'lucide-react';
import { addDays, differenceInDays } from 'date-fns';

export function ProjectSimulator() {
  const { stories, sprints, kanbanColumns, updateStory, testDate, setTestDate, project } = useProject();
  const [percentage, setPercentage] = useState<string>('100');
  const [isSimulating, setIsSimulating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate Sub Tasks, Feature Changes, Tasks, and Bugs
  const simulatedItems = stories.filter(s => 
    (s.itemType === 'Sub Task' || s.itemType === 'Feature Change' || s.itemType === 'Task' || s.itemType === 'Bug') && !s.isDeleted
  );
  const orderedColumns = [...kanbanColumns].sort((a, b) => a.order - b.order);
  const doneColumn = orderedColumns.find(c => c.isDoneColumn);

  // Helper to compute overall project start/end timeline
  const getProjectTimeline = () => {
    const sprintDates = sprints
      .filter(s => s.startDate && s.endDate)
      .map(s => ({
        start: new Date(s.startDate!),
        end: new Date(s.endDate!)
      }));

    let start = project?.startDate ? new Date(project.startDate) : null;
    let end = project?.endDate ? new Date(project.endDate) : null;

    if (sprintDates.length > 0) {
      sprintDates.sort((a, b) => a.start.getTime() - b.start.getTime());
      if (!start) start = sprintDates[0].start;
      if (!end) end = sprintDates[sprintDates.length - 1].end;
    }

    // Fallbacks if no dates are defined anywhere
    if (!start) start = new Date();
    if (!end) end = addDays(start, 30);

    return { start, end };
  };

  // Simulation loop
  useEffect(() => {
    if (isSimulating) {
      intervalRef.current = setInterval(() => {
        if (!doneColumn || orderedColumns.length === 0) {
          setIsSimulating(false);
          return;
        }

        const { start, end } = getProjectTimeline();
        const totalDurationMs = end.getTime() - start.getTime();
        const targetEnd = new Date(start.getTime() + totalDurationMs * (parseInt(percentage) / 100));

        const currentTestDate = testDate || start;

        // If we reached or passed the target end date, stop simulation
        if (currentTestDate >= targetEnd) {
          setIsSimulating(false);
          return;
        }

        // Calculate step size in days to complete in approx 15 seconds
        const totalDays = Math.max(1, differenceInDays(targetEnd, start));
        const stepDays = Math.max(1, Math.ceil(totalDays / 15));
        const nextTestDate = new Date(Math.min(targetEnd.getTime(), currentTestDate.getTime() + stepDays * 24 * 60 * 60 * 1000));

        // Find all simulated items needing status update at this next test date
        const tasksNeedingUpdate: { id: string; targetStatus: string }[] = [];

        simulatedItems.forEach(task => {
          const sprint = sprints.find(s => s.id === task.sprintId);
          const taskStart = sprint?.startDate ? new Date(sprint.startDate) : start;
          const taskEnd = sprint?.endDate ? new Date(sprint.endDate) : end;

          let targetStatus = orderedColumns[0].name;

          if (nextTestDate >= taskEnd) {
            targetStatus = orderedColumns[orderedColumns.length - 1].name;
          } else if (nextTestDate >= taskStart) {
            const fraction = (nextTestDate.getTime() - taskStart.getTime()) / (taskEnd.getTime() - taskStart.getTime());
            const targetColIndex = Math.floor(fraction * (orderedColumns.length - 1));
            targetStatus = orderedColumns[Math.min(orderedColumns.length - 1, Math.max(0, targetColIndex))].name;
          }

          if (task.status !== targetStatus) {
            tasksNeedingUpdate.push({ id: task.id, targetStatus });
          }
        });

        // Update up to 8 tasks per tick to keep DB writes lightweight and smooth
        const batchToUpdate = tasksNeedingUpdate.slice(0, 8);
        batchToUpdate.forEach(item => {
          updateStory(item.id, { status: item.targetStatus });
        });

        // Advance test date
        setTestDate(nextTestDate);

      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, percentage, simulatedItems, orderedColumns, doneColumn, sprints, updateStory, testDate, setTestDate, project]);

  const handleStartStop = () => {
    if (!isSimulating) {
      // Starting: reset date to the start of project timeline
      const { start } = getProjectTimeline();
      setTestDate(start);
    }
    setIsSimulating(!isSimulating);
  };

  return (
    <div className="flex flex-col space-y-2 mb-4 bg-muted/30 p-2 rounded-lg border border-border">
      <label className="text-xs font-semibold text-sidebar-foreground/70">Project Simulation</label>
      <div className="flex items-center gap-2">
        <Select value={percentage} onValueChange={setPercentage} disabled={isSimulating}>
          <SelectTrigger className="h-8 text-xs w-[75px]">
            <SelectValue placeholder="%" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25%</SelectItem>
            <SelectItem value="50">50%</SelectItem>
            <SelectItem value="75">75%</SelectItem>
            <SelectItem value="100">100%</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant={isSimulating ? "destructive" : "default"} 
          size="sm" 
          className="h-8 flex-1 text-xs"
          onClick={handleStartStop}
        >
          {isSimulating ? <Square className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
          {isSimulating ? "Stop" : "Run"}
        </Button>
      </div>
    </div>
  );
}
