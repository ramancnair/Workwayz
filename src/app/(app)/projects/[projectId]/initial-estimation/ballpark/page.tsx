
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  TableFooter,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Save, CheckCircle, Bot, RefreshCcw } from 'lucide-react';
import { type ImpactedSystem, type ImpactedSystemCategory, type Horizontal } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from '@/components/ui/checkbox';
import { getAiEstimates, getAiTechStackSuggestions, getAiHorizontalSuggestions } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const GeminiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12.012 2.25c.348 0 .68.163.888.45l3.5 5.063c.21.303.324.673.324 1.05V15a3 3 0 0 1-3 3h-3.414a3 3 0 0 1-2.122-.879l-3.5-3.5a3 3 0 0 1 0-4.242l3.5-3.5a3 3 0 0 1 2.122-.879H12.012Zm0 1.5H9.89a1.5 1.5 0 0 0-1.06.44L5.33 7.69a1.5 1.5 0 0 0 0 2.12l3.5 3.5a1.5 1.5 0 0 0 1.06.44h2.122a1.5 1.5 0 0 0 1.5-1.5V8.813a1.5 1.5 0 0 0-.162-.75L13.06 3.013a1.5 1.5 0 0 0-.44-.683l-.008-.005a1.53 1.53 0 0 0-.6-.175Z" />
    <path d="M16.513 10.5h-2.121a1.5 1.5 0 0 0-1.061.44l-3.5 3.5a1.5 1.5 0 0 0 0 2.12l3.5 3.5a1.5 1.5 0 0 0 1.06.44h2.122a3 3 0 0 0 3-3V13.5a3 3 0 0 0-3-3Zm-2.121 1.5h2.121a1.5 1.5 0 0 1 1.5 1.5v2.188a1.5 1.5 0 0 1-1.06 1.419l-3.5 1.75a1.5 1.5 0 0 1-1.68-.21l-3.5-3.5a1.5 1.5 0 0 1-.21-1.68l1.75-3.5a1.5 1.5 0 0 1 1.42-1.06Z" />
  </svg>
);


const estimationSchema = z.object({
  summary: z.string().optional(),
});

const systemSchema = z.object({
  name: z.string().min(1, 'System name is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Technology', 'Function']),
  estimate: z.coerce.number().optional(),
  dailyBillingRate: z.coerce.number().optional(),
});

const horizontalFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  weightage: z.coerce.number().min(0, 'Weightage must be positive.'),
});

const categories: ImpactedSystemCategory[] = ['Technology', 'Function'];

export default function InitialEstimationPage() {
  const { 
    project, 
    updateProject, 
    initialImpactedSystems, 
    addInitialImpactedSystem, 
    updateInitialImpactedSystem, 
    deleteInitialImpactedSystem,
    replaceInitialImpactedSystems,
    initialHorizontals,
    addInitialHorizontal,
    updateInitialHorizontal,
    deleteInitialHorizontal,
    replaceInitialHorizontals,
    confirmInitialEstimation
  } = useProject();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(true);
  
  const [isSystemDialogOpen, setIsSystemDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ImpactedSystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<ImpactedSystem | null>(null);
  const [isSystemSubmitting, setIsSystemSubmitting] = useState(false);

  const [isHorizontalFormOpen, setIsHorizontalFormOpen] = useState(false);
  const [deletingHorizontal, setDeletingHorizontal] = useState<Horizontal | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [isAiEstimating, setIsAiEstimating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [isSuggestStackDialogOpen, setIsSuggestStackDialogOpen] = useState(false);
  const [isAiSuggestingStack, setIsAiSuggestingStack] = useState(false);
  const [techStackSuggestions, setTechStackSuggestions] = useState<any[]>([]);
  const [suggestStackError, setSuggestStackError] = useState<string | null>(null);

  const [isSuggestHorizontalsDialogOpen, setIsSuggestHorizontalsDialogOpen] = useState(false);
  const [isAiSuggestingHorizontals, setIsAiSuggestingHorizontals] = useState(false);
  const [horizontalSuggestions, setHorizontalSuggestions] = useState<any[]>([]);
  const [suggestHorizontalsError, setSuggestHorizontalsError] = useState<string | null>(null);

  const estimationForm = useForm<z.infer<typeof estimationSchema>>({
    resolver: zodResolver(estimationSchema),
  });

  const systemForm = useForm<z.infer<typeof systemSchema>>({
    resolver: zodResolver(systemSchema),
    defaultValues: { name: '', description: '', category: 'Technology', estimate: undefined, dailyBillingRate: 0 },
  });
  
  const horizontalForm = useForm<z.infer<typeof horizontalFormSchema>>({
    resolver: zodResolver(horizontalFormSchema),
    defaultValues: { name: '', weightage: 0 },
  });

  useEffect(() => {
    if (project) {
      estimationForm.reset({ summary: project.summary || '' });
      if (project.summary) {
        setIsEditingSummary(false);
      }
    }
  }, [project, estimationForm]);

  useEffect(() => {
    if (isSystemDialogOpen) {
      if (editingSystem) {
        systemForm.reset({
          ...editingSystem,
          estimate: editingSystem.estimate || undefined,
          dailyBillingRate: editingSystem.dailyBillingRate || 0,
        });
      } else {
        systemForm.reset({ name: '', description: '', category: 'Technology', estimate: undefined, dailyBillingRate: 0 });
      }
    }
  }, [isSystemDialogOpen, editingSystem, systemForm]);
  
  const handleConfirmEstimation = async () => {
    setIsConfirming(true);
    const success = await confirmInitialEstimation();
    if (success) {
      toast({ title: 'Success', description: 'Initial estimation has been confirmed and copied to the project plan.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not confirm estimation.' });
    }
    setIsConfirming(false);
  };
  
  const handleAiEstimate = async () => {
    if (!project?.summary || initialImpactedSystems.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Project summary and at least one impacted system are required.'});
      return;
    }
    setIsAiEstimating(true);
    setAiError(null);
    try {
      const result = await getAiEstimates({
        projectSummary: project.summary,
        impactedSystems: initialImpactedSystems.map(({ id, name, description }) => ({ id, name, description })),
        horizontals: initialHorizontals.map(({ id, name }) => ({ id, name })),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const { systemEstimates, horizontalEstimates } = result.estimates;
      
      const systemPromises = systemEstimates.map(est => updateInitialImpactedSystem(est.id, { name: est.name, estimate: est.estimate }));
      const horizontalPromises = horizontalEstimates.map(est => updateInitialHorizontal(est.id, { name: est.name, weightage: est.weightage, isEnabled: true }));
      
      await Promise.all([...systemPromises, ...horizontalPromises]);

      toast({ title: 'Success', description: 'AI estimates have been applied.' });

    } catch (e: any) {
      setAiError(e.message || 'An unknown error occurred.');
      toast({ variant: 'destructive', title: 'AI Estimation Failed', description: e.message || 'Could not get AI estimates.' });
    } finally {
      setIsAiEstimating(false);
    }
  };

  const handleSuggestTechStack = async (force: boolean = false) => {
    if (!project?.summary) return;
    setIsSuggestStackDialogOpen(true);
    
    if (!force && techStackSuggestions.length > 0) {
      return;
    }

    setIsAiSuggestingStack(true);
    setSuggestStackError(null);
    setTechStackSuggestions([]);

    try {
      const result = await getAiTechStackSuggestions({ projectSummary: project.summary });
      if ('error' in result && result.error) {
         throw new Error(result.error);
      }
      setTechStackSuggestions(result.stacks || []);
    } catch (e: any) {
      setSuggestStackError(e.message || 'Failed to get tech stack suggestions.');
    } finally {
      setIsAiSuggestingStack(false);
    }
  };

  const handleSelectTechStack = async (stack: any) => {
    try {
       const newSystems = stack.systems.map((sys: any) => ({
           name: sys.name,
           description: sys.description,
           category: sys.category,
           estimate: undefined,
           dailyBillingRate: 0
       }));
       
       await replaceInitialImpactedSystems(newSystems);
       
       toast({ title: 'Success', description: `Applied ${stack.name} systems` });
       setIsSuggestStackDialogOpen(false);
    } catch(e) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to apply systems from tech stack.' });
    }
  };

  const handleSuggestHorizontals = async (force: boolean = false) => {
    if (!project?.summary) return;
    setIsSuggestHorizontalsDialogOpen(true);

    if (!force && horizontalSuggestions.length > 0) {
      return;
    }

    setIsAiSuggestingHorizontals(true);
    setSuggestHorizontalsError(null);
    setHorizontalSuggestions([]);

    try {
      const result = await getAiHorizontalSuggestions({ projectSummary: project.summary });
      if ('error' in result && result.error) {
         throw new Error(result.error);
      }
      setHorizontalSuggestions(result.strategies || []);
    } catch (e: any) {
      setSuggestHorizontalsError(e.message || 'Failed to get horizontal strategy suggestions.');
    } finally {
      setIsAiSuggestingHorizontals(false);
    }
  };

  const handleSelectHorizontalStrategy = async (strategy: any) => {
    try {
       const newHorizontals = strategy.horizontals.map((hor: any) => ({
           name: hor.name,
           weightage: hor.weightage,
           isEnabled: true
       }));

       await replaceInitialHorizontals(newHorizontals);
       
       toast({ title: 'Success', description: `Applied ${strategy.name} strategy` });
       setIsSuggestHorizontalsDialogOpen(false);
    } catch(e) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to apply horizontal strategy.' });
    }
  };

  const onSummarySubmit = async (values: z.infer<typeof estimationSchema>) => {
    setIsSubmitting(true);
    try {
      if (project && project.summary !== values.summary) {
        const projectSuccess = await updateProject({ summary: values.summary });
        if (projectSuccess) {
          toast({ title: "Success", description: "Initial estimation saved successfully." });
          setIsEditingSummary(false);
        } else {
          toast({ variant: "destructive", title: "Failure", description: "Failed to save estimation." });
        }
      } else {
        toast({ title: "No Changes", description: "No changes to save." });
        setIsEditingSummary(false);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An error occurred while saving." });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSystemDialogOpen = (system: ImpactedSystem | null) => {
    setEditingSystem(system);
    setIsSystemDialogOpen(true);
  };

  const handleDeleteSystemConfirm = async () => {
    if (!deletingSystem) return;
    const success = await deleteInitialImpactedSystem(deletingSystem.id);
    if (success) {
      toast({ title: "Success", description: "Impacted system deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete impacted system." });
    }
    setDeletingSystem(null);
  };

  const onSystemSubmit = async (values: z.infer<typeof systemSchema>) => {
    setIsSystemSubmitting(true);
    const success = editingSystem
      ? await updateInitialImpactedSystem(editingSystem.id, values)
      : await addInitialImpactedSystem(values);

    if (success) {
      toast({ title: "Success", description: `System ${editingSystem ? 'updated' : 'added'} successfully.` });
      setIsSystemDialogOpen(false);
      setEditingSystem(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingSystem ? 'update' : 'add'} system.` });
    }
    setIsSystemSubmitting(false);
  };

  const onHorizontalSubmit = async (values: z.infer<typeof horizontalFormSchema>) => {
    const success = await addInitialHorizontal({
      name: values.name,
      weightage: values.weightage,
      isEnabled: true
    });
    if (success) {
      toast({ title: "Success", description: `Horizontal "${values.name}" added.` });
      setIsHorizontalFormOpen(false);
      horizontalForm.reset();
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not add horizontal." });
    }
  };
  
  const handleDeleteHorizontalConfirm = async () => {
    if (!deletingHorizontal) return;
    const success = await deleteInitialHorizontal(deletingHorizontal.id);
    if (success) {
      toast({ title: "Success", description: "Horizontal deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete horizontal." });
    }
    setDeletingHorizontal(null);
  };

  const totalDevEffort = initialImpactedSystems.reduce((acc, system) => acc + (system.estimate || 0), 0);
  const totalDevCost = initialImpactedSystems.reduce((acc, system) => acc + ((system.estimate || 0) * (system.dailyBillingRate || 0)), 0);

  const averageDevRate = totalDevEffort > 0 ? totalDevCost / totalDevEffort : 0;
  
  const totalHorizontalEffort = initialHorizontals.reduce((acc, h) => {
      return acc + (totalDevEffort * (h.weightage / 100));
  }, 0);

  const totalHorizontalCost = initialHorizontals.reduce((acc, h) => {
    const horizontalEffort = (totalDevEffort * (h.weightage / 100));
    const rate = h.dailyBillingRate === undefined ? averageDevRate : h.dailyBillingRate;
    return acc + (horizontalEffort * rate);
  }, 0);


  const grandTotalEffort = totalDevEffort + totalHorizontalEffort;
  const grandTotalCost = totalDevCost + totalHorizontalCost;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Ballpark Estimation" description="Define the project summary and impacted systems for an initial estimate.">
        </PageHeader>
        
        {aiError && (
          <Alert variant="destructive">
            <AlertTitle>AI Estimation Error</AlertTitle>
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Project Summary</CardTitle>
                  <CardDescription>Provide a brief overview of the project's goals and scope.</CardDescription>
              </div>
              {!isEditingSummary && project?.status === 'Initial Estimation' && (
                <Button onClick={() => setIsEditingSummary(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
          </CardHeader>
          <CardContent>
            {isEditingSummary && project?.status === 'Initial Estimation' ? (
               <Form {...estimationForm}>
                  <form onSubmit={estimationForm.handleSubmit(onSummarySubmit)} className="space-y-4">
                    <FormField
                      control={estimationForm.control}
                      name="summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea rows={5} placeholder="Enter project summary..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSubmitting}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                  </form>
                </Form>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project?.summary || "No summary provided."}</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="mt-6">
           <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Impacted Systems</CardTitle>
              <CardDescription>Manage all systems impacted by the project.</CardDescription>
            </div>
            {project?.status === 'Initial Estimation' && (
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                           variant="outline"
                           onClick={handleSuggestTechStack}
                           disabled={!project?.summary || isEditingSummary}
                        >
                          <Bot className="mr-2 h-4 w-4" />
                          Stack Suggest
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI based architecture suggestion</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button onClick={() => handleSystemDialogOpen(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add System
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead>Effort (man-days)</TableHead>
                  <TableHead>Daily Billing Rate (USD)</TableHead>
                  <TableHead>Cost (USD)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialImpactedSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell className="font-medium">{system.name}</TableCell>
                    <TableCell>{system.estimate || 'N/A'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={system.dailyBillingRate}
                        onBlur={(e) => {
                            const newRate = parseFloat(e.target.value);
                            if (!isNaN(newRate) && newRate !== system.dailyBillingRate) {
                                updateInitialImpactedSystem(system.id, { dailyBillingRate: newRate });
                            } else if (e.target.value === '' && system.dailyBillingRate !== undefined) {
                                updateInitialImpactedSystem(system.id, { dailyBillingRate: undefined });
                            }
                        }}
                        className="w-24"
                        readOnly={project?.status !== 'Initial Estimation'}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>${((system.estimate || 0) * (system.dailyBillingRate || 0)).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                       {project?.status === 'Initial Estimation' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleSystemDialogOpen(system)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingSystem(system)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-right font-bold">Total Development Effort</TableCell>
                  <TableCell className="font-bold">{totalDevEffort}</TableCell>
                  <TableCell />
                  <TableCell className="font-bold">${totalDevCost.toFixed(2)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Horizontals</CardTitle>
                    <CardDescription>Effort derived from the Total Development Effort.</CardDescription>
                </div>
                {project?.status === 'Initial Estimation' && (
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button 
                               variant="outline"
                               onClick={handleSuggestHorizontals}
                               disabled={!project?.summary || isEditingSummary}
                            >
                              <Bot className="mr-2 h-4 w-4" />
                              Horizontals Suggest
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>AI based horizontals suggestion</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button onClick={() => setIsHorizontalFormOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Horizontal
                    </Button>
                  </div>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Horizontal</TableHead>
                            <TableHead>Weightage (%)</TableHead>
                            <TableHead>Effort (man-days)</TableHead>
                            <TableHead>Daily Billing Rate (USD)</TableHead>
                            <TableHead>Cost (USD)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialHorizontals.map(h => {
                            const horizontalEffort = (totalDevEffort * (h.weightage / 100));
                            const rate = h.dailyBillingRate === undefined ? averageDevRate : h.dailyBillingRate;
                            const cost = horizontalEffort * rate;
                            return (
                                <TableRow key={h.id}>
                                    <TableCell className="font-medium">{h.name}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            defaultValue={h.weightage}
                                            onBlur={(e) => {
                                                const newWeightage = parseFloat(e.target.value);
                                                if (!isNaN(newWeightage) && newWeightage !== h.weightage) {
                                                    updateInitialHorizontal(h.id, { weightage: newWeightage });
                                                }
                                            }}
                                            className="w-24"
                                            readOnly={project?.status !== 'Initial Estimation'}
                                        />
                                    </TableCell>
                                    <TableCell>{horizontalEffort.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            defaultValue={h.dailyBillingRate}
                                            placeholder={averageDevRate.toFixed(2)}
                                            onBlur={(e) => {
                                                const newRate = parseFloat(e.target.value);
                                                if (!isNaN(newRate) && newRate !== h.dailyBillingRate) {
                                                    updateInitialHorizontal(h.id, { dailyBillingRate: newRate });
                                                } else if (e.target.value === '' && h.dailyBillingRate !== undefined) {
                                                    updateInitialHorizontal(h.id, { dailyBillingRate: undefined });
                                                }
                                            }}
                                            className="w-24"
                                            readOnly={project?.status !== 'Initial Estimation'}
                                        />
                                    </TableCell>
                                    <TableCell>${cost.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {project?.status === 'Initial Estimation' && (
                                            <Button variant="ghost" size="icon" onClick={() => setDeletingHorizontal(h)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                     <TableFooter>
                        {project?.status === 'Initial Estimation' && isHorizontalFormOpen && (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <div className="mt-4 pt-4 border-t">
                                        <h4 className="font-medium mb-2">Add New Horizontal</h4>
                                        <Form {...horizontalForm}>
                                            <form onSubmit={horizontalForm.handleSubmit(onHorizontalSubmit)} className="flex items-start gap-4">
                                               <FormField
                                                control={horizontalForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                  <FormItem className="flex-1">
                                                    <FormLabel>Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g. Security" {...field} /></FormControl>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                                <FormField
                                                control={horizontalForm.control}
                                                name="weightage"
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel>Weightage (%)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="10" {...field} /></FormControl>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                              <div className="pt-8">
                                                <Button type="submit">Add</Button>
                                                <Button type="button" variant="ghost" onClick={() => setIsHorizontalFormOpen(false)}>Cancel</Button>
                                              </div>
                                            </form>
                                        </Form>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow>
                          <TableCell colSpan={2} className="text-right font-bold">Total Horizontal Effort</TableCell>
                          <TableCell className="font-bold">{totalHorizontalEffort.toFixed(2)}</TableCell>
                          <TableCell />
                          <TableCell className="font-bold">${totalHorizontalCost.toFixed(2)}</TableCell>
                          <TableCell />
                        </TableRow>
                        <TableRow className="bg-muted/80 hover:bg-muted/80">
                            <TableCell colSpan={2} className="text-right font-bold text-lg">Grand Total Effort (man-days)</TableCell>
                            <TableCell className="font-bold text-lg">{grandTotalEffort.toFixed(2)}</TableCell>
                            <TableCell />
                            <TableCell className="font-bold text-lg">${grandTotalCost.toFixed(2)}</TableCell>
                            <TableCell />
                        </TableRow>
                      </TableFooter>
                </Table>
            </CardContent>
        </Card>

        {project?.status === 'Initial Estimation' && (
          <div className="flex justify-end mt-6 gap-4">
            <Button 
              variant="outline"
              size="lg"
              onClick={handleAiEstimate}
              disabled={isAiEstimating || !project?.summary || initialImpactedSystems.length === 0}
            >
              <GeminiIcon className="mr-2 h-4 w-4" />
              {isAiEstimating ? 'Estimating...' : 'AI Estimator'}
            </Button>
            <Button onClick={handleConfirmEstimation} disabled={isConfirming} size="lg">
              <CheckCircle className="mr-2 h-4 w-4" />
              {isConfirming ? 'Confirming...' : 'Confirm Estimation'}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isSystemDialogOpen} onOpenChange={(open) => { setIsSystemDialogOpen(open); if (!open) setEditingSystem(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSystem ? 'Edit System' : 'Add New System'}</DialogTitle>
          </DialogHeader>
          <Form {...systemForm}>
            <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-4">
              <FormField
                control={systemForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Name</FormLabel>
                    <FormControl><Input placeholder="E.g., User Authentication API" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={systemForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the system and its impact..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={systemForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={systemForm.control}
                  name="estimate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimation (man-days)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                  control={systemForm.control}
                  name="dailyBillingRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Billing Rate (USD)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <DialogFooter>
                <Button type="submit" disabled={isSystemSubmitting}>
                  {isSystemSubmitting ? (editingSystem ? 'Saving...' : 'Creating...') : (editingSystem ? 'Save Changes' : 'Create System')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingSystem} onOpenChange={(isOpen) => !isOpen && setDeletingSystem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the system definition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSystemConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!deletingHorizontal} onOpenChange={(isOpen) => !isOpen && setDeletingHorizontal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the horizontal "{deletingHorizontal?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteHorizontalConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isSuggestStackDialogOpen} onOpenChange={setIsSuggestStackDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>AI Tech Stack Suggestions</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => handleSuggestTechStack(true)} disabled={isAiSuggestingStack}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
            </Button>
          </DialogHeader>
          <div className="space-y-4">
             {isAiSuggestingStack && (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                   <Bot className="h-8 w-8 mb-4 animate-pulse" />
                   <p>Analyzing project summary and generating stack options...</p>
                </div>
             )}
             {suggestStackError && (
               <Alert variant="destructive">
                 <AlertTitle>Error</AlertTitle>
                 <AlertDescription>{suggestStackError}</AlertDescription>
               </Alert>
             )}
             {!isAiSuggestingStack && techStackSuggestions.length > 0 && (
                <div className="grid gap-4">
                   {techStackSuggestions.map((stack, idx) => (
                      <Card key={idx}>
                         <CardHeader>
                            <CardTitle>{stack.name}</CardTitle>
                            <CardDescription>{stack.description}</CardDescription>
                         </CardHeader>
                         <CardContent>
                            <ul className="list-disc pl-5 space-y-1 mb-4 text-sm">
                               {stack.systems.map((sys: any, i: number) => (
                                  <li key={i}><strong>{sys.name}</strong> ({sys.category}): {sys.description}</li>
                               ))}
                            </ul>
                            <div className="flex justify-end">
                                <Button onClick={() => handleSelectTechStack(stack)}>Select this Stack</Button>
                            </div>
                         </CardContent>
                      </Card>
                   ))}
                </div>
             )}
          </div>
          <DialogFooter className="mt-4">
             <Button variant="ghost" onClick={() => setIsSuggestStackDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSuggestHorizontalsDialogOpen} onOpenChange={setIsSuggestHorizontalsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>AI Horizontal Strategy Suggestions</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => handleSuggestHorizontals(true)} disabled={isAiSuggestingHorizontals}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
            </Button>
          </DialogHeader>
          <div className="space-y-4">
             {isAiSuggestingHorizontals && (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                   <Bot className="h-8 w-8 mb-4 animate-pulse" />
                   <p>Analyzing project summary and generating horizontal strategies...</p>
                </div>
             )}
             {suggestHorizontalsError && (
               <Alert variant="destructive">
                 <AlertTitle>Error</AlertTitle>
                 <AlertDescription>{suggestHorizontalsError}</AlertDescription>
               </Alert>
             )}
             {!isAiSuggestingHorizontals && horizontalSuggestions.length > 0 && (
                <div className="grid gap-4">
                   {horizontalSuggestions.map((strategy, idx) => (
                      <Card key={idx}>
                         <CardHeader>
                            <CardTitle>{strategy.name}</CardTitle>
                            <CardDescription>{strategy.description}</CardDescription>
                         </CardHeader>
                         <CardContent>
                            <ul className="list-disc pl-5 space-y-1 mb-4 text-sm">
                               {strategy.horizontals.map((hor: any, i: number) => (
                                  <li key={i}><strong>{hor.name}</strong>: {hor.weightage}%</li>
                               ))}
                            </ul>
                            <div className="flex justify-end">
                                <Button onClick={() => handleSelectHorizontalStrategy(strategy)}>Apply Strategy</Button>
                            </div>
                         </CardContent>
                      </Card>
                   ))}
                </div>
             )}
          </div>
          <DialogFooter className="mt-4">
             <Button variant="ghost" onClick={() => setIsSuggestHorizontalsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
