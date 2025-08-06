

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Save } from 'lucide-react';
import { type ImpactedSystem, type ImpactedSystemCategory } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

const estimationSchema = z.object({
  summary: z.string().optional(),
});

const systemSchema = z.object({
  name: z.string().min(1, 'System name is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Technology', 'Function']),
  estimate: z.coerce.number().min(1, 'Estimation must be at least 1.'),
});

const categories: ImpactedSystemCategory[] = ['Technology', 'Function'];

export default function ProjectPage() {
  const { 
    project, 
    updateProject, 
    impactedSystems, 
    addImpactedSystem, 
    updateImpactedSystem, 
    deleteImpactedSystem 
  } = useProject();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(true);
  
  const [isSystemDialogOpen, setIsSystemDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ImpactedSystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<ImpactedSystem | null>(null);
  const [isSystemSubmitting, setIsSystemSubmitting] = useState(false);

  const estimationForm = useForm<z.infer<typeof estimationSchema>>({
    resolver: zodResolver(estimationSchema),
  });

  const systemForm = useForm<z.infer<typeof systemSchema>>({
    resolver: zodResolver(systemSchema),
    defaultValues: { name: '', description: '', category: 'Technology', estimate: 0 },
  });

  useEffect(() => {
    if (project) {
      estimationForm.reset({ summary: project.summary || '' });
      if (project.summary) {
        setIsEditingSummary(false);
      }
    }
  }, [project, estimationForm]);

  useEffect(() => {
    if (isSystemDialogOpen) {
      if (editingSystem) {
        systemForm.reset({
          ...editingSystem,
          estimate: editingSystem.estimate || 0,
        });
      } else {
        systemForm.reset({ name: '', description: '', category: 'Technology', estimate: 0 });
      }
    }
  }, [isSystemDialogOpen, editingSystem, systemForm]);

  const onSummarySubmit = async (values: z.infer<typeof estimationSchema>) => {
    setIsSubmitting(true);
    try {
      if (project && project.summary !== values.summary) {
        const projectSuccess = await updateProject({ summary: values.summary });
        if (projectSuccess) {
          toast({ title: "Success", description: "Project summary saved successfully." });
          setIsEditingSummary(false);
        } else {
          toast({ variant: "destructive", title: "Failure", description: "Failed to save summary." });
        }
      } else {
        toast({ title: "No Changes", description: "No changes to save." });
        setIsEditingSummary(false);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An error occurred while saving." });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSystemDialogOpen = (system: ImpactedSystem | null) => {
    setEditingSystem(system);
    setIsSystemDialogOpen(true);
  };

  const handleDeleteSystemConfirm = async () => {
    if (!deletingSystem) return;
    const success = await deleteImpactedSystem(deletingSystem.id);
    if (success) {
      toast({ title: "Success", description: "Impacted system deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete impacted system." });
    }
    setDeletingSystem(null);
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

  const totalEstimate = impactedSystems.reduce((acc, system) => acc + (system.estimate || 0), 0);

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Summary" description="Define the project summary and impacted systems." />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Project Summary</CardTitle>
                  <CardDescription>Provide a brief overview of the project's goals and scope.</CardDescription>
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
               <Form {...estimationForm}>
                  <form onSubmit={estimationForm.handleSubmit(onSummarySubmit)} className="space-y-4">
                    <FormField
                      control={estimationForm.control}
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
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                  </form>
                </Form>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project?.summary || "No summary provided."}</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="mt-6">
           <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Impacted Systems</CardTitle>
              <CardDescription>Manage all systems impacted by the project.</CardDescription>
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
                  <TableHead className="w-[25%]">Name</TableHead>
                  <TableHead className="w-[45%]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Estimation (man-days)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactedSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell className="font-medium">{system.name}</TableCell>
                    <TableCell className="break-words">{system.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{system.category}</Badge>
                    </TableCell>
                    <TableCell>{system.estimate || 'N/A'}</TableCell>
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
               <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Total Estimation</TableCell>
                  <TableCell className="font-bold">{totalEstimate}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSystemDialogOpen} onOpenChange={(open) => { setIsSystemDialogOpen(open); if (!open) setEditingSystem(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={systemForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={systemForm.control}
                  name="estimate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimation (man-days)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSystemSubmitting}>
                  {isSystemSubmitting ? (editingSystem ? 'Saving...' : 'Creating...') : (editingSystem ? 'Save Changes' : 'Create System')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingSystem} onOpenChange={(isOpen) => !isOpen && setDeletingSystem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the system definition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSystemConfirm}
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

