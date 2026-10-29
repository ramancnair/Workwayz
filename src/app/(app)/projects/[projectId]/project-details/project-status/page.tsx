'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ProjectStatus, type RagStatus, type PricingModel } from '@/types';
import { isAssignableToProject } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Edit, Circle, Search, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ragStatuses = ['Green', 'Amber', 'Red'] as const;
const projectStatuses = ['Initial Estimation', 'Not Started', 'Active', 'On Hold', 'Completed', 'Cancelled'] as const;
const pricingModels = ['Fixed Bid', 'T&M'] as const;

const statusUpdateSchema = z.object({
  overallStatus: z.enum(ragStatuses).optional(),
  scopeStatus: z.enum(ragStatuses).optional(),
  costStatus: z.enum(ragStatuses).optional(),
  timeStatus: z.enum(ragStatuses).optional(),
  statusComments: z.string().optional(),
});

const keyInfoUpdateSchema = z.object({
    status: z.enum(projectStatuses),
    projectManagerId: z.string().optional(),
    pricingModel: z.enum(pricingModels),
    startDate: z.string(),
    endDate: z.string(),
}).refine(data => {
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
}, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
});

const statusStyles: Record<ProjectStatus, string> = {
    'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-800',
    'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-800',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200 dark:border-red-800',
};

const ragStatusStyles: Record<RagStatus, string> = {
  'Green': 'text-green-500',
  'Amber': 'text-yellow-500',
  'Red': 'text-red-500',
};

function DetailCard({ title, value, className }: { title: string; value: React.ReactNode; className?: string }) {
    return (
        <div className={cn("space-y-1", className)}>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <div className="text-sm font-semibold">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
        </div>
    );
}

function RagStatusIndicator({ status, label }: { status?: RagStatus, label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Circle className={cn('h-3.5 w-3.5 shrink-0', status ? ragStatusStyles[status] : 'text-gray-300')} fill="currentColor" />
            <span className="text-xs font-medium">{label}</span>
        </div>
    );
}

export default function ProjectSynopsisPage() {
    const { 
        project, 
        isLoading, 
        allUsers = [], 
        updateProject,
        employees = [],
        fixedCosts = [],
        holidays = [],
        weeklyOffDays = [],
        paymentMilestones = []
    } = useProject();
    
    const [isHealthDialogOpen, setIsHealthDialogOpen] = useState(false);
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    const [pmInputText, setPmInputText] = useState('');
    const { toast } = useToast();

    const healthForm = useForm<z.infer<typeof statusUpdateSchema>>({
        resolver: zodResolver(statusUpdateSchema),
    });

    const infoForm = useForm<z.infer<typeof keyInfoUpdateSchema>>({
        resolver: zodResolver(keyInfoUpdateSchema),
        defaultValues: {
            status: 'Not Started',
            pricingModel: 'Fixed Bid',
            startDate: '',
            endDate: '',
        }
    });

    const pmOptions = useMemo(() => {
        const eligible = allUsers.filter(u => isAssignableToProject(u));
        return eligible.map(u => ({
            value: u.id,
            label: u.empId ? `${u.firstName} ${u.lastName} (${u.empId.trim()})` : `${u.firstName} ${u.lastName}`,
        }));
    }, [allUsers]);

    useEffect(() => {
        if (project && isHealthDialogOpen) {
            healthForm.reset({
                overallStatus: project.overallStatus,
                scopeStatus: project.scopeStatus,
                costStatus: project.costStatus,
                timeStatus: project.timeStatus,
                statusComments: project.statusComments,
            });
        }
    }, [project, healthForm, isHealthDialogOpen]);
    
    useEffect(() => {
        if (project && isInfoDialogOpen) {
            infoForm.reset({
                status: project.status,
                projectManagerId: project.projectManagerId || 'unassigned',
                pricingModel: project.pricingModel,
                startDate: project.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : '',
                endDate: project.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : '',
            });
            if (project.projectManagerId && project.projectManagerId !== 'unassigned') {
                const pm = allUsers.find(u => u.id === project.projectManagerId);
                if (pm && pm.empId) {
                    setPmInputText(`${pm.firstName} ${pm.lastName} (${pm.empId.trim()})`);
                } else if (pm) {
                    setPmInputText(`${pm.firstName} ${pm.lastName}`);
                } else {
                    setPmInputText('');
                }
            } else {
                setPmInputText('');
            }
        }
    }, [project, infoForm, isInfoDialogOpen, allUsers]);

    // PMO Permits
    const permitToBuildApproved = !!project?.pmoApproval?.permitToBuild?.approved;
    const permitToBuildAt = project?.pmoApproval?.permitToBuild?.approvedAt;

    const permitToDeployApproved = !!project?.pmoApproval?.permitToDeploy?.approved;
    const permitToDeployAt = project?.pmoApproval?.permitToDeploy?.approvedAt;

    const formatApprovedDate = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            return format(new Date(dateStr), 'PPP');
        } catch {
            return null;
        }
    };

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
        if (!project) return 0;
        return project.isProjectValueOverridden 
            ? (project.projectValue || 0) 
            : calculatedTotalBill;
    }, [project, calculatedTotalBill]);

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

    const projectManager = project?.projectManagerId
        ? allUsers.find(e => e.id === project.projectManagerId)
        : null;

    const onHealthSubmit = async (values: z.infer<typeof statusUpdateSchema>) => {
        const success = await updateProject(values);
        if (success) {
            toast({ title: 'Success', description: 'Project health updated successfully.' });
            setIsHealthDialogOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update project health.' });
        }
    };
    
    const onInfoSubmit = async (values: z.infer<typeof keyInfoUpdateSchema>) => {
        if (values.projectManagerId && values.projectManagerId !== 'unassigned') {
            const pmUser = allUsers.find(u => u.id === values.projectManagerId);
            if (pmUser && !isAssignableToProject(pmUser)) {
                toast({
                    variant: 'destructive',
                    title: 'Assignment Prohibited',
                    description: 'Super Admin and Administrator users cannot be assigned to projects, even as Project Manager.',
                });
                return;
            }
        }

        const success = await updateProject({
            ...values,
            projectManagerId: values.projectManagerId === 'unassigned' ? undefined : values.projectManagerId,
            startDate: new Date(values.startDate).toISOString(),
            endDate: new Date(values.endDate).toISOString(),
        });
        if (success) {
            toast({ title: 'Success', description: 'Project information updated successfully.' });
            setIsInfoDialogOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update project information.' });
        }
    };
        
    if (isLoading) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-10 w-1/3" />
                <div className="space-y-4">
                    <Card><CardContent className="h-24" /></Card>
                    <Card><CardContent className="h-24" /></Card>
                    <Card><CardContent className="h-24" /></Card>
                </div>
            </div>
        );
    }

    if (!project) {
        return <div className="p-8 text-center">Project not found.</div>;
    }
    
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader title="Project Status" description="A high-level overview of your project details." />
            
            <div className="space-y-3.5">
                {/* 1. Key Information Card */}
                <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="py-2.5 px-5 flex flex-row justify-between items-center border-b border-border/30">
                            <CardTitle className="text-base font-semibold tracking-tight">Key Information</CardTitle>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                    <Edit className="h-3.5 w-3.5" />
                                    <span className="sr-only">Edit Key Information</span>
                                </Button>
                            </DialogTrigger>
                        </CardHeader>
                        <CardContent className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                            <DetailCard 
                                title="Status" 
                                value={project.status ? (
                                    <Badge variant="outline" className={cn('font-semibold text-xs px-2 py-0.5 mt-0.5', statusStyles[project.status])}>
                                        {project.status}
                                    </Badge>
                                ) : 'N/A'}
                            />
                            <DetailCard 
                                title="Project Manager"
                                value={projectManager ? `${projectManager.firstName} ${projectManager.lastName}` : "Unassigned"}
                            />
                            <DetailCard 
                                title="Pricing Model" 
                                value={project.pricingModel}
                            />
                            <DetailCard 
                                title="Start Date" 
                                value={project.startDate ? format(parseISO(project.startDate), 'PPP') : 'N/A'}
                            />
                            <DetailCard 
                                title="End Date" 
                                value={project.endDate ? format(parseISO(project.endDate), 'PPP') : 'N/A'}
                            />
                        </CardContent>
                    </Card>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
                        <DialogHeader className="px-6 py-4 border-b shrink-0"><DialogTitle>Edit Key Information</DialogTitle></DialogHeader>
                        <Form {...infoForm}>
                            <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <FormField control={infoForm.control} name="status" render={({ field }) => (
                                            <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{projectStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                       )}/>
                                       <FormField
                                           control={infoForm.control}
                                           name="projectManagerId"
                                           render={({ field }) => (
                                               <FormItem>
                                                    <FormLabel>Project Manager</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                            <Input
                                                                list="pm-options-status"
                                                                placeholder="Select a Project Manager..."
                                                                className="pl-9"
                                                                value={pmInputText}
                                                                onChange={(e) => {
                                                                    const inputText = e.target.value;
                                                                    setPmInputText(inputText);

                                                                    const matchingOption = pmOptions.find(opt => opt.label.toLowerCase() === inputText.toLowerCase() || opt.value === inputText);
                                                                    field.onChange(matchingOption ? matchingOption.value : (inputText.trim() === '' ? 'unassigned' : inputText));
                                                                }}
                                                                onBlur={() => {
                                                                    const matchingOption = pmOptions.find(opt => opt.label.toLowerCase() === pmInputText.toLowerCase());
                                                                    if (matchingOption) {
                                                                        setPmInputText(matchingOption.label);
                                                                        field.onChange(matchingOption.value);
                                                                    } else if (!pmInputText.trim() || pmInputText.toLowerCase() === 'unassigned') {
                                                                        setPmInputText('');
                                                                        field.onChange('unassigned');
                                                                    } else {
                                                                        const currentSelected = pmOptions.find(opt => opt.value === field.value);
                                                                        if (currentSelected) {
                                                                            setPmInputText(currentSelected.label);
                                                                        } else {
                                                                            setPmInputText('');
                                                                            field.onChange('unassigned');
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                   <datalist id="pm-options-status">
                                                       {pmOptions.map(option => (
                                                           <option key={option.value} value={option.label} />
                                                       ))}
                                                   </datalist>
                                                   <FormMessage/>
                                               </FormItem>
                                           )}
                                       />
                                   </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <FormField control={infoForm.control} name="pricingModel" render={({ field }) => (
                                            <FormItem><FormLabel>Pricing Model</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{pricingModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                         )}/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={infoForm.control} name="startDate" render={({ field }) => (
                                            <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                        <FormField control={infoForm.control} name="endDate" render={({ field }) => (
                                            <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                    </div>
                                </div>
                                <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                                    <Button type="submit" disabled={infoForm.formState.isSubmitting}>
                                        {infoForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                {/* 2. Project Health Card */}
                {project.status !== 'Not Started' && (
                    <Dialog open={isHealthDialogOpen} onOpenChange={setIsHealthDialogOpen}>
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="py-2.5 px-5 flex flex-row justify-between items-center border-b border-border/30">
                                <CardTitle className="text-base font-semibold tracking-tight">Project Health</CardTitle>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                        <Edit className="h-3.5 w-3.5" />
                                        <span className="sr-only">Edit Project Health</span>
                                    </Button>
                                </DialogTrigger>
                            </CardHeader>
                            <CardContent className="px-5 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-medium text-muted-foreground">Overall Health</h4>
                                    <div className="flex items-center gap-2.5 mt-0.5">
                                        <Circle className={cn('h-5 w-5 shrink-0', project.overallStatus ? ragStatusStyles[project.overallStatus] : 'text-gray-300')} fill="currentColor" />
                                        <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{project.statusComments || 'No comments provided.'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-medium text-muted-foreground">Health Indicators</h4>
                                    <div className="grid grid-cols-3 gap-2 mt-0.5">
                                        <RagStatusIndicator status={project.scopeStatus} label="Scope" />
                                        <RagStatusIndicator status={project.costStatus} label="Cost" />
                                        <RagStatusIndicator status={project.timeStatus} label="Time" />
                                    </div>
                                </div>
                                {project.statusHistory && project.statusHistory.length > 0 && (
                                    <div className="col-span-1 md:col-span-2 pt-2 border-t border-border/20">
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value="history" className="border-none">
                                                <AccordionTrigger className="py-1 text-xs hover:no-underline text-muted-foreground">View Status History</AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="overflow-x-auto max-h-48">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="text-xs">
                                                                    <TableHead className="py-1.5">Date</TableHead>
                                                                    <TableHead className="py-1.5">Overall</TableHead>
                                                                    <TableHead className="py-1.5">Scope</TableHead>
                                                                    <TableHead className="py-1.5">Cost</TableHead>
                                                                    <TableHead className="py-1.5">Time</TableHead>
                                                                    <TableHead className="py-1.5">Comments</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {[...project.statusHistory].reverse().map((historyItem, idx) => (
                                                                    <TableRow key={idx} className="text-xs">
                                                                        <TableCell className="whitespace-nowrap py-1.5">{format(parseISO(historyItem.date), 'MMM dd, yyyy HH:mm')}</TableCell>
                                                                        <TableCell className="py-1.5">
                                                                            {historyItem.overallStatus ? <RagStatusIndicator status={historyItem.overallStatus} label={historyItem.overallStatus} /> : 'N/A'}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5">
                                                                            {historyItem.scopeStatus ? <RagStatusIndicator status={historyItem.scopeStatus} label={historyItem.scopeStatus} /> : 'N/A'}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5">
                                                                            {historyItem.costStatus ? <RagStatusIndicator status={historyItem.costStatus} label={historyItem.costStatus} /> : 'N/A'}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5">
                                                                            {historyItem.timeStatus ? <RagStatusIndicator status={historyItem.timeStatus} label={historyItem.timeStatus} /> : 'N/A'}
                                                                        </TableCell>
                                                                        <TableCell className="max-w-[180px] truncate py-1.5 text-xs" title={historyItem.statusComments}>
                                                                            {historyItem.statusComments || 'No comments'}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
                            <DialogHeader className="px-6 py-4 border-b shrink-0">
                                <DialogTitle>Edit Project Health</DialogTitle>
                            </DialogHeader>
                            <Form {...healthForm}>
                                <form onSubmit={healthForm.handleSubmit(onHealthSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                                        <Card className="pt-4 border-none shadow-none">
                                            <CardContent className="space-y-4 p-0">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField control={healthForm.control} name="overallStatus" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Overall Health</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Set status" /></SelectTrigger></FormControl>
                                                                <SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}/>
                                                    <FormField control={healthForm.control} name="statusComments" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Status Comments</FormLabel>
                                                            <FormControl><Textarea placeholder="Add comments about the current status..." {...field} value={field.value ?? ''}/></FormControl>
                                                        </FormItem>
                                                    )}/>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <FormField control={healthForm.control} name="scopeStatus" render={({ field }) => (
                                                        <FormItem><FormLabel>Scope</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Set status"/></SelectTrigger></FormControl><SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                    <FormField control={healthForm.control} name="costStatus" render={({ field }) => (
                                                        <FormItem><FormLabel>Cost</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Set status"/></SelectTrigger></FormControl><SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                    <FormField control={healthForm.control} name="timeStatus" render={({ field }) => (
                                                        <FormItem><FormLabel>Time</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Set status"/></SelectTrigger></FormControl><SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                                    )}/>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                                        <Button type="submit" disabled={healthForm.formState.isSubmitting}>
                                            {healthForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}

                {/* 3. PMO Permits Card */}
                <Card data-testid="pmo-status-card" className="border-border/60 shadow-sm">
                    <CardHeader className="py-2.5 px-5 border-b border-border/30">
                        <CardTitle className="text-base font-semibold tracking-tight">PMO</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                        <DetailCard 
                            title="Permit to Build" 
                            value={
                                <div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {permitToBuildApproved ? (
                                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium px-2 py-0.5 text-xs rounded-full flex items-center gap-1.5 w-fit">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Approved
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium px-2 py-0.5 text-xs rounded-full flex items-center gap-1.5 w-fit">
                                                <AlertCircle className="h-3 w-3" />
                                                Pending
                                            </Badge>
                                        )}
                                    </div>
                                    {permitToBuildApproved && permitToBuildAt && (
                                        <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                                            {formatApprovedDate(permitToBuildAt)}
                                        </p>
                                    )}
                                </div>
                            }
                        />
                        <DetailCard 
                            title="Permit to Deploy" 
                            value={
                                <div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {permitToDeployApproved ? (
                                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium px-2 py-0.5 text-xs rounded-full flex items-center gap-1.5 w-fit">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Approved
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium px-2 py-0.5 text-xs rounded-full flex items-center gap-1.5 w-fit">
                                                <AlertCircle className="h-3 w-3" />
                                                Pending
                                            </Badge>
                                        )}
                                    </div>
                                    {permitToDeployApproved && permitToDeployAt && (
                                        <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                                            {formatApprovedDate(permitToDeployAt)}
                                        </p>
                                    )}
                                </div>
                            }
                        />
                    </CardContent>
                </Card>

                {/* 4. Payment Milestones (FB or TnM) */}
                <Card data-testid="pmo-financials-card" className="border-border/60 shadow-sm">
                    <CardHeader className="py-2.5 px-5 border-b border-border/30">
                        <CardTitle className="text-base font-semibold tracking-tight">
                            {project.pricingModel === 'Fixed Bid' ? 'FB Payment Milestones' : 'TnM Payment Milestones'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 py-3 space-y-3">
                        {project.pricingModel === 'Fixed Bid' ? (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/20">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-muted-foreground">Final Contract Value (USD)</span>
                                        {project.isProjectValueOverridden ? (
                                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                                                Custom Override
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                                                Default (Total Bill)
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-lg font-bold text-foreground tracking-tight">
                                        ${effectiveContractValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                                    <div className="relative overflow-hidden bg-emerald-500/[0.04] border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">Total Realised</span>
                                            <div className="text-base font-bold text-emerald-400 tracking-tight flex items-baseline gap-1.5 flex-wrap">
                                                <span>${realisedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="text-xs font-medium text-emerald-500/80">
                                                    ({realisedPercentage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative overflow-hidden bg-blue-500/[0.04] border border-blue-500/20 rounded-lg p-3 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                                            <Coins className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500/80">Remaining Amount</span>
                                            <div className="text-base font-bold text-blue-400 tracking-tight flex items-baseline gap-1.5 flex-wrap">
                                                <span>${remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                <span className="text-xs font-medium text-blue-500/80">
                                                    ({remainingPercentage.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                                <div className="relative overflow-hidden bg-emerald-500/[0.04] border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">Total Realised</span>
                                        <div className="text-base font-bold text-emerald-400 tracking-tight">
                                            ${realisedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                {project.monthlyBilledValue !== undefined && project.monthlyBilledValue !== null && (
                                    <div className="relative overflow-hidden bg-blue-500/[0.04] border border-blue-500/20 rounded-lg p-3 flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                                            <Coins className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500/80">Monthly Billed Value</span>
                                            <div className="text-base font-bold text-blue-400 tracking-tight">
                                                ${(project.monthlyBilledValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
