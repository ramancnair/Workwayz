
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ProjectStatus, type RagStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Edit, Circle } from 'lucide-react';


const ragStatuses: RagStatus[] = ['Green', 'Amber', 'Red'];

const statusUpdateSchema = z.object({
  overallStatus: z.enum(ragStatuses).optional(),
  scopeStatus: z.enum(ragStatuses).optional(),
  costStatus: z.enum(ragStatuses).optional(),
  timeStatus: z.enum(ragStatuses).optional(),
  statusComments: z.string().optional(),
});

const statusStyles: Record<ProjectStatus, string> = {
    'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ragStatusStyles: Record<RagStatus, string> = {
  'Green': 'text-green-500',
  'Amber': 'text-yellow-500',
  'Red': 'text-red-500',
};


function DetailCard({ title, value, className }: { title: string; value: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-lg font-semibold">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
        </div>
    );
}

function RagStatusIndicator({ status, label }: { status?: RagStatus, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <Circle className={cn('h-4 w-4', status ? ragStatusStyles[status] : 'text-gray-300')} />
            <span className="font-medium">{label}</span>
        </div>
    );
}

export default function ProjectSynopsisPage() {
    const { project, isLoading, allUsers, updateProject } = useProject();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof statusUpdateSchema>>({
        resolver: zodResolver(statusUpdateSchema),
    });

    useEffect(() => {
        if (project && isDialogOpen) {
            form.reset({
                overallStatus: project.overallStatus,
                scopeStatus: project.scopeStatus,
                costStatus: project.costStatus,
                timeStatus: project.timeStatus,
                statusComments: project.statusComments,
            });
        }
    }, [project, form, isDialogOpen]);

    const projectManager = project?.projectManagerId
        ? allUsers.find(e => e.id === project.projectManagerId)
        : null;

    const onSubmit = async (values: z.infer<typeof statusUpdateSchema>) => {
        const success = await updateProject(values);
        if (success) {
            toast({ title: 'Success', description: 'Project health updated successfully.' });
            setIsDialogOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update project health.' });
        }
    };
        
    if (isLoading) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    if (!project) {
        return <div className="p-8 text-center">Project not found.</div>;
    }
    
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <PageHeader title="Project Synopsis" description="A high-level overview of your project details." />
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Project Objective</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                                {project.description || "No description provided."}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Key Information</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <DetailCard 
                                title="Status" 
                                value={project.status ? (
                                    <Badge className={cn('font-semibold text-base', statusStyles[project.status])}>
                                        {project.status}
                                    </Badge>
                                ) : 'N/A'}
                            />
                            <DetailCard 
                                title="Project Manager"
                                value={projectManager ? `${projectManager.firstName} ${projectManager.lastName}` : "Unassigned"}
                            />
                             <DetailCard 
                                title="Methodology" 
                                value={project.methodology}
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

                    <Card>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle>Project Health</CardTitle>
                            </div>
                             <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="font-medium">Overall Health</h4>
                                <div className="flex items-center gap-4">
                                     <Circle className={cn('h-8 w-8', project.overallStatus ? ragStatusStyles[project.overallStatus] : 'text-gray-300')} />
                                    <p className="text-muted-foreground flex-1">{project.statusComments || 'No comments provided.'}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                               <h4 className="font-medium">Health Indicators</h4>
                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                   <RagStatusIndicator status={project.scopeStatus} label="Scope" />
                                   <RagStatusIndicator status={project.costStatus} label="Cost" />
                                   <RagStatusIndicator status={project.timeStatus} label="Time" />
                               </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Project Health</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Card className="pt-4 border-none shadow-none">
                              <CardContent className="space-y-4 p-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField control={form.control} name="overallStatus" render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Overall Health</FormLabel>
                                          <Select onValueChange={field.onChange} value={field.value}>
                                              <FormControl><SelectTrigger><SelectValue placeholder="Set status" /></SelectTrigger></FormControl>
                                              <SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                          </Select>
                                      </FormItem>
                                  )}/>
                                   <FormField control={form.control} name="statusComments" render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Status Comments</FormLabel>
                                          <FormControl><Textarea placeholder="Add comments about the current status..." {...field} value={field.value ?? ''}/></FormControl>
                                      </FormItem>
                                  )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="scopeStatus" render={({ field }) => (
                                      <FormItem><FormLabel>Scope</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Set status"/></SelectTrigger></FormControl><SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="costStatus" render={({ field }) => (
                                      <FormItem><FormLabel>Cost</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Set status"/></SelectTrigger></FormControl><SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="timeStatus" render={({ field }) => (
                                      <FormItem><FormLabel>Time</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Set status"/></SelectTrigger></FormControl><SelectContent>{ragStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                    )}/>
                                </div>
                              </CardContent>
                            </Card>
                            <DialogFooter>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
