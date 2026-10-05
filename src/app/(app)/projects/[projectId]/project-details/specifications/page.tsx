
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, GripVertical, Save, Bot, RefreshCcw } from 'lucide-react';
import { type Environment, type ImpactedSystem, type ImpactedSystemCategory, Horizontal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn, formatRateInput } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAiTechStackSuggestions, getAiHorizontalSuggestions } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AiLoadingState } from '@/components/AiLoadingState';

const summarySchema = z.object({
  summary: z.string().optional(),
});

const environmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required.'),
});

const systemSchema = z.object({
  name: z.string().min(1, 'System name is required.'),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['Technology', 'Function']),
  estimate: z.coerce.number().optional(),
  dailyBillingRate: z.coerce.number().optional(),
});

const horizontalSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  weightage: z.coerce.number().min(0, 'Weightage must be positive.').max(100, 'Weightage cannot exceed 100%.'),
});

const systemCategories: ImpactedSystemCategory[] = ['Technology', 'Function'];


function SortableItem({ environment, onDelete }: { environment: Environment, onDelete: (environment: Environment) => void }) {
    const { updateEnvironment } = useProject();
    const { toast } = useToast();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: environment.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    const handleRenameEnvironment = async (id: string, newName: string) => {
        if (!newName) {
          toast({ variant: 'destructive', title: 'Error', description: 'Environment name cannot be empty.' });
          return;
        }
        const success = await updateEnvironment(id, { name: newName });
        if (success) {
          toast({ title: 'Success', description: 'Environment renamed.' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not rename environment.' });
        }
    };
    
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-background p-2 rounded-md border">
            <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab" aria-label="Drag to reorder">
                <GripVertical className="h-5 w-5" />
            </Button>
            <Input
              defaultValue={environment.name}
              onBlur={(e) => {
                 if (e.target.value !== environment.name) {
                   handleRenameEnvironment(environment.id, e.target.value)
                 }
              }}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(environment)}
              aria-label="Delete environment"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}


export default function EnvironmentsPage() {
  const { 
    project,
    updateProject,
    environments, 
    addEnvironment, 
    updateEnvironment,
    deleteEnvironment, 
    updateEnvironmentOrder,
    impactedSystems,
    addImpactedSystem,
    updateImpactedSystem,
    deleteImpactedSystem,
    replaceImpactedSystems,
    horizontals,
    addHorizontal,
    updateHorizontal,
    deleteHorizontal,
    replaceHorizontals,
  } = useProject();
  const { toast } = useToast();
  
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isSummarySubmitting, setIsSummarySubmitting] = useState(false);

  // Environment State
  const [isEnvDialogOpen, setIsEnvDialogOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [deletingEnv, setDeletingEnv] = useState<Environment | null>(null);
  const [isEnvSubmitting, setIsEnvSubmitting] = useState(false);
  
  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  // System State
  const [isSystemDialogOpen, setIsSystemDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<ImpactedSystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<ImpactedSystem | null>(null);
  const [isSystemSubmitting, setIsSystemSubmitting] = useState(false);
  
  // Horizontal State
  const [isHorizontalDialogOpen, setIsHorizontalDialogOpen] = useState(false);
  const [editingHorizontal, setEditingHorizontal] = useState<Horizontal | null>(null);
  const [deletingHorizontal, setDeletingHorizontal] = useState<Horizontal | null>(null);
  const [isHorizontalSubmitting, setIsHorizontalSubmitting] = useState(false);

  const [isSuggestStackDialogOpen, setIsSuggestStackDialogOpen] = useState(false);
  const [isAiSuggestingStack, setIsAiSuggestingStack] = useState(false);
  const [techStackSuggestions, setTechStackSuggestions] = useState<any[]>([]);
  const [suggestStackError, setSuggestStackError] = useState<string | null>(null);

  const [isSuggestHorizontalsDialogOpen, setIsSuggestHorizontalsDialogOpen] = useState(false);
  const [isAiSuggestingHorizontals, setIsAiSuggestingHorizontals] = useState(false);
  const [horizontalSuggestions, setHorizontalSuggestions] = useState<any[]>([]);
  const [suggestHorizontalsError, setSuggestHorizontalsError] = useState<string | null>(null);
  
  const summaryForm = useForm<z.infer<typeof summarySchema>>({
    resolver: zodResolver(summarySchema),
    defaultValues: { summary: project?.summary || '' },
  });

  const envForm = useForm<z.infer<typeof environmentSchema>>({
    resolver: zodResolver(environmentSchema),
    defaultValues: { name: '' },
  });
  
  const systemForm = useForm<z.infer<typeof systemSchema>>({
    resolver: zodResolver(systemSchema),
    defaultValues: { name: '', description: '', category: 'Technology', estimate: undefined, dailyBillingRate: 0 },
  });
  
  const horizontalForm = useForm<z.infer<typeof horizontalSchema>>({
    resolver: zodResolver(horizontalSchema),
    defaultValues: { name: '', weightage: 0 },
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  useEffect(() => {
    if (project) {
        summaryForm.reset({ summary: project.summary || '' });
        if (!project.summary) {
            setIsEditingSummary(true);
        }
    }
  }, [project, summaryForm]);

  useEffect(() => {
    if (isEnvDialogOpen) {
      if (editingEnv) {
        envForm.reset({ name: editingEnv.name });
      } else {
        envForm.reset({ name: '' });
      }
    }
  }, [isEnvDialogOpen, editingEnv, envForm]);
  
  useEffect(() => {
    if (isSystemDialogOpen) {
      if (editingSystem) {
        systemForm.reset({
          ...editingSystem,
          estimate: editingSystem.estimate || undefined,
          dailyBillingRate: formatRateInput(editingSystem.dailyBillingRate) as any,
        });
      } else {
        systemForm.reset({ name: '', description: '', category: 'Technology', estimate: undefined, dailyBillingRate: '0.00' as any });
      }
    }
  }, [isSystemDialogOpen, editingSystem, systemForm]);
  
  useEffect(() => {
    if (isHorizontalDialogOpen) {
      if (editingHorizontal) {
        horizontalForm.reset(editingHorizontal);
      } else {
        horizontalForm.reset({ name: '', weightage: 0 });
      }
    }
  }, [isHorizontalDialogOpen, editingHorizontal, horizontalForm]);
  
  const onSummarySubmit = async (values: z.infer<typeof summarySchema>) => {
    setIsSummarySubmitting(true);
    const success = await updateProject({ summary: values.summary });
    if (success) {
      toast({ title: 'Success', description: 'Project summary updated.' });
      setIsEditingSummary(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update project summary.' });
    }
    setIsSummarySubmitting(false);
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
      if ('stacks' in result) {
        setTechStackSuggestions(result.stacks || []);
      }
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
           estimate: typeof sys.estimate === 'number' ? sys.estimate : (sys.estimate ? parseFloat(sys.estimate) : undefined),
           dailyBillingRate: typeof sys.dailyBillingRate === 'number' ? sys.dailyBillingRate : (sys.dailyBillingRate ? parseFloat(sys.dailyBillingRate) : 0),
       }));
       
       await replaceImpactedSystems(newSystems);
       
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
      const currentDevEffort = impactedSystems.reduce((acc, system) => acc + (system.estimate || 0), 0);
      const result = await getAiHorizontalSuggestions({
        projectSummary: project.summary,
        totalDevEffort: currentDevEffort > 0 ? currentDevEffort : undefined,
      });
      if ('error' in result && result.error) {
         throw new Error(result.error);
      }
      if ('strategies' in result) {
        setHorizontalSuggestions(result.strategies || []);
      }
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
           weightage: typeof hor.weightage === 'number' ? hor.weightage : (parseFloat(hor.weightage) || 0),
           isEnabled: true,
           dailyBillingRate: typeof hor.dailyBillingRate === 'number' ? hor.dailyBillingRate : (hor.dailyBillingRate ? parseFloat(hor.dailyBillingRate) : undefined),
       }));

       await replaceHorizontals(newHorizontals);
       
       toast({ title: 'Success', description: `Applied ${strategy.name} strategy` });
       setIsSuggestHorizontalsDialogOpen(false);
    } catch(e) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to apply horizontal strategy.' });
    }
  };

  const handleEnvDialogOpen = (environment: Environment | null) => {
    setEditingEnv(environment);
    setIsEnvDialogOpen(true);
  };
  
  const handleSystemDialogOpen = (system: ImpactedSystem | null) => {
    setEditingSystem(system);
    setIsSystemDialogOpen(true);
  };
  
  const handleHorizontalDialogOpen = (horizontal: Horizontal | null) => {
    setEditingHorizontal(horizontal);
    setIsHorizontalDialogOpen(true);
  };

  const handleEnvDeleteConfirm = async () => {
    if (!deletingEnv) return;
    const success = await deleteEnvironment(deletingEnv.id);
    if (success) {
      toast({ title: "Success", description: "Environment deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete environment." });
    }
    setDeletingEnv(null);
  };
  
  const handleSystemDeleteConfirm = async () => {
    if (!deletingSystem) return;
    const success = await deleteImpactedSystem(deletingSystem.id);
    if (success) {
      toast({ title: "Success", description: "Impacted system deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete impacted system." });
    }
    setDeletingSystem(null);
  };
  
  const handleHorizontalDeleteConfirm = async () => {
    if (!deletingHorizontal) return;
    const success = await deleteHorizontal(deletingHorizontal.id);
    if (success) {
      toast({ title: "Success", description: "Horizontal deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete horizontal." });
    }
    setDeletingHorizontal(null);
  };

  const onEnvSubmit = async (values: z.infer<typeof environmentSchema>) => {
    setIsEnvSubmitting(true);
    const success = editingEnv
      ? await updateEnvironment(editingEnv.id, values)
      : await addEnvironment(values);

    if (success) {
      toast({ title: "Success", description: `Environment ${editingEnv ? 'updated' : 'added'} successfully.` });
      setIsEnvDialogOpen(false);
      setEditingEnv(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingEnv ? 'update' : 'add'} environment.` });
    }
    setIsEnvSubmitting(false);
  };
  
  const onSystemSubmit = async (values: z.infer<typeof systemSchema>) => {
    setIsSystemSubmitting(true);
    const success = editingSystem
      ? await updateImpactedSystem(editingSystem.id, values)
      : await addImpactedSystem(values);

    if (success) {
      toast({ title: "Success", description: `System ${editingSystem ? 'updated' : 'added'} successfully.` });
      setIsSystemDialogOpen(false);
      setEditingSystem(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingSystem ? 'update' : 'add'} system.` });
    }
    setIsSystemSubmitting(false);
  };
  
  const onHorizontalSubmit = async (values: z.infer<typeof horizontalSchema>) => {
    setIsHorizontalSubmitting(true);
    const success = editingHorizontal
      ? await updateHorizontal(editingHorizontal.id, values)
      : await addHorizontal({ ...values, isEnabled: true });

    if (success) {
      toast({ title: "Success", description: `Horizontal ${editingHorizontal ? 'updated' : 'added'} successfully.` });
      setIsHorizontalDialogOpen(false);
      setEditingHorizontal(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingHorizontal ? 'update' : 'add'} horizontal.` });
    }
    setIsHorizontalSubmitting(false);
  };
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedEnvironments.findIndex((c) => c.id === active.id);
      const newIndex = sortedEnvironments.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        updateEnvironmentOrder(oldIndex, newIndex);
      }
    }
  }

  const totalDevEffort = impactedSystems.reduce((acc, system) => acc + (system.estimate || 0), 0);
  const totalDevCost = impactedSystems.reduce((acc, system) => acc + ((system.estimate || 0) * (system.dailyBillingRate || 0)), 0);

  const averageDevRate = totalDevEffort > 0 ? totalDevCost / totalDevEffort : 0;
  
  const totalHorizontalEffort = horizontals.reduce((acc, h) => {
      return acc + (totalDevEffort * (h.weightage / 100));
  }, 0);

  const totalHorizontalCost = horizontals.reduce((acc, h) => {
    const horizontalEffort = (totalDevEffort * (h.weightage / 100));
    const rate = h.dailyBillingRate === undefined ? averageDevRate : h.dailyBillingRate;
    return acc + (horizontalEffort * rate);
  }, 0);

  const grandTotalEffort = totalDevEffort + totalHorizontalEffort;
  const grandTotalCost = totalDevCost + totalHorizontalCost;

  return (
    <>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <PageHeader title="Specifications" description="Manage impacted systems and testing environments for the project." />
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Project Summary</CardTitle>
                  <CardDescription>A high-level overview of the project&apos;s goals and technical scope.</CardDescription>
              </div>
              {!isEditingSummary && (
                <Button onClick={() => setIsEditingSummary(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
          </CardHeader>
          <CardContent>
            {isEditingSummary ? (
               <Form {...summaryForm}>
                  <form onSubmit={summaryForm.handleSubmit(onSummarySubmit)} className="space-y-4">
                    <FormField
                      control={summaryForm.control}
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
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setIsEditingSummary(false)} disabled={isSummarySubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSummarySubmitting}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSummarySubmitting ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                  </form>
                </Form>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project?.summary || "No summary provided."}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Impacted Systems</CardTitle>
              <CardDescription>A list of systems that will be affected by this project.</CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                         variant="outline"
                         onClick={() => handleSuggestTechStack(false)}
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
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">System Name</TableHead>
                  <TableHead className="w-[30%]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Effort (man-days)</TableHead>
                  <TableHead>Daily Billing Rate (USD)</TableHead>
                  <TableHead>Cost (USD)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactedSystems.map((system) => (
                  <TableRow key={system.id}>
                    <TableCell className="font-medium">{system.name}</TableCell>
                    <TableCell>{system.description}</TableCell>
                    <TableCell>{system.category}</TableCell>
                    <TableCell>
                      <Input
                        key={`${system.id}-estimate-${system.estimate}`}
                        type="number"
                        step="any"
                        defaultValue={system.estimate !== undefined ? system.estimate : ''}
                        onWheel={(e) => e.currentTarget.blur()}
                        onBlur={(e) => {
                            const newEstimate = parseFloat(e.target.value);
                            if (!isNaN(newEstimate) && newEstimate !== system.estimate) {
                                updateImpactedSystem(system.id, { estimate: newEstimate });
                            } else if (e.target.value === '' && system.estimate !== undefined) {
                                updateImpactedSystem(system.id, { estimate: undefined });
                            }
                        }}
                        className="w-24 font-mono"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        key={`${system.id}-rate-${system.dailyBillingRate}`}
                        type="text"
                        inputMode="decimal"
                        defaultValue={formatRateInput(system.dailyBillingRate)}
                        onWheel={(e) => e.currentTarget.blur()}
                        onBlur={(e) => {
                            const val = e.target.value;
                            const newRate = parseFloat(val);
                            const finalRate = isNaN(newRate) || newRate < 0 ? 0 : newRate;
                            e.target.value = formatRateInput(finalRate);
                            if (finalRate !== system.dailyBillingRate) {
                                updateImpactedSystem(system.id, { dailyBillingRate: finalRate });
                            }
                        }}
                        className="w-24 font-mono"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>${((system.estimate || 0) * (system.dailyBillingRate || 0)).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleSystemDialogOpen(system)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingSystem(system)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Total Development Effort</TableCell>
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
              <CardTitle>Horizontal</CardTitle>
              <CardDescription>Manage horizontal capabilities for the project.</CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                         variant="outline"
                         onClick={() => handleSuggestHorizontals(false)}
                         disabled={!project?.summary || isEditingSummary}
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        Horizontal Suggest
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>AI based horizontal suggestion</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={() => handleHorizontalDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Horizontal
              </Button>
            </div>
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
                {horizontals.map((horizontal) => {
                  const horizontalEffort = (totalDevEffort * (horizontal.weightage / 100));
                  const rate = horizontal.dailyBillingRate === undefined ? averageDevRate : horizontal.dailyBillingRate;
                  const cost = horizontalEffort * rate;
                  return (
                    <TableRow key={horizontal.id}>
                      <TableCell className="font-medium">{horizontal.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={horizontal.weightage || ''}
                          onWheel={(e) => e.currentTarget.blur()}
                          onBlur={(e) => {
                              let newWeightage = parseFloat(e.target.value);
                              if (!isNaN(newWeightage)) {
                                  newWeightage = Math.max(0, Math.min(100, newWeightage));
                                  e.target.value = newWeightage.toString();
                                  if (newWeightage !== horizontal.weightage) {
                                      updateHorizontal(horizontal.id, { weightage: newWeightage });
                                  }
                              }
                          }}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>{horizontalEffort.toFixed(2)}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          inputMode="decimal"
                          defaultValue={horizontal.dailyBillingRate !== undefined ? formatRateInput(horizontal.dailyBillingRate) : ''}
                          placeholder={formatRateInput(averageDevRate)}
                          onWheel={(e) => e.currentTarget.blur()}
                          onBlur={(e) => {
                              const val = e.target.value;
                              if (val.trim() === '') {
                                if (horizontal.dailyBillingRate !== undefined) {
                                  updateHorizontal(horizontal.id, { dailyBillingRate: undefined });
                                }
                              } else {
                                const newRate = parseFloat(val);
                                const finalRate = isNaN(newRate) || newRate < 0 ? 0 : newRate;
                                e.target.value = formatRateInput(finalRate);
                                if (finalRate !== horizontal.dailyBillingRate) {
                                  updateHorizontal(horizontal.id, { dailyBillingRate: finalRate });
                                }
                              }
                          }}
                          className="w-24 font-mono"
                        />
                      </TableCell>
                      <TableCell>${cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleHorizontalDialogOpen(horizontal)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeletingHorizontal(horizontal)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Environments</CardTitle>
                <CardDescription>Manage and reorder testing environments for the project.</CardDescription>
            </div>
             <Button onClick={() => handleEnvDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Environment
            </Button>
          </CardHeader>
          <CardContent className="p-4">
             <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortedEnvironments} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {sortedEnvironments.map((env) => (
                           <SortableItem key={env.id} environment={env} onDelete={setDeletingEnv} />
                        ))}
                    </div>
                </SortableContext>
              </DndContext>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEnvDialogOpen} onOpenChange={(open) => { setIsEnvDialogOpen(open); if (!open) setEditingEnv(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEnv ? 'Edit Environment' : 'Add New Environment'}</DialogTitle>
          </DialogHeader>
          <Form {...envForm}>
            <form onSubmit={envForm.handleSubmit(onEnvSubmit)} className="space-y-4">
              <FormField
                control={envForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Staging" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isEnvSubmitting}>
                  {isEnvSubmitting ? (editingEnv ? 'Saving...' : 'Creating...') : (editingEnv ? 'Save Changes' : 'Add Environment')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isSystemDialogOpen} onOpenChange={(open) => { setIsSystemDialogOpen(open); if (!open) setEditingSystem(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingSystem ? 'Edit System' : 'Add New System'}</DialogTitle>
          </DialogHeader>
          <Form {...systemForm}>
            <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
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
                           {systemCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
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
                      <FormLabel>Effort (man-days)</FormLabel>
                      <FormControl><Input type="number" step="any" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl>
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
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length > 1 && /^0[0-9]/.test(val)) {
                            val = val.replace(/^0+/, '');
                          }
                          if (/^(0|[1-9]\d{0,11})?(\.\d{0,2})?$/.test(val)) {
                            field.onChange(val);
                          }
                        }}
                        onBlur={() => {
                          field.onChange(formatRateInput(field.value));
                        }}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                <Button type="submit" disabled={isSystemSubmitting}>
                  {isSystemSubmitting ? (editingSystem ? 'Saving...' : 'Creating...') : (editingSystem ? 'Save Changes' : 'Create System')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isHorizontalDialogOpen} onOpenChange={(open) => { setIsHorizontalDialogOpen(open); if (!open) setEditingHorizontal(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingHorizontal ? 'Edit Horizontal' : 'Add New Horizontal'}</DialogTitle>
          </DialogHeader>
          <Form {...horizontalForm}>
            <form onSubmit={horizontalForm.handleSubmit(onHorizontalSubmit)} className="space-y-4">
              <FormField
                control={horizontalForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="E.g., Security" {...field} /></FormControl>
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
              <DialogFooter>
                <Button type="submit" disabled={isHorizontalSubmitting}>
                  {isHorizontalSubmitting ? (editingHorizontal ? 'Saving...' : 'Creating...') : (editingHorizontal ? 'Save Changes' : 'Create Horizontal')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingEnv} onOpenChange={(isOpen) => !isOpen && setDeletingEnv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the environment &quot;{deletingEnv?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEnvDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!deletingSystem} onOpenChange={(isOpen) => !isOpen && setDeletingSystem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the system &quot;{deletingSystem?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSystemDeleteConfirm}
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
              This action cannot be undone. This will permanently delete the horizontal &quot;{deletingHorizontal?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleHorizontalDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isSuggestStackDialogOpen} onOpenChange={setIsSuggestStackDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>AI Tech Stack Suggestions</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => handleSuggestTechStack(true)} disabled={isAiSuggestingStack}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
             {isAiSuggestingStack && (
                <AiLoadingState type="stack" />
             )}
             {suggestStackError && (
               <Alert variant="destructive">
                 <AlertTitle>Error</AlertTitle>
                 <AlertDescription>{suggestStackError}</AlertDescription>
               </Alert>
             )}
             {!isAiSuggestingStack && techStackSuggestions.length > 0 && (
                <div className="grid gap-4">
                   {techStackSuggestions.map((stack, idx) => {
                      const totalStackEffort = stack.systems?.reduce((acc: number, sys: any) => acc + (Number(sys.estimate) || 0), 0) || 0;
                      const totalStackCost = stack.systems?.reduce((acc: number, sys: any) => acc + ((Number(sys.estimate) || 0) * (Number(sys.dailyBillingRate) || 0)), 0) || 0;
                      return (
                        <Card key={idx} className="border shadow-sm">
                           <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                 <div>
                                   <CardTitle className="text-lg">{stack.name}</CardTitle>
                                   <CardDescription className="mt-1">{stack.description}</CardDescription>
                                 </div>
                                 <div className="text-right shrink-0 ml-4">
                                   <div className="text-sm font-semibold">{totalStackEffort} man-days</div>
                                   <div className="text-xs text-muted-foreground font-mono">${totalStackCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} est. cost</div>
                                 </div>
                              </div>
                           </CardHeader>
                           <CardContent className="pt-0">
                              <div className="rounded-md border text-sm overflow-hidden mb-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50 text-xs">
                                      <TableHead className="py-2">System / Component</TableHead>
                                      <TableHead className="py-2">Category</TableHead>
                                      <TableHead className="py-2 text-right">Effort</TableHead>
                                      <TableHead className="py-2 text-right">Daily Rate</TableHead>
                                      <TableHead className="py-2 text-right">Est. Cost</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                     {stack.systems?.map((sys: any, i: number) => {
                                        const effort = Number(sys.estimate) || 0;
                                        const rate = Number(sys.dailyBillingRate) || 0;
                                        const cost = effort * rate;
                                        return (
                                          <TableRow key={i} className="text-xs">
                                             <TableCell className="py-2 font-medium">
                                                <div>{sys.name}</div>
                                                <div className="text-muted-foreground text-[11px] font-normal">{sys.description}</div>
                                             </TableCell>
                                             <TableCell className="py-2">
                                                <Badge variant="outline" className="text-[10px]">{sys.category}</Badge>
                                             </TableCell>
                                             <TableCell className="py-2 text-right font-mono">{effort > 0 ? `${effort} d` : '-'}</TableCell>
                                             <TableCell className="py-2 text-right font-mono">${rate.toFixed(2)}/d</TableCell>
                                             <TableCell className="py-2 text-right font-mono font-medium">${cost.toFixed(2)}</TableCell>
                                          </TableRow>
                                        );
                                     })}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="flex justify-end">
                                  <Button onClick={() => handleSelectTechStack(stack)}>Select this Stack</Button>
                              </div>
                           </CardContent>
                        </Card>
                      );
                   })}
                </div>
             )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
             <Button variant="ghost" onClick={() => setIsSuggestStackDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSuggestHorizontalsDialogOpen} onOpenChange={setIsSuggestHorizontalsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
            <DialogTitle>AI Horizontal Strategy Suggestions</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => handleSuggestHorizontals(true)} disabled={isAiSuggestingHorizontals}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
             {isAiSuggestingHorizontals && (
                <AiLoadingState type="horizontals" />
             )}
             {suggestHorizontalsError && (
               <Alert variant="destructive">
                 <AlertTitle>Error</AlertTitle>
                 <AlertDescription>{suggestHorizontalsError}</AlertDescription>
               </Alert>
             )}
             {!isAiSuggestingHorizontals && horizontalSuggestions.length > 0 && (
                <div className="grid gap-4">
                   {horizontalSuggestions.map((strategy, idx) => {
                      const totalStratEffort = strategy.horizontals?.reduce((acc: number, hor: any) => {
                         const effort = Number(hor.approximateEffort) || (totalDevEffort > 0 ? (totalDevEffort * (Number(hor.weightage) || 0) / 100) : 0);
                         return acc + effort;
                      }, 0) || 0;
                      const totalStratCost = strategy.horizontals?.reduce((acc: number, hor: any) => {
                         const effort = Number(hor.approximateEffort) || (totalDevEffort > 0 ? (totalDevEffort * (Number(hor.weightage) || 0) / 100) : 0);
                         const rate = Number(hor.dailyBillingRate) || 0;
                         return acc + (effort * rate);
                      }, 0) || 0;

                      return (
                        <Card key={idx} className="border shadow-sm">
                           <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                 <div>
                                   <CardTitle className="text-lg">{strategy.name}</CardTitle>
                                   <CardDescription className="mt-1">{strategy.description}</CardDescription>
                                 </div>
                                 <div className="text-right shrink-0 ml-4">
                                   <div className="text-sm font-semibold">{totalStratEffort > 0 ? `${totalStratEffort.toFixed(1)} man-days` : ''}</div>
                                   <div className="text-xs text-muted-foreground font-mono">${totalStratCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} est. cost</div>
                                 </div>
                              </div>
                           </CardHeader>
                           <CardContent className="pt-0">
                              <div className="rounded-md border text-sm overflow-hidden mb-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50 text-xs">
                                      <TableHead className="py-2">Horizontal</TableHead>
                                      <TableHead className="py-2 text-right">Weightage</TableHead>
                                      <TableHead className="py-2 text-right">Approx. Effort</TableHead>
                                      <TableHead className="py-2 text-right">Daily Rate</TableHead>
                                      <TableHead className="py-2 text-right">Est. Cost</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                     {strategy.horizontals?.map((hor: any, i: number) => {
                                        const weightage = Number(hor.weightage) || 0;
                                        const effort = Number(hor.approximateEffort) || (totalDevEffort > 0 ? (totalDevEffort * weightage / 100) : 0);
                                        const rate = Number(hor.dailyBillingRate) || 0;
                                        const cost = effort * rate;
                                        return (
                                          <TableRow key={i} className="text-xs">
                                             <TableCell className="py-2 font-medium">{hor.name}</TableCell>
                                             <TableCell className="py-2 text-right font-mono">{weightage}%</TableCell>
                                             <TableCell className="py-2 text-right font-mono">{effort > 0 ? `${effort.toFixed(1)} d` : '-'}</TableCell>
                                             <TableCell className="py-2 text-right font-mono">${rate.toFixed(2)}/d</TableCell>
                                             <TableCell className="py-2 text-right font-mono font-medium">${cost.toFixed(2)}</TableCell>
                                          </TableRow>
                                        );
                                     })}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="flex justify-end">
                                  <Button onClick={() => handleSelectHorizontalStrategy(strategy)}>Apply Strategy</Button>
                              </div>
                           </CardContent>
                        </Card>
                      );
                   })}
                </div>
             )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
             <Button variant="ghost" onClick={() => setIsSuggestHorizontalsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
