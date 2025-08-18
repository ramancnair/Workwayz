
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
import { PlusCircle, Edit, Trash2, GripVertical, Save } from 'lucide-react';
import { type Environment, type ImpactedSystem, type ImpactedSystemCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const summarySchema = z.object({
  summary: z.string().optional(),
});

const environmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required.'),
});

const systemSchema = z.object({
  name: z.string().min(1, 'System name is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Technology', 'Function']),
});

const systemCategories: ImpactedSystemCategory[] = ['Technology', 'Function'];

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
  const { 
    project,
    updateProject,
    environments, 
    addEnvironment, 
    deleteEnvironment, 
    updateEnvironmentOrder,
    impactedSystems,
    addImpactedSystem,
    updateImpactedSystem,
    deleteImpactedSystem,
  } = useProject();
  const { toast } = useToast();
  
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isSummarySubmitting, setIsSummarySubmitting] = useState(false);

  // Environment State
  const [isEnvDialogOpen, setIsEnvDialogOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [deletingEnv, setDeletingEnv] = useState<Environment | null>(null);
  const [isEnvSubmitting, setIsEnvSubmitting] = useState(false);
  
  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  // System State
  const [isSystemDialogOpen, setIsSystemDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ImpactedSystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<ImpactedSystem | null>(null);
  const [isSystemSubmitting, setIsSystemSubmitting] = useState(false);
  
  const summaryForm = useForm<z.infer<typeof summarySchema>>({
    resolver: zodResolver(summarySchema),
    defaultValues: { summary: project?.summary || '' },
  });

  const envForm = useForm<z.infer<typeof environmentSchema>>({
    resolver: zodResolver(environmentSchema),
    defaultValues: { name: '' },
  });
  
  const systemForm = useForm<z.infer<typeof systemSchema>>({
    resolver: zodResolver(systemSchema),
    defaultValues: { name: '', description: '', category: 'Technology' },
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  useEffect(() => {
    if (project) {
        summaryForm.reset({ summary: project.summary || '' });
        if (!project.summary) {
            setIsEditingSummary(true);
        }
    }
  }, [project, summaryForm]);

  useEffect(() => {
    if (isEnvDialogOpen) {
      if (editingEnv) {
        envForm.reset({ name: editingEnv.name });
      } else {
        envForm.reset({ name: '' });
      }
    }
  }, [isEnvDialogOpen, editingEnv, envForm]);
  
  useEffect(() => {
    if (isSystemDialogOpen) {
      if (editingSystem) {
        systemForm.reset(editingSystem);
      } else {
        systemForm.reset({ name: '', description: '', category: 'Technology' });
      }
    }
  }, [isSystemDialogOpen, editingSystem, systemForm]);
  
  const onSummarySubmit = async (values: z.infer<typeof summarySchema>) => {
    setIsSummarySubmitting(true);
    const success = await updateProject({ summary: values.summary });
    if (success) {
      toast({ title: 'Success', description: 'Project summary updated.' });
      setIsEditingSummary(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update project summary.' });
    }
    setIsSummarySubmitting(false);
  };

  const handleEnvDialogOpen = (environment: Environment | null) => {
    setEditingEnv(environment);
    setIsEnvDialogOpen(true);
  };
  
  const handleSystemDialogOpen = (system: ImpactedSystem | null) => {
    setEditingSystem(system);
    setIsSystemDialogOpen(true);
  };

  const handleEnvDeleteConfirm = async () => {
    if (!deletingEnv) return;
    const success = await deleteEnvironment(deletingEnv.id);
    if (success) {
      toast({ title: "Success", description: "Environment deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete environment." });
    }
    setDeletingEnv(null);
  };
  
  const handleSystemDeleteConfirm = async () => {
    if (!deletingSystem) return;
    const success = await deleteImpactedSystem(deletingSystem.id);
    if (success) {
      toast({ title: "Success", description: "Impacted system deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete impacted system." });
    }
    setDeletingSystem(null);
  };

  const onEnvSubmit = async (values: z.infer<typeof environmentSchema>) => {
    setIsEnvSubmitting(true);
    const success = editingEnv
      ? await updateEnvironment(editingEnv.id, values)
      : await addEnvironment(values);

    if (success) {
      toast({ title: "Success", description: `Environment ${editingEnv ? 'updated' : 'added'} successfully.` });
      setIsEnvDialogOpen(false);
      setEditingEnv(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingEnv ? 'update' : 'add'} environment.` });
    }
    setIsEnvSubmitting(false);
  };
  
  const onSystemSubmit = async (values: z.infer<typeof systemSchema>) => {
    setIsSystemSubmitting(true);
    const success = editingSystem
      ? await updateImpactedSystem(editingSystem.id, values)
      : await addImpactedSystem(values);

    if (success) {
      toast({ title: "Success", description: `System ${editingSystem ? 'updated' : 'added'} successfully.` });
      setIsSystemDialogOpen(false);
      setEditingSystem(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingSystem ? 'update' : 'add'} system.` });
    }
    setIsSystemSubmitting(false);
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
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <PageHeader title="Architecture" description="Manage impacted systems and testing environments for the project." />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Project Summary</CardTitle>
                  <CardDescription>A high-level overview of the project's goals and technical scope.</CardDescription>
              </div>
              {!isEditingSummary && (
                <Button onClick={() => setIsEditingSummary(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
          </CardHeader>
          <CardContent>
            {isEditingSummary ? (
               <Form {...summaryForm}>
                  <form onSubmit={summaryForm.handleSubmit(onSummarySubmit)} className="space-y-4">
                    <FormField
                      control={summaryForm.control}
                      name="summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea rows={5} placeholder="Enter project summary..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsEditingSummary(false)} disabled={isSummarySubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSummarySubmitting}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSummarySubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                  </form>
                </Form>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project?.summary || "No summary provided."}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Impacted Systems</CardTitle>
              <CardDescription>A list of systems that will be affected by this project.</CardDescription>
            </div>
             <Button onClick={() => handleSystemDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add System
            </Button>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Name</TableHead>
                  <TableHead className="w-[50%]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactedSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell className="font-medium">{system.name}</TableCell>
                    <TableCell>{system.description}</TableCell>
                    <TableCell>{system.category}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleSystemDialogOpen(system)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingSystem(system)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Environments</CardTitle>
                <CardDescription>Manage and reorder testing environments for the project.</CardDescription>
            </div>
             <Button onClick={() => handleEnvDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Environment
            </Button>
          </CardHeader>
          <CardContent className="p-4">
             <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortedEnvironments} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {sortedEnvironments.map((env) => (
                           <SortableItem key={env.id} environment={env} onDelete={setDeletingEnv} />
                        ))}
                    </div>
                </SortableContext>
              </DndContext>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEnvDialogOpen} onOpenChange={(open) => { setIsEnvDialogOpen(open); if (!open) setEditingEnv(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEnv ? 'Edit Environment' : 'Add New Environment'}</DialogTitle>
          </DialogHeader>
          <Form {...envForm}>
            <form onSubmit={envForm.handleSubmit(onEnvSubmit)} className="space-y-4">
              <FormField
                control={envForm.control}
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
                <Button type="submit" disabled={isEnvSubmitting}>
                  {isEnvSubmitting ? (editingEnv ? 'Saving...' : 'Creating...') : (editingEnv ? 'Save Changes' : 'Add Environment')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isSystemDialogOpen} onOpenChange={(open) => { setIsSystemDialogOpen(open); if (!open) setEditingSystem(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSystem ? 'Edit System' : 'Add New System'}</DialogTitle>
          </DialogHeader>
          <Form {...systemForm}>
            <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-4">
              <FormField
                control={systemForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Name</FormLabel>
                    <FormControl><Input placeholder="E.g., User Authentication API" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={systemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the system and its impact..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={systemForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {systemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <DialogFooter>
                <Button type="submit" disabled={isSystemSubmitting}>
                  {isSystemSubmitting ? (editingSystem ? 'Saving...' : 'Creating...') : (editingSystem ? 'Save Changes' : 'Create System')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingEnv} onOpenChange={(isOpen) => !isOpen && setDeletingEnv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the environment "{deletingEnv?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEnvDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!deletingSystem} onOpenChange={(isOpen) => !isOpen && setDeletingSystem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the system "{deletingSystem?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSystemDeleteConfirm}
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
