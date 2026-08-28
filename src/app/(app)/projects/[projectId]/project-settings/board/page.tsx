'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, PlusCircle, GripVertical } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import type { KanbanColumn } from '@/types';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

const swimlaneSchema = z.object({
  name: z.string().min(1, 'Swimlane name is required'),
});

function SortableItem({ column }: { column: KanbanColumn }) {
    const { kanbanColumns, updateKanbanColumn, deleteKanbanColumn } = useProject();
    const { toast } = useToast();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const handleDeleteSwimlane = async (column: KanbanColumn) => {
        if (kanbanColumns.length <= 3) {
          toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'You must have at least 3 swimlanes.' });
          return;
        }
         if (column.isDefault) {
          toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'Cannot delete a default swimlane.' });
          return;
        }
        const success = await deleteKanbanColumn(column.id);
        if (success) {
          toast({ title: 'Success', description: 'Swimlane deleted.' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not delete swimlane.' });
        }
    };
    
    const handleRenameSwimlane = async (id: string, newName: string) => {
        if (!newName) {
          toast({ variant: 'destructive', title: 'Error', description: 'Swimlane name cannot be empty.' });
          return;
        }
        const trimmed = newName.trim();
        const isDuplicate = kanbanColumns.some(c => c.id !== id && c.name.trim().toLowerCase() === trimmed.toLowerCase());
        if (isDuplicate) {
          toast({ variant: 'destructive', title: 'Duplicate Lane', description: `A lane named "${trimmed}" already exists.` });
          return;
        }
        const success = await updateKanbanColumn(id, { name: trimmed });
        if (success) {
          toast({ title: 'Success', description: 'Swimlane renamed.' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not rename swimlane.' });
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2 p-2 rounded-md border", column.isDefault ? 'bg-muted' : 'bg-background' )}>
            <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab" aria-label="Drag to reorder">
                <GripVertical className="h-5 w-5" />
            </Button>
            <Input
              defaultValue={column.name}
              onBlur={(e) => {
                 if (e.target.value !== column.name) {
                   handleRenameSwimlane(column.id, e.target.value)
                 }
              }}
              className={cn("flex-1", column.isDefault && "bg-muted/50 border-none text-muted-foreground")}
              readOnly={column.isDefault}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteSwimlane(column)}
              disabled={kanbanColumns.length <= 3 || column.isDefault}
              aria-label="Delete swimlane"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export default function BoardSettingsPage() {
  const { kanbanColumns, addKanbanColumn, updateKanbanColumnOrder } = useProject();
  const { toast } = useToast();

  const sortedColumns = [...kanbanColumns].sort((a, b) => a.order - b.order);

  const newSwimlaneForm = useForm<z.infer<typeof swimlaneSchema>>({
    resolver: zodResolver(swimlaneSchema),
    defaultValues: { name: '' },
  });

  const sensors = useSensors(
    useSensor(PointerSensor)
  );
  
  const handleAddNewSwimlane = async (values: z.infer<typeof swimlaneSchema>) => {
    const nameToCheck = values.name.trim();
    const isDuplicate = kanbanColumns.some(c => c.name.trim().toLowerCase() === nameToCheck.toLowerCase());
    if (isDuplicate) {
      toast({ variant: 'destructive', title: 'Duplicate Lane', description: `A lane named "${nameToCheck}" already exists.` });
      return;
    }
    const newOrder = kanbanColumns.length > 0 ? Math.max(...kanbanColumns.map(c => c.order)) + 1 : 0;
    const success = await addKanbanColumn({
      name: nameToCheck,
      order: newOrder,
    });

    if (success) {
      toast({ title: 'Success', description: 'New swimlane added.' });
      newSwimlaneForm.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add swimlane.' });
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedColumns.findIndex((c) => c.id === active.id);
      const newIndex = sortedColumns.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        updateKanbanColumnOrder(oldIndex, newIndex);
      }
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Project Settings" description="Manage your project settings." />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Board Settings</CardTitle>
            <CardDescription>
              Drag to reorder, edit names, add, or remove columns for your Kanban board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-medium">Current Swimlanes</h4>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortedColumns} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {sortedColumns.map((column) => (
                           <SortableItem key={column.id} column={column} />
                        ))}
                    </div>
                </SortableContext>
              </DndContext>
              
              <div className="pt-4">
                <h4 className="font-medium">Add New Swimlane</h4>
                <Form {...newSwimlaneForm}>
                  <form onSubmit={newSwimlaneForm.handleSubmit(handleAddNewSwimlane)} className="flex items-start gap-2 mt-2">
                    <FormField
                      control={newSwimlaneForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="New swimlane name..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
