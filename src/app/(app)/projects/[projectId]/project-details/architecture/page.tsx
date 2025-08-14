
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, GripVertical } from 'lucide-react';
import { type Environment } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
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

const environmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required.'),
});

function SortableItem({ environment, onDelete }: { environment: Environment, onDelete: (environment: Environment) => void }) {
    const { updateEnvironment } = useProject();
    const { toast } = useToast();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: environment.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const handleRenameEnvironment = async (id: string, newName: string) => {
        if (!newName) {
          toast({ variant: 'destructive', title: 'Error', description: 'Environment name cannot be empty.' });
          return;
        }
        const success = await updateEnvironment(id, { name: newName });
        if (success) {
          toast({ title: 'Success', description: 'Environment renamed.' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not rename environment.' });
        }
    };
    
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-background p-2 rounded-md border">
            <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab" aria-label="Drag to reorder">
                <GripVertical className="h-5 w-5" />
            </Button>
            <Input
              defaultValue={environment.name}
              onBlur={(e) => {
                 if (e.target.value !== environment.name) {
                   handleRenameEnvironment(environment.id, e.target.value)
                 }
              }}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(environment)}
              aria-label="Delete environment"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}


export default function EnvironmentsPage() {
  const { environments, addEnvironment, deleteEnvironment, updateEnvironmentOrder } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [deletingEnvironment, setDeletingEnvironment] = useState<Environment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  const form = useForm<z.infer<typeof environmentSchema>>({
    resolver: zodResolver(environmentSchema),
    defaultValues: { name: '' },
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  useEffect(() => {
    if (isDialogOpen) {
      if (editingEnvironment) {
        form.reset({ name: editingEnvironment.name });
      } else {
        form.reset({ name: '' });
      }
    }
  }, [isDialogOpen, editingEnvironment, form]);

  const handleDialogOpen = (environment: Environment | null) => {
    setEditingEnvironment(environment);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEnvironment) return;
    const success = await deleteEnvironment(deletingEnvironment.id);
    if (success) {
      toast({ title: "Success", description: "Environment deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete environment." });
    }
    setDeletingEnvironment(null);
  };

  const onSubmit = async (values: z.infer<typeof environmentSchema>) => {
    setIsSubmitting(true);
    const success = editingEnvironment
      ? await updateEnvironment(editingEnvironment.id, values)
      : await addEnvironment(values);

    if (success) {
      toast({ title: "Success", description: `Environment ${editingEnvironment ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingEnvironment(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingEnvironment ? 'update' : 'add'} environment.` });
    }
    setIsSubmitting(false);
  };
  
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedEnvironments.findIndex((c) => c.id === active.id);
      const newIndex = sortedEnvironments.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        updateEnvironmentOrder(oldIndex, newIndex);
      }
    }
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Architecture" description="Manage and reorder common testing environments for the project.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Environment
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="p-4">
             <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortedEnvironments} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {sortedEnvironments.map((env) => (
                           <SortableItem key={env.id} environment={env} onDelete={setDeletingEnvironment} />
                        ))}
                    </div>
                </SortableContext>
              </DndContext>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingEnvironment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEnvironment ? 'Edit Environment' : 'Add New Environment'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Staging" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingEnvironment ? 'Saving...' : 'Creating...') : (editingEnvironment ? 'Save Changes' : 'Add Environment')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingEnvironment} onOpenChange={(isOpen) => !isOpen && setDeletingEnvironment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the environment "{deletingEnvironment?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
