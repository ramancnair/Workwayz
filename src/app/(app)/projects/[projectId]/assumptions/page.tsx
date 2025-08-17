

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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Bot } from 'lucide-react';
import { type Assumption, type AssumptionCategory, type AssumptionStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

const assumptionSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Technical', 'Resource', 'Business', 'External']),
  status: z.enum(['Active', 'Validated', 'Invalidated']),
  ownerId: z.string().optional(),
  validationDate: z.string().optional(),
});

const autoGenFormSchema = z.object({
    count: z.coerce.number().min(1, "Please enter a valid number.").default(5),
});

const categories: AssumptionCategory[] = ['Technical', 'Resource', 'Business', 'External'];
const statuses: AssumptionStatus[] = ['Active', 'Validated', 'Invalidated'];

const statusStyles: Record<AssumptionStatus, string> = {
    'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Validated': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Invalidated': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};


export default function AssumptionsPage() {
  const { assumptions, employees: users, addAssumption, updateAssumption, deleteAssumption, autoGenerateAssumptions } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssumption, setEditingAssumption] = useState<Assumption | null>(null);
  const [deletingAssumption, setDeletingAssumption] = useState<Assumption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [isAutoGenSubmitting, setIsAutoGenSubmitting] = useState(false);
  const [selectedAssumptions, setSelectedAssumptions] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const form = useForm<z.infer<typeof assumptionSchema>>({
    resolver: zodResolver(assumptionSchema),
  });

  const autoGenForm = useForm<z.infer<typeof autoGenFormSchema>>({
    resolver: zodResolver(autoGenFormSchema),
    defaultValues: { count: 5 },
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingAssumption) {
        form.reset({
            ...editingAssumption,
            ownerId: editingAssumption.ownerId || 'unassigned',
            validationDate: editingAssumption.validationDate ? format(new Date(editingAssumption.validationDate), 'yyyy-MM-dd') : '',
        });
      } else {
        form.reset({
            description: '',
            category: 'Technical',
            status: 'Active',
            ownerId: 'unassigned',
            validationDate: '',
        });
      }
    }
  }, [isDialogOpen, editingAssumption, form]);

  const onAutoGenSubmit = async (values: z.infer<typeof autoGenFormSchema>) => {
    setIsAutoGenSubmitting(true);
    const success = await autoGenerateAssumptions(values.count);
    if(success) {
        toast({ title: "Success", description: `${values.count} assumptions generated successfully.`});
        setIsAutoGenOpen(false);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Could not generate assumptions." });
    }
    setIsAutoGenSubmitting(false);
  }

  const handleDialogOpen = (assumption: Assumption | null) => {
    setEditingAssumption(assumption);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAssumption) return;
    const success = await deleteAssumption(deletingAssumption.id);
    if (success) {
      toast({ title: "Success", description: "Assumption moved to trash." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not move assumption to trash." });
    }
    setDeletingAssumption(null);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedAssumptions.length === 0) return;
    
    const promises = selectedAssumptions.map(id => deleteAssumption(id));
    const results = await Promise.all(promises);

    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
        toast({ title: "Success", description: `${successCount} assumption(s) moved to trash.` });
    }
    if (successCount < selectedAssumptions.length) {
        toast({ variant: "destructive", title: "Error", description: `Could not move ${selectedAssumptions.length - successCount} assumption(s) to trash.` });
    }
    
    setSelectedAssumptions([]);
    setShowBulkDeleteConfirm(false);
  };

  const onSubmit = async (values: z.infer<typeof assumptionSchema>) => {
    setIsSubmitting(true);
    const assumptionData = {
        ...values,
        ownerId: values.ownerId === 'unassigned' ? undefined : values.ownerId,
        validationDate: values.validationDate ? new Date(values.validationDate) : undefined,
    };

    const success = editingAssumption
      ? await updateAssumption(editingAssumption.id, assumptionData)
      : await addAssumption(assumptionData);

    if (success) {
      toast({ title: "Success", description: `Assumption ${editingAssumption ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingAssumption(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingAssumption ? 'update' : 'add'} assumption.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Assumptions" description="Manage and track all project assumptions.">
          {selectedAssumptions.length > 0 && (
            <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedAssumptions.length})
            </Button>
          )}
          <Dialog open={isAutoGenOpen} onOpenChange={setIsAutoGenOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    Autogen Assumptions
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Auto-Generate Assumptions</DialogTitle>
                    <DialogDescription>Enter the number of assumptions to create for testing.</DialogDescription>
                </DialogHeader>
                <Form {...autoGenForm}>
                    <form onSubmit={autoGenForm.handleSubmit(onAutoGenSubmit)} className="space-y-4">
                        <FormField
                            control={autoGenForm.control}
                            name="count"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number of Assumptions</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="5" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isAutoGenSubmitting}>
                                {isAutoGenSubmitting ? 'Generating...' : 'Generate Items'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Assumption
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                    <Checkbox
                        checked={assumptions.length > 0 && selectedAssumptions.length === assumptions.length}
                        onCheckedChange={(value) =>
                            setSelectedAssumptions(value ? assumptions.map(item => item.id) : [])
                        }
                        aria-label="Select all"
                    />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assumptions.map((assumption) => {
                const owner = users.find(e => e.id === assumption.ownerId);
                return (
                    <TableRow key={assumption.id} data-state={selectedAssumptions.includes(assumption.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedAssumptions.includes(assumption.id)}
                                onCheckedChange={(value) =>
                                    setSelectedAssumptions(
                                        value
                                        ? [...selectedAssumptions, assumption.id]
                                        : selectedAssumptions.filter((id) => id !== assumption.id)
                                    )
                                }
                                aria-label="Select row"
                            />
                        </TableCell>
                        <TableCell className="font-medium">{assumption.assumptionId}</TableCell>
                        <TableCell className="break-words">{assumption.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{assumption.category}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge className={cn('font-semibold', statusStyles[assumption.status])}>
                                {assumption.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{owner ? `${owner.firstName} ${owner.lastName}` : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(assumption)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingAssumption(assumption)}>
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingAssumption(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssumption ? 'Edit Assumption' : 'Add New Assumption'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assumption Description</FormLabel>
                        <FormControl><Textarea placeholder="Describe the assumption..." {...field} rows={4} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {categories.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
                                    {users.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="validationDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Validation Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingAssumption ? 'Saving...' : 'Creating...') : (editingAssumption ? 'Save Changes' : 'Create Assumption')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingAssumption} onOpenChange={(isOpen) => !isOpen && setDeletingAssumption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the assumption to the trash. It will be permanently deleted after 30 days.
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
              This will move the selected {selectedAssumptions.length} assumption(s) to the trash.
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
