
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { PlusCircle, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { type PaymentMilestone, type PaymentMilestoneStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  billingPercentage: z.coerce.number().min(0).max(100, "Percentage must be between 0 and 100."),
  amount: z.coerce.number().min(0, "Amount must be a positive number."),
  status: z.enum(['TBD', 'In Progress', 'Milestone completed', 'Invoice raised', 'Payment Completed']),
  attachments: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

const statuses: PaymentMilestoneStatus[] = ['TBD', 'In Progress', 'Milestone completed', 'Invoice raised', 'Payment Completed'];

const statusStyles: Record<PaymentMilestoneStatus, string> = {
    'TBD': 'bg-gray-100 text-gray-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Milestone completed': 'bg-yellow-100 text-yellow-800',
    'Invoice raised': 'bg-purple-100 text-purple-800',
    'Payment Completed': 'bg-green-100 text-green-800',
};


export default function BillingPage() {
  const { 
    project, 
    updateProject, 
    paymentMilestones, 
    addPaymentMilestone, 
    updatePaymentMilestone, 
    deletePaymentMilestone 
  } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<PaymentMilestone | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<PaymentMilestone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [projectValueInput, setProjectValueInput] = useState('');
  const [monthlyBilledInput, setMonthlyBilledInput] = useState('');
  const [isSavingVal, setIsSavingVal] = useState(false);
  
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'milestoneId', desc: false });

  const form = useForm<z.infer<typeof milestoneSchema>>({
    resolver: zodResolver(milestoneSchema),
  });

  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const sortedMilestones = useMemo(() => {
    if (!paymentMilestones) return [];
    const sorted = [...paymentMilestones];
    if (sorting) {
      sorted.sort((a, b) => {
        let valA: any = (a as any)[sorting.id] || '';
        let valB: any = (b as any)[sorting.id] || '';

        // Handle numeric values
        if (sorting.id === 'billingPercentage' || sorting.id === 'amount') {
          const numA = parseFloat(valA) || 0;
          const numB = parseFloat(valB) || 0;
          return sorting.desc ? numB - numA : numA - numB;
        }

        // Custom milestone ID alphanumeric sorting: "PM-1", "PM-2", "PM-10" etc.
        if (sorting.id === 'milestoneId') {
          const matchA = valA.match(/\d+$/);
          const matchB = valB.match(/\d+$/);
          const numA = matchA ? parseInt(matchA[0], 10) : 0;
          const numB = matchB ? parseInt(matchB[0], 10) : 0;
          if (numA !== numB) {
            return sorting.desc ? numB - numA : numA - numB;
          }
        }

        // Default string comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sorting.desc ? strB.localeCompare(strA) : strA.localeCompare(strB);
      });
    }
    return sorted;
  }, [paymentMilestones, sorting]);

  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(columnId)} className="-ml-4 hover:bg-transparent">
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  // Initialize Project value forms
  useEffect(() => {
    if (project) {
      setProjectValueInput(project.projectValue !== undefined ? String(project.projectValue) : '');
      setMonthlyBilledInput(project.monthlyBilledValue !== undefined ? String(project.monthlyBilledValue) : '');
    }
  }, [project]);

  // Form watcher for billing percentage auto-calculation in Fixed Bid
  const billingPct = form.watch('billingPercentage');
  useEffect(() => {
    if (project?.pricingModel === 'Fixed Bid') {
      const pct = parseFloat(billingPct as any) || 0;
      const totalVal = parseFloat(projectValueInput) || project.projectValue || 0;
      const computedAmount = (pct / 100) * totalVal;
      form.setValue('amount', Math.round(computedAmount * 100) / 100);
    }
  }, [billingPct, project, projectValueInput, form]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingMilestone) {
        form.reset(editingMilestone);
      } else {
        form.reset({
          name: '',
          billingPercentage: 0,
          amount: 0,
          status: 'TBD',
          attachments: '',
        });
      }
    }
  }, [isDialogOpen, editingMilestone, form]);

  const handleDialogOpen = (milestone: PaymentMilestone | null) => {
    setEditingMilestone(milestone);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMilestone) return;
    const success = await deletePaymentMilestone(deletingMilestone.id);
    if (success) {
      toast({ title: "Success", description: "Payment milestone deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete payment milestone." });
    }
    setDeletingMilestone(null);
  };

  const handleSaveProjectValue = async () => {
    if (!project) return;
    const val = parseFloat(projectValueInput);
    if (isNaN(val) || val < 0) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a valid positive number." });
      return;
    }
    setIsSavingVal(true);
    const success = await updateProject({ projectValue: val });
    if (success) {
      // Synchronize all existing payment milestone amounts in the database
      const promises = paymentMilestones.map(milestone => {
        const computedAmount = (milestone.billingPercentage / 100) * val;
        return updatePaymentMilestone(milestone.id, { amount: Math.round(computedAmount * 100) / 100 });
      });
      await Promise.all(promises);
      toast({ title: "Success", description: "Total Project Value and milestone amounts updated successfully." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not save project value." });
    }
    setIsSavingVal(false);
  };

  const handleSaveMonthlyBilled = async () => {
    if (!project) return;
    const val = parseFloat(monthlyBilledInput);
    if (isNaN(val) || val < 0) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a valid positive number." });
      return;
    }
    setIsSavingVal(true);
    const success = await updateProject({ monthlyBilledValue: val });
    if (success) {
      toast({ title: "Success", description: "Monthly Billed Value updated successfully." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not save monthly billed value." });
    }
    setIsSavingVal(false);
  };
  
  const onSubmit = async (values: z.infer<typeof milestoneSchema>) => {
    setIsSubmitting(true);
    const payload = { ...values };
    if (project?.pricingModel === 'Fixed Bid') {
      const totalVal = parseFloat(projectValueInput) || project.projectValue || 0;
      payload.amount = Math.round(((values.billingPercentage / 100) * totalVal) * 100) / 100;
    }
    const success = editingMilestone
      ? await updatePaymentMilestone(editingMilestone.id, payload)
      : await addPaymentMilestone(payload);

    if (success) {
      toast({ title: "Success", description: `Milestone ${editingMilestone ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not save milestone.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <PageHeader title="Payment Milestones" description="Manage and track project billing milestones.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Payment Milestone
          </Button>
        </PageHeader>

        {project && (
          <Card className="bg-card/60 backdrop-blur-sm shadow-sm border border-border/40">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Project Value</h3>
              {project.pricingModel === 'Fixed Bid' ? (
                <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
                  <div className="flex-1 space-y-2 w-full">
                    <label className="text-sm font-semibold text-muted-foreground">Total Project Value (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={projectValueInput}
                        onChange={(e) => setProjectValueInput(e.target.value)}
                        className="pl-8 bg-background/50 border-muted"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveProjectValue} disabled={isSavingVal} className="w-full md:w-auto shadow-sm">
                    {isSavingVal ? 'Saving...' : 'Save Value'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
                  <div className="flex-1 space-y-2 w-full">
                    <label className="text-sm font-semibold text-muted-foreground">Monthly Billed Value (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={monthlyBilledInput}
                        onChange={(e) => setMonthlyBilledInput(e.target.value)}
                        className="pl-8 bg-background/50 border-muted"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveMonthlyBilled} disabled={isSavingVal} className="w-full md:w-auto shadow-sm">
                    {isSavingVal ? 'Saving...' : 'Save Value'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader columnId="milestoneId">ID</SortableHeader>
                <SortableHeader columnId="name">Name</SortableHeader>
                <SortableHeader columnId="billingPercentage">Billing %</SortableHeader>
                <SortableHeader columnId="amount">Amount</SortableHeader>
                <SortableHeader columnId="status">Status</SortableHeader>
                <TableHead>Attachments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMilestones.map((milestone) => (
                <TableRow key={milestone.id}>
                  <TableCell>{milestone.milestoneId}</TableCell>
                  <TableCell className="font-medium">{milestone.name}</TableCell>
                  <TableCell>{milestone.billingPercentage}%</TableCell>
                  <TableCell>
                    ${(project?.pricingModel === 'Fixed Bid'
                      ? ((milestone.billingPercentage / 100) * (project.projectValue || 0))
                      : milestone.amount
                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(statusStyles[milestone.status], 'font-semibold')}>{milestone.status}</Badge>
                  </TableCell>
                  <TableCell>
                     {milestone.attachments ? (
                       <a href={milestone.attachments} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          View
                        </a>
                     ) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(milestone)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingMilestone(milestone)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setEditingMilestone(null); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMilestone ? 'Edit Payment Milestone' : 'Add New Milestone'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Phase 1 Completion" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="billingPercentage"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Billing %</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="25" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount to be Billed</FormLabel>
                        <FormControl>
                            <Input 
                              type="number" 
                              placeholder={project?.pricingModel === 'Fixed Bid' ? "Auto-calculated from %" : "50000"} 
                              {...field} 
                              disabled={project?.pricingModel === 'Fixed Bid'}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attachments (URL)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Paste attachment URL here..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Milestone'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingMilestone} onOpenChange={(isOpen) => !isOpen && setDeletingMilestone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the milestone "{deletingMilestone?.name}".
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
