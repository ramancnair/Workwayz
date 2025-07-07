'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/kanban/TaskCard';
import { tasks as initialTasks } from '@/lib/mock-data';
import type { Task, TaskStatus } from '@/types';
import { PlusCircle, Columns, ChevronDown, ChevronUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const columns: TaskStatus[] = ['To Do', 'In Development', 'In QA', 'Complete'];

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
      <PageHeader title="Kanban Board" description="Drag and drop tasks to change their status.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </PageHeader>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {columns.map((status) => (
          <div key={status} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Columns className="mr-2 h-5 w-5" />
              {status}
              <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-sm">
                {tasks.filter((task) => task.status === status).length}
              </span>
            </h3>
            <div className="flex-1 space-y-4 overflow-y-auto">
              {tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <TaskCard key={task.id} task={task}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Move to
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {columns
                          .filter((col) => col !== task.status)
                          .map((col) => (
                            <DropdownMenuItem key={col} onClick={() => moveTask(task.id, col)}>
                              {col}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TaskCard>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
