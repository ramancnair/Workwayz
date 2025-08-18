
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
  const { paymentMilestones, addPaymentMilestone, updatePaymentMilestone, deletePaymentMilestone } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<PaymentMilestone | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<PaymentMilestone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof milestoneSchema>>({
    resolver: zodResolver(milestoneSchema),
  });

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
  
  const onSubmit = async (values: z.infer<typeof milestoneSchema>) => {
    setIsSubmitting(true);
    const success = editingMilestone
      ? await updatePaymentMilestone(editingMilestone.id, values)
      : await addPaymentMilestone(values);

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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Payment Milestones" description="Manage and track project billing milestones.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Billing %</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attachments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMilestones.map((milestone) => (
                <TableRow key={milestone.id}>
                  <TableCell className="font-medium">{milestone.name}</TableCell>
                  <TableCell>{milestone.billingPercentage}%</TableCell>
                  <TableCell>${milestone.amount.toLocaleString()}</TableCell>
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
                            <Input type="number" placeholder="50000" {...field} />
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
