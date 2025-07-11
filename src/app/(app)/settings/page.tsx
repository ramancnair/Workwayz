
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, PlusCircle } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import type { KanbanColumn } from '@/types';

const swimlaneSchema = z.object({
  name: z.string().min(1, 'Swimlane name is required'),
});

const settingsSchema = z.object({
  swimlanes: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Name is required'),
  })).min(3, 'You must have at least 3 swimlanes.'),
});

export default function SettingsPage() {
  const { kanbanColumns, updateKanbanColumn, addKanbanColumn, deleteKanbanColumn } = useProject();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedColumns = [...kanbanColumns].sort((a, b) => a.order - b.order);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    values: { swimlanes: sortedColumns },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'swimlanes',
  });

  const newSwimlaneForm = useForm<z.infer<typeof swimlaneSchema>>({
    resolver: zodResolver(swimlaneSchema),
    defaultValues: { name: '' },
  });

  const handleAddNewSwimlane = async (values: z.infer<typeof swimlaneSchema>) => {
    const newOrder = kanbanColumns.length > 0 ? Math.max(...kanbanColumns.map(c => c.order)) + 1 : 0;
    const success = await addKanbanColumn({
      name: values.name,
      order: newOrder,
    });

    if (success) {
      toast({ title: 'Success', description: 'New swimlane added.' });
      newSwimlaneForm.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add swimlane.' });
    }
  };

  const handleRenameSwimlane = async (id: string, newName: string) => {
    if (!newName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Swimlane name cannot be empty.' });
      return;
    }
    const success = await updateKanbanColumn(id, { name: newName });
    if (success) {
      toast({ title: 'Success', description: 'Swimlane renamed.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not rename swimlane.' });
    }
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
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Settings" description="Manage your project settings." />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kanban Board Swimlanes</CardTitle>
            <CardDescription>
              Add, remove, or rename the columns (swimlanes) for your Kanban board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h4 className="font-medium">Current Swimlanes</h4>
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const originalColumn = sortedColumns[index];
                  return (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        {...form.register(`swimlanes.${index}.name`)}
                        onBlur={(e) => {
                           if (originalColumn && e.target.value !== originalColumn.name) {
                             handleRenameSwimlane(originalColumn.id, e.target.value)
                           }
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => originalColumn && handleDeleteSwimlane(originalColumn)}
                        disabled={kanbanColumns.length <= 3 || (originalColumn && originalColumn.isDefault)}
                        aria-label="Delete swimlane"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                )})}
                 {form.formState.errors.swimlanes && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.swimlanes?.message}</p>
                )}
                 {form.formState.errors.swimlanes?.root && (
                    <p className="text-sm font-medium text-destructive">{form.formState.errors.swimlanes.root.message}</p>
                )}
              </div>
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
