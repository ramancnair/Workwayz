

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
  DialogDescription,
  DialogTrigger,
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
} from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Bot } from 'lucide-react';
import { type Dependency, type DependencyType, type DependencyStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { getAiDependencySuggestions } from '@/app/actions';

const dependencySchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  type: z.enum(['Internal', 'External']),
  dependencyOn: z.string().min(1, 'This field is required.'),
  status: z.enum(['On Track', 'At Risk', 'Blocked']),
  ownerId: z.string().optional(),
  expectedByDate: z.string({ required_error: "Expected date is required." }).min(1, "Expected date is required."),
});

const types: DependencyType[] = ['Internal', 'External'];
const statuses: DependencyStatus[] = ['On Track', 'At Risk', 'Blocked'];

const statusStyles: Record<DependencyStatus, string> = {
  'On Track': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'At Risk': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};


export default function DependenciesPage() {
  const { project, stories, dependencies, employees: users, addDependency, updateDependency, deleteDependency } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDependency, setEditingDependency] = useState<Dependency | null>(null);
  const [deletingDependency, setDeletingDependency] = useState<Dependency | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenOpen, setIsAiGenOpen] = useState(false);
  const [isAiGenSubmitting, setIsAiGenSubmitting] = useState(false);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const form = useForm<z.infer<typeof dependencySchema>>({
    resolver: zodResolver(dependencySchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingDependency) {
        form.reset({
          ...editingDependency,
          ownerId: editingDependency.ownerId || 'unassigned',
          expectedByDate: format(new Date(editingDependency.expectedByDate), 'yyyy-MM-dd'),
        });
      } else {
        form.reset({
          description: '',
          type: 'Internal',
          dependencyOn: '',
          status: 'On Track',
          ownerId: 'unassigned',
          expectedByDate: '',
        });
      }
    }
  }, [isDialogOpen, editingDependency, form]);

  const onAiGenSubmit = async () => {
    if (!project?.summary && stories.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'A project summary or at least one story is required to generate dependencies.' });
      return;
    }
    setIsAiGenSubmitting(true);
    try {
      const result = await getAiDependencySuggestions({
        projectSummary: project?.summary || '',
        stories: stories.map(s => ({
          title: s.title,
          description: s.description,
          acceptanceCriteria: s.acceptanceCriteria,
        }))
      });

      if ('error' in result && result.error) {
        throw new Error(result.error);
      }

      if ('dependencies' in result) {
        const now = new Date();
        for (const dep of result.dependencies) {
          await addDependency({ ...dep, status: 'On Track', expectedByDate: now });
        }
        toast({ title: 'Success', description: `${result.dependencies.length} dependencies generated successfully.` });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not generate dependencies.' });
    } finally {
      setIsAiGenSubmitting(false);
      setIsAiGenOpen(false);
    }
  };

  const handleDialogOpen = (dependency: Dependency | null) => {
    setEditingDependency(dependency);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDependency) return;
    const success = await deleteDependency(deletingDependency.id);
    if (success) {
      toast({ title: "Success", description: "Dependency moved to trash." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not move dependency to trash." });
    }
    setDeletingDependency(null);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedDependencies.length === 0) return;

    const promises = selectedDependencies.map(id => deleteDependency(id));
    const results = await Promise.all(promises);

    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
      toast({ title: "Success", description: `${successCount} dependency(s) moved to trash.` });
    }
    if (successCount < selectedDependencies.length) {
      toast({ variant: "destructive", title: "Error", description: `Could not move ${selectedDependencies.length - successCount} dependency(s) to trash.` });
    }

    setSelectedDependencies([]);
    setShowBulkDeleteConfirm(false);
  };

  const onSubmit = async (values: z.infer<typeof dependencySchema>) => {
    setIsSubmitting(true);
    const dependencyData = {
      ...values,
      ownerId: values.ownerId === 'unassigned' ? undefined : values.ownerId,
      expectedByDate: new Date(values.expectedByDate),
    };

    const success = editingDependency
      ? await updateDependency(editingDependency.id, dependencyData)
      : await addDependency(dependencyData);

    if (success) {
      toast({ title: "Success", description: `Dependency ${editingDependency ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingDependency(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingDependency ? 'update' : 'add'} dependency.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Dependencies" description="Manage and track all project dependencies.">
          {selectedDependencies.length > 0 && (
            <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedDependencies.length})
            </Button>
          )}
          <Dialog open={isAiGenOpen} onOpenChange={setIsAiGenOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Bot className="mr-2 h-4 w-4" />
                AI Gen Dependencies
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Dependencies with AI</DialogTitle>
                <DialogDescription>The AI will analyze the project summary and stories to generate relevant dependencies. Do you want to proceed?</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAiGenOpen(false)}>Cancel</Button>
                <Button onClick={onAiGenSubmit} disabled={isAiGenSubmitting}>
                  {isAiGenSubmitting ? 'Generating...' : 'Proceed'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Dependency
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={dependencies.length > 0 && selectedDependencies.length === dependencies.length}
                    onCheckedChange={(value) =>
                      setSelectedDependencies(value ? dependencies.map(item => item.id) : [])
                    }
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead className="w-[30%]">Description</TableHead>
                <TableHead>Depends On</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dependencies.map((dependency) => {
                return (
                  <TableRow key={dependency.id} data-state={selectedDependencies.includes(dependency.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDependencies.includes(dependency.id)}
                        onCheckedChange={(value) =>
                          setSelectedDependencies(
                            value
                              ? [...selectedDependencies, dependency.id]
                              : selectedDependencies.filter((id) => id !== dependency.id)
                          )
                        }
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{dependency.dependencyId}</TableCell>
                    <TableCell className="break-words">{dependency.description}</TableCell>
                    <TableCell>{dependency.dependencyOn}</TableCell>
                    <TableCell><Badge variant="outline">{dependency.type}</Badge></TableCell>
                    <TableCell>
                      <Badge className={cn('font-semibold', statusStyles[dependency.status])}>
                        {dependency.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(dependency.expectedByDate), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(dependency)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingDependency(dependency)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingDependency(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingDependency ? 'Edit Dependency' : 'Add New Dependency'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the dependency..." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="dependencyOn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depends On</FormLabel>
                    <FormControl><Input placeholder="E.g., External API, Team Omega, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {types.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {statuses.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="ownerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Assign an owner" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {[...users].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="expectedByDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected By Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingDependency ? 'Saving...' : 'Creating...') : (editingDependency ? 'Save Changes' : 'Create Dependency')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDependency} onOpenChange={(isOpen) => !isOpen && setDeletingDependency(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the dependency to the trash. It will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected {selectedDependencies.length} dependency(s) to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
