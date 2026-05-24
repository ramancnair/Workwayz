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
import { PlusCircle, Edit, Trash2, ArrowUpDown, CheckCircle2, Calendar } from 'lucide-react';
import { type PaymentMilestone, type PaymentMilestoneStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { eachMonthOfInterval, format, parseISO, subMonths, addMonths } from 'date-fns';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Month is required.'),
  amount: z.coerce.number().min(0, "Amount must be a positive number."),
  status: z.enum(['TBD', 'In Progress', 'Milestone completed', 'Invoice raised', 'Payment Completed']),
  statusDate: z.string().optional().or(z.literal('')),
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


export default function TnmPaymentMilestonesPage() {
  const { 
    project, 
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

  // Generate selectable months for the project duration
  const selectableMonths = useMemo(() => {
    if (!project?.startDate || !project?.endDate) {
      const today = new Date();
      const start = subMonths(today, 6);
      const end = addMonths(today, 6);
      return eachMonthOfInterval({ start, end });
    }
    try {
      const start = parseISO(project.startDate);
      const end = parseISO(project.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        const today = new Date();
        return eachMonthOfInterval({ start: subMonths(today, 6), end: addMonths(today, 6) });
      }
      return eachMonthOfInterval({ start, end });
    } catch (e) {
      const today = new Date();
      return eachMonthOfInterval({ start: subMonths(today, 6), end: addMonths(today, 6) });
    }
  }, [project]);

  const formattedMonths = useMemo(() => {
    return selectableMonths.map(m => format(m, 'MMMM yyyy'));
  }, [selectableMonths]);

  const sortedMilestones = useMemo(() => {
    if (!paymentMilestones) return [];
    const sorted = [...paymentMilestones];
    if (sorting) {
      sorted.sort((a, b) => {
        let valA: any = (a as any)[sorting.id] || '';
        let valB: any = (b as any)[sorting.id] || '';

        // Handle numeric values
        if (sorting.id === 'amount') {
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

  const realisedAmount = useMemo(() => {
    if (!paymentMilestones) return 0;
    return paymentMilestones
      .filter(m => m.status === 'Payment Completed')
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  }, [paymentMilestones]);

  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(columnId)} className="-ml-4 hover:bg-transparent">
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  const watchedStatus = form.watch('status');
  const isStatusChanged = useMemo(() => {
    if (!watchedStatus) return false;
    if (!editingMilestone) return true;
    return watchedStatus !== editingMilestone.status;
  }, [watchedStatus, editingMilestone]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingMilestone) {
        form.reset({
          name: editingMilestone.name,
          amount: editingMilestone.amount,
          status: editingMilestone.status,
          statusDate: '',
          attachments: editingMilestone.attachments || '',
        });
      } else {
        form.reset({
          name: formattedMonths[0] || '',
          amount: 0,
          status: 'TBD',
          statusDate: new Date().toISOString().split('T')[0],
          attachments: '',
        });
      }
    }
  }, [isDialogOpen, editingMilestone, form, formattedMonths]);

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
  
  const onSubmit = async (values: z.infer<typeof milestoneSchema>) => {
    setIsSubmitting(true);
    const { statusDate, ...payloadData } = values;
    
    // Programmatically set billingPercentage to 0 since it is not used in T&M
    const payload = { 
      ...payloadData, 
      billingPercentage: 0 
    } as any;

    const originalStatus = editingMilestone?.status;
    const newStatus = values.status;
    const resolvedDate = statusDate || new Date().toISOString().split('T')[0];

    let updatedHistory = [...(editingMilestone?.statusHistory || [])];

    if (editingMilestone) {
      if (newStatus !== originalStatus) {
        updatedHistory.push({
          status: newStatus,
          date: resolvedDate
        });
      }
    } else {
      updatedHistory.push({
        status: newStatus,
        date: resolvedDate
      });
    }

    // Sort history chronologically
    updatedHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    payload.statusHistory = updatedHistory;

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
        <PageHeader title="TnM Payment Milestones" description="Manage and track project billing milestones.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Payment Milestone
          </Button>
        </PageHeader>

        {project && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
            <Card className="bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl transition-all duration-300 group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/70 font-sans">Total Realised</span>
                  <div className="text-xl font-extrabold text-emerald-400 tracking-tight">
                    ${realisedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader columnId="milestoneId">ID</SortableHeader>
                <SortableHeader columnId="name">Calendar Month</SortableHeader>
                <SortableHeader columnId="amount">Actual Invoiced Amount</SortableHeader>
                <SortableHeader columnId="status">Status</SortableHeader>
                <TableHead>Attachments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMilestones.map((milestone) => (
                <TableRow key={milestone.id}>
                  <TableCell>{milestone.milestoneId}</TableCell>
                  <TableCell className="font-semibold text-foreground">{milestone.name}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    ${(milestone.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <FormLabel>Calendar Month</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select calendar month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formattedMonths.map(m => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Invoiced Amount (USD)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 50000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

              {/* Dynamic Status Date input shown only if status changes or new milestone */}
              {isStatusChanged && (
                <FormField
                  control={form.control}
                  name="statusDate"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mt-1">
                        <Calendar className="h-3.5 w-3.5" /> Date of Status Change
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-background/50 border-muted focus:border-primary/50 transition-colors" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Status History Timeline */}
              {editingMilestone && (
                <div className="space-y-3 py-3 border-t border-b border-border/40 my-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status History Log</h4>
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full font-medium">
                      {editingMilestone.statusHistory?.length || 0} entries
                    </span>
                  </div>
                  
                  {editingMilestone.statusHistory && editingMilestone.statusHistory.length > 0 ? (
                    <div className="relative pl-6 space-y-4 max-h-[160px] overflow-y-auto pr-2 py-1 scrollbar-thin scrollbar-thumb-muted">
                      {/* Vertical timeline line */}
                      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 to-muted/20" />
                      
                      {editingMilestone.statusHistory.map((item, idx) => (
                        <div key={idx} className="relative flex items-center justify-between group">
                          {/* Timeline Dot */}
                          <div className="absolute -left-[20.5px] h-3 w-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20 scale-100 group-hover:scale-125 transition-transform duration-200" />
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-foreground capitalize">
                              {item.status}
                            </span>
                          </div>
                          
                          <div className="text-[11px] font-semibold text-muted-foreground bg-background/50 border border-border/30 rounded px-2 py-0.5">
                            {new Date(item.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic py-3 text-center bg-muted/10 rounded-lg border border-dashed border-border/40">
                      No status change history recorded yet.
                    </div>
                  )}
                </div>
              )}

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
