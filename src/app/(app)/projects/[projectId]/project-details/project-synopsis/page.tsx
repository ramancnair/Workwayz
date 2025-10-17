
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
import { type ProjectStatus, type RagStatus, type ProjectMethodology, type PricingModel } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Edit, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ragStatuses: RagStatus[] = ['Green', 'Amber', 'Red'];
const projectStatuses: ProjectStatus[] = ['Initial Estimation', 'Not Started', 'Active', 'On Hold', 'Completed', 'Cancelled'];
const projectMethodologies: ProjectMethodology[] = ['Agile', 'SDLC', 'Hybrid'];
const pricingModels: PricingModel[] = ['Fixed Price', 'T&M', 'Fixed Capacity'];


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
    methodology: z.enum(projectMethodologies),
    pricingModel: z.enum(pricingModels),
    startDate: z.string(),
    endDate: z.string(),
}).refine(data => {
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
}, {
    message: "End date must be on or after the start date.",
    path: ['endDate'],
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
    const [isHealthDialogOpen, setIsHealthDialogOpen] = useState(false);
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    const { toast } = useToast();

    const healthForm = useForm<z.infer<typeof statusUpdateSchema>>({
        resolver: zodResolver(statusUpdateSchema),
    });
    
    const infoForm = useForm<z.infer<typeof keyInfoUpdateSchema>>({
        resolver: zodResolver(keyInfoUpdateSchema),
    });

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
                methodology: project.methodology,
                pricingModel: project.pricingModel,
                startDate: project.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : '',
                endDate: project.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : '',
            });
        }
    }, [project, infoForm, isInfoDialogOpen]);

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
    }
        
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
            <PageHeader title="Project Synopsis" description="A high-level overview of your project details." />
            
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Project Summary</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {project.summary || "No summary provided."}
                        </p>
                    </CardContent>
                </Card>

                <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                    <Card>
                         <CardHeader className="flex flex-row justify-between items-start">
                            <div><CardTitle>Key Information</CardTitle></div>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                            </DialogTrigger>
                        </CardHeader>
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
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader><DialogTitle>Edit Key Information</DialogTitle></DialogHeader>
                        <Form {...infoForm}>
                            <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <FormField control={infoForm.control} name="status" render={({ field }) => (
                                        <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{projectStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                   )}/>
                                    <FormField control={infoForm.control} name="projectManagerId" render={({ field }) => (
                                        <FormItem><FormLabel>Project Manager</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a PM"/></SelectTrigger></FormControl><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                    )}/>
                               </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={infoForm.control} name="methodology" render={({ field }) => (
                                        <FormItem><FormLabel>Methodology</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{projectMethodologies.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                                    )}/>
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
                                <DialogFooter>
                                    <Button type="submit" disabled={infoForm.formState.isSubmitting}>
                                        {infoForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isHealthDialogOpen} onOpenChange={setIsHealthDialogOpen}>
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
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Edit Project Health</DialogTitle>
                        </DialogHeader>
                        <Form {...healthForm}>
                            <form onSubmit={healthForm.handleSubmit(onHealthSubmit)} className="space-y-4">
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
                                <DialogFooter>
                                    <Button type="submit" disabled={healthForm.formState.isSubmitting}>
                                        {healthForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
