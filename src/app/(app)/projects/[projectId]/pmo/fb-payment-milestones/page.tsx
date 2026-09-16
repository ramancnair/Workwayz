
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PlusCircle, Edit, Trash2, ArrowUpDown, CheckCircle2, Coins, Calendar } from 'lucide-react';
import { type PaymentMilestone, type PaymentMilestoneStatus } from '@/types';
import { cn, isValidUrl, formatUrl, formatRateInput } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  billingPercentage: z.coerce.number().min(0).max(100, "Percentage must be between 0 and 100."),
  amount: z.coerce.number().min(0, "Amount must be a positive number."),
  status: z.enum(['TBD', 'In Progress', 'Milestone completed', 'Invoice raised', 'Payment Completed']),
  statusDate: z.string().optional().or(z.literal('')),
  attachments: z.string().refine(
    val => !val || val.trim() === '' || isValidUrl(val),
    { message: "Please enter a valid URL (e.g. https://example.com or www.example.com)." }
  ).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.statusDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.statusDate > todayStr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date of status change cannot be in the future.',
        path: ['statusDate'],
      });
    }
  }
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
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const { 
    project, 
    updateProject, 
    paymentMilestones, 
    addPaymentMilestone, 
    updatePaymentMilestone, 
    deletePaymentMilestone,
    employees,
    holidays,
    weeklyOffDays,
    fixedCosts
  } = useProject();

  useEffect(() => {
    if (project && project.pricingModel !== 'Fixed Bid') {
      router.replace(`/projects/${projectId}/pmo/documents`);
    }
  }, [project, projectId, router]);

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editingMilestone, setEditingMilestone] = useState<PaymentMilestone | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<PaymentMilestone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [projectValueInput, setProjectValueInput] = useState('');
  const [monthlyBilledInput, setMonthlyBilledInput] = useState('');
  const [isSavingVal, setIsSavingVal] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [hasInitializedEditState, setHasInitializedEditState] = useState(false);
  const [isOverriddenInput, setIsOverriddenInput] = useState(false);

  // Helper functions for billing total calculation
  const calculateBusinessDays = useCallback((startDateStr?: string, endDateStr?: string): number => {
    if (!startDateStr || !endDateStr) return 0;
    try {
        const start = parseISO(startDateStr);
        const end = parseISO(endDateStr);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }

        const holidayDates = holidays.map(h => new Date(h.date));

        const interval = eachDayOfInterval({ start, end });
        
        const businessDays = interval.filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
            return !isWeekend && !isHoliday;
        });

        return businessDays.length;
    } catch(e) {
        console.error("Error calculating business days", e);
        return 0;
    }
  }, [holidays, weeklyOffDays]);

  const calculateProjectMonths = useCallback((): number => {
    if (!project?.startDate || !project?.endDate) return 1;
    try {
        const start = parseISO(project.startDate);
        const end = parseISO(project.endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 1;
        }
        
        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        return Math.max(1, yearsDiff * 12 + monthsDiff + 1);
    } catch(e) {
        console.error("Error calculating project months", e);
        return 1;
    }
  }, [project]);

  const calculatedTotalBill = useMemo(() => {
    if (!employees || !fixedCosts) {
      return 0;
    }
    
    let totalRevenue = 0;

    employees.forEach(user => {
      const workingDays = calculateBusinessDays(user.onboardingDate, user.offloadingDate);
      if (workingDays > 0) {
        totalRevenue += workingDays * (user.billedRate || 0);
      }
    });
    
    const totalFixedCost = fixedCosts.reduce((acc, fc) => {
      if (fc.type === 'Monthly') {
        const months = calculateProjectMonths();
        return acc + ((fc.cost || 0) * months);
      }
      return acc + (fc.cost || 0);
    }, 0);

    return totalRevenue + totalFixedCost;
  }, [employees, fixedCosts, calculateBusinessDays, calculateProjectMonths]);

  const effectiveContractValue = useMemo(() => {
    return project.isProjectValueOverridden 
      ? (project.projectValue || 0) 
      : calculatedTotalBill;
  }, [project.isProjectValueOverridden, project.projectValue, calculatedTotalBill]);
  
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

  const { realisedAmount, remainingAmount, realisedPercentage, remainingPercentage } = useMemo(() => {
    if (!paymentMilestones) return { realisedAmount: 0, remainingAmount: 0, realisedPercentage: 0, remainingPercentage: 0 };
    
    let realised = 0;
    let remaining = 0;
    let realisedPct = 0;
    let remainingPct = 0;

    paymentMilestones.forEach(m => {
      const amount = project?.pricingModel === 'Fixed Bid'
        ? ((m.billingPercentage / 100) * effectiveContractValue)
        : (m.amount || 0);

      const pct = m.billingPercentage || 0;

      if (m.status === 'Payment Completed') {
        realised += amount;
        realisedPct += pct;
      } else {
        remaining += amount;
        remainingPct += pct;
      }
    });

    const computedRealisedPct = effectiveContractValue > 0
      ? (realised / effectiveContractValue) * 100
      : realisedPct;
    const computedRemainingPct = effectiveContractValue > 0
      ? (remaining / effectiveContractValue) * 100
      : remainingPct;

    return { 
      realisedAmount: realised, 
      remainingAmount: remaining,
      realisedPercentage: computedRealisedPct,
      remainingPercentage: computedRemainingPct,
    };
  }, [paymentMilestones, project, effectiveContractValue]);

  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(columnId)} className="-ml-4 hover:bg-transparent">
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  useEffect(() => {
    if (project) {
      setProjectValueInput(project.isProjectValueOverridden ? formatRateInput(project.projectValue) : formatRateInput(calculatedTotalBill));
      setMonthlyBilledInput(project.monthlyBilledValue !== undefined && project.monthlyBilledValue !== null ? formatRateInput(project.monthlyBilledValue) : '0.00');
      setIsOverriddenInput(!!project.isProjectValueOverridden);
      
      if (!hasInitializedEditState) {
        const hasValue = project.pricingModel === 'Fixed Bid' 
          ? (project.projectValue !== undefined && project.projectValue !== null) || !project.isProjectValueOverridden
          : (project.monthlyBilledValue !== undefined && project.monthlyBilledValue !== null);
        setIsEditingValue(!hasValue);
        setHasInitializedEditState(true);
      }
    }
  }, [project, hasInitializedEditState, calculatedTotalBill]);

  // Form watcher for billing percentage auto-calculation in Fixed Bid
  const billingPct = form.watch('billingPercentage');
  const watchedStatus = form.watch('status');
  const isStatusChanged = useMemo(() => {
    if (!watchedStatus) return false;
    if (!editingMilestone) return true;
    return watchedStatus !== editingMilestone.status;
  }, [watchedStatus, editingMilestone]);
  useEffect(() => {
    if (project?.pricingModel === 'Fixed Bid') {
      const pct = parseFloat(billingPct as any) || 0;
      const totalVal = effectiveContractValue;
      const computedAmount = (pct / 100) * totalVal;
      form.setValue('amount', Math.round(computedAmount * 100) / 100);
    }
  }, [billingPct, project, effectiveContractValue, form]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingMilestone) {
        form.reset({
          name: editingMilestone.name,
          billingPercentage: editingMilestone.billingPercentage,
          amount: editingMilestone.amount,
          status: editingMilestone.status,
          statusDate: '',
          attachments: editingMilestone.attachments || '',
        });
      } else {
        form.reset({
          name: '',
          billingPercentage: 0,
          amount: 0,
          status: 'TBD',
          statusDate: new Date().toISOString().split('T')[0],
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
    if (isOverriddenInput && (isNaN(val) || val < 0)) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a valid positive number." });
      return;
    }
    setIsSavingVal(true);
    
    const targetValue = isOverriddenInput ? val : calculatedTotalBill;
    
    const success = await updateProject({ 
      projectValue: targetValue,
      isProjectValueOverridden: isOverriddenInput
    });
    
    if (success) {
      setProjectValueInput(formatRateInput(targetValue));
      setIsEditingValue(false);
      // Synchronize all existing payment milestone amounts in the database
      const promises = paymentMilestones.map(milestone => {
        const computedAmount = (milestone.billingPercentage / 100) * targetValue;
        return updatePaymentMilestone(milestone.id, { amount: Math.round(computedAmount * 100) / 100 });
      });
      await Promise.all(promises);
      toast({ title: "Success", description: "Final Contract Value and milestone amounts updated successfully." });
      setIsEditingValue(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not save final contract value." });
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
      setMonthlyBilledInput(formatRateInput(val));
      toast({ title: "Success", description: "Monthly Billed Value updated successfully." });
      setIsEditingValue(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not save monthly billed value." });
    }
    setIsSavingVal(false);
  };
  
  const onSubmit = async (values: z.infer<typeof milestoneSchema>) => {
    setIsSubmitting(true);
    const { statusDate, ...payloadData } = values;
    const payload = { ...payloadData } as any;
    if (payload.attachments) {
      payload.attachments = formatUrl(payload.attachments);
    }

    if (project?.pricingModel === 'Fixed Bid') {
      const totalVal = effectiveContractValue;
      payload.amount = Math.round(((values.billingPercentage / 100) * totalVal) * 100) / 100;
    }

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

  if (!project || project.pricingModel !== 'Fixed Bid') {
    return null;
  }

  return (
    <>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <PageHeader title="FB Payment Milestones" description="Manage and track project billing milestones.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Payment Milestone
          </Button>
        </PageHeader>

        {project && (
          <Card className="bg-card/60 backdrop-blur-sm shadow-sm border border-border/40">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Final Contract Value</h3>
              {project.pricingModel === 'Fixed Bid' ? (
                !isEditingValue ? (
                  <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-muted-foreground">Final Contract Value (USD)</label>
                        {project.isProjectValueOverridden ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                            Custom Override
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                            Default (Total Bill)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-black text-foreground tracking-tight py-1 bg-background/30 rounded px-3 border border-border/40 flex-1 flex items-center h-10">
                          ${effectiveContractValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          onClick={() => {
                            setProjectValueInput(project.isProjectValueOverridden ? String(project.projectValue || '') : String(calculatedTotalBill));
                            setIsOverriddenInput(!!project.isProjectValueOverridden);
                            setIsEditingValue(true);
                          }} 
                          className="h-10 w-10 shrink-0 border-muted-foreground/30 hover:border-foreground/50 transition-colors cursor-pointer"
                          title="Edit Contract Value"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant={isOverriddenInput ? "outline" : "default"}
                        onClick={() => {
                          setIsOverriddenInput(false);
                          setProjectValueInput(String(calculatedTotalBill));
                        }}
                        className="flex-1 text-xs h-9 cursor-pointer transition-all duration-200"
                      >
                        Use Billing Total (${calculatedTotalBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </Button>
                      <Button
                        type="button"
                        variant={isOverriddenInput ? "default" : "outline"}
                        onClick={() => {
                          setIsOverriddenInput(true);
                          setProjectValueInput(project.isProjectValueOverridden ? String(project.projectValue || '') : '');
                        }}
                        className="flex-1 text-xs h-9 cursor-pointer transition-all duration-200"
                      >
                        Custom Override
                      </Button>
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-4">
                      <div className="flex-1 space-y-2 w-full">
                        <label className="text-sm font-semibold text-muted-foreground">
                          {isOverriddenInput ? 'Custom Contract Value (USD)' : 'Billing Total (USD) - Read-only'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">$</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={projectValueInput}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.length > 1 && /^0[0-9]/.test(val)) {
                                val = val.replace(/^0+/, '');
                              }
                              if (/^(0|[1-9]\d{0,11})?(\.\d{0,2})?$/.test(val)) {
                                setProjectValueInput(val);
                              }
                            }}
                            onBlur={() => {
                              if (projectValueInput !== '') {
                                setProjectValueInput(formatRateInput(projectValueInput));
                              }
                            }}
                            className="pl-8 bg-background/50 border-muted focus-visible:ring-1 font-mono"
                            disabled={!isOverriddenInput}
                            autoFocus={isOverriddenInput}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto shrink-0">
                        <Button onClick={handleSaveProjectValue} disabled={isSavingVal} className="shadow-sm cursor-pointer">
                          {isSavingVal ? 'Saving...' : 'Save Value'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setProjectValueInput(project.isProjectValueOverridden ? formatRateInput(project.projectValue) : formatRateInput(calculatedTotalBill));
                            setIsOverriddenInput(!!project.isProjectValueOverridden);
                            setIsEditingValue(false);
                          }}
                          disabled={isSavingVal}
                          className="cursor-pointer"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                !isEditingValue ? (
                  <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
                    <div className="flex-1 space-y-2 w-full">
                      <label className="text-sm font-semibold text-muted-foreground">Monthly Billed Value (USD)</label>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-black text-foreground tracking-tight py-1 bg-background/30 rounded px-3 border border-border/40 flex-1 flex items-center h-10">
                          ${(project.monthlyBilledValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setIsEditingValue(true)} 
                          className="h-10 w-10 shrink-0 border-muted-foreground/30 hover:border-foreground/50 transition-colors"
                          title="Edit Monthly Value"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
                    <div className="flex-1 space-y-2 w-full">
                      <label className="text-sm font-semibold text-muted-foreground">Monthly Billed Value (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={monthlyBilledInput}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val.length > 1 && /^0[0-9]/.test(val)) {
                              val = val.replace(/^0+/, '');
                            }
                            if (/^(0|[1-9]\d{0,11})?(\.\d{0,2})?$/.test(val)) {
                              setMonthlyBilledInput(val);
                            }
                          }}
                          onBlur={() => {
                            if (monthlyBilledInput !== '') {
                              setMonthlyBilledInput(formatRateInput(monthlyBilledInput));
                            }
                          }}
                          className="pl-8 bg-background/50 border-muted font-mono"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Button onClick={handleSaveMonthlyBilled} disabled={isSavingVal} className="shadow-sm">
                        {isSavingVal ? 'Saving...' : 'Save Value'}
                      </Button>
                      {(project.monthlyBilledValue !== undefined && project.monthlyBilledValue !== null) && (
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setMonthlyBilledInput(formatRateInput(project.monthlyBilledValue));
                            setIsEditingValue(false);
                          }}
                          disabled={isSavingVal}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Premium realised and remaining balance cards */}
              <div className="mt-6 pt-6 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div className="relative overflow-hidden bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl p-4 flex items-center gap-4 transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent pointer-events-none" />
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/70">Total Realised</span>
                    <div className="text-xl font-extrabold text-emerald-400 tracking-tight flex items-baseline gap-1.5 flex-wrap">
                      <span>${realisedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-sm font-semibold text-emerald-500/80">
                        ({realisedPercentage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-blue-500/[0.03] hover:bg-blue-500/[0.06] border border-blue-500/10 hover:border-blue-500/20 rounded-xl p-4 flex items-center gap-4 transition-all duration-300 group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent pointer-events-none" />
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-500/70">Remaining Amount</span>
                    <div className="text-xl font-extrabold text-blue-400 tracking-tight flex items-baseline gap-1.5 flex-wrap">
                      <span>${remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-sm font-semibold text-blue-500/80">
                        ({remainingPercentage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
                      ? ((milestone.billingPercentage / 100) * effectiveContractValue)
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
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(milestone)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingMilestone(milestone)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
                            <Input 
                              type="number" 
                              placeholder="0.00" 
                              step="any"
                              min="0"
                              max="100"
                              {...field} 
                              value={field.value === undefined || field.value === null ? '' : field.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? '' : val);
                              }}
                              className="font-mono"
                            />
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
                              step="any"
                              placeholder={project?.pricingModel === 'Fixed Bid' ? "Auto-calculated from %" : "0.00"} 
                              {...field} 
                              disabled={project?.pricingModel === 'Fixed Bid'}
                              className="font-mono"
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
                          max={new Date().toISOString().split('T')[0]}
                          {...field} 
                          className="bg-background/50 border-muted focus:border-primary/50 transition-colors" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Status History Timeline (The Marked Section) */}
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
              This action cannot be undone. This will permanently delete the milestone &quot;{deletingMilestone?.name}&quot;.
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
