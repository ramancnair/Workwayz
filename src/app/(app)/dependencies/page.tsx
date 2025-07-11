
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type Dependency, type DependencyType, type DependencyStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const dependencySchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  type: z.enum(['Internal', 'External']),
  dependencyOn: z.string().min(1, 'This field is required.'),
  status: z.enum(['On Track', 'At Risk', 'Blocked']),
  ownerId: z.string().optional(),
  expectedByDate: z.string({ required_error: "Expected date is required."}).min(1, "Expected date is required."),
});

const types: DependencyType[] = ['Internal', 'External'];
const statuses: DependencyStatus[] = ['On Track', 'At Risk', 'Blocked'];

const statusStyles: Record<DependencyStatus, string> = {
    'On Track': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'At Risk': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};


export default function DependenciesPage() {
  const { dependencies, employees, addDependency, updateDependency, deleteDependency } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDependency, setEditingDependency] = useState<Dependency | null>(null);
  const [deletingDependency, setDeletingDependency] = useState<Dependency | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDialogOpen = (dependency: Dependency | null) => {
    setEditingDependency(dependency);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDependency) return;
    const success = await deleteDependency(deletingDependency.id);
    if (success) {
      toast({ title: "Success", description: "Dependency deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete dependency." });
    }
    setDeletingDependency(null);
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
        <PageHeader title="Project Dependencies" description="Manage and track all project dependencies.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Dependency
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
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
                    <TableRow key={dependency.id}>
                        <TableCell className="font-medium">{dependency.dependencyId}</TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(dependency)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingDependency(dependency)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingDependency(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDependency ? 'Edit Dependency' : 'Add New Dependency'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                    {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
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

              <DialogFooter>
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
              This action cannot be undone. This will permanently delete the dependency.
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
