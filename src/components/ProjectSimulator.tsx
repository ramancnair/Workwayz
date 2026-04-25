"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '@/context/ProjectContext';
import { Play, Square } from 'lucide-react';
import { addDays } from 'date-fns';
import { Priority } from '@/types';

export function ProjectSimulator() {
  const { stories, sprints, kanbanColumns, updateStory, testDate, setTestDate } = useProject();
  const [percentage, setPercentage] = useState<string>('100');
  const [isSimulating, setIsSimulating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const subTasks = stories.filter(s => s.itemType === 'Sub Task' && !s.isDeleted);
  const orderedColumns = [...kanbanColumns].sort((a, b) => a.order - b.order);
  const doneColumn = orderedColumns.find(c => c.isDoneColumn);

  // Simulation loop
  useEffect(() => {
    if (isSimulating) {
      intervalRef.current = setInterval(() => {
        if (!doneColumn) {
          setIsSimulating(false);
          return;
        }

        const targetCount = Math.ceil(subTasks.length * (parseInt(percentage) / 100));
        const doneCount = subTasks.filter(s => s.status === doneColumn.name).length;

        if (doneCount >= targetCount || targetCount === 0) {
          setIsSimulating(false);
          return;
        }

        const priorityOrder: Record<string, number> = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Backburner': 4 };
        
        const getSprintDate = (sprintId?: string | null) => {
           if (!sprintId) return new Date('2099-01-01').getTime();
           const sprint = sprints.find(s => s.id === sprintId);
           return sprint?.startDate ? new Date(sprint.startDate).getTime() : new Date('2099-01-01').getTime();
        };

        const getPriorityVal = (priority?: Priority) => {
           if (!priority) return 5;
           return priorityOrder[priority] ?? 5;
        };

        const incompleteSubtasks = subTasks.filter(s => s.status !== doneColumn.name);
        
        incompleteSubtasks.sort((a, b) => {
           const sprintA = getSprintDate(a.sprintId);
           const sprintB = getSprintDate(b.sprintId);
           if (sprintA !== sprintB) return sprintA - sprintB;
           return getPriorityVal(a.priority) - getPriorityVal(b.priority);
        });

        // Take up to 5 tasks per second for speed
        const tasksToMove = incompleteSubtasks.slice(0, 5);

        tasksToMove.forEach(task => {
            const currentIndex = orderedColumns.findIndex(c => c.name === task.status);
            if (currentIndex >= 0 && currentIndex < orderedColumns.length - 1) {
                const nextColumn = orderedColumns[currentIndex + 1];
                updateStory(task.id, { status: nextColumn.name });
            } else if (currentIndex === -1 && orderedColumns.length > 0) {
                // If status is somehow invalid, move to the first valid column
                updateStory(task.id, { status: orderedColumns[0].name });
            }
        });

        // Advance test date by 1 day per second
        setTestDate(addDays(testDate || new Date(), 1));

      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, percentage, subTasks, orderedColumns, doneColumn, sprints, updateStory, testDate, setTestDate]);

  const handleStartStop = () => {
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
