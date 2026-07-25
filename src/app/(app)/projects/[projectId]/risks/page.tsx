

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
import { PlusCircle, Edit, Trash2, Bot } from 'lucide-react';
import type { Risk, RiskSeverity, RiskProbability } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { getAiRiskSuggestions } from '@/app/actions';

const riskSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  severity: z.coerce.number().min(1).max(3),
  probability: z.coerce.number().min(1).max(3),
  mitigationPlan: z.string().min(1, 'Mitigation Plan is required.'),
  residualRisk: z.string().min(1, 'Residual Risk is required.'),
  contingencyPlan: z.string().min(1, 'Contingency Plan is required.'),
});

const severityOptions: { value: RiskSeverity, label: string }[] = [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
];

const probabilityOptions: { value: RiskProbability, label: string }[] = [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
];

function getRiskPotential(severity: number, probability: number) {
  const potential = severity * probability;
  if (potential <= 3) {
    return { label: 'Low', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  }
  if (potential <= 6) {
    return { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
  }
  return { label: 'High', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
}

export default function RisksPage() {
  const { project, risks, addRisk, updateRisk, deleteRisk } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenOpen, setIsAiGenOpen] = useState(false);
  const [isAiGenSubmitting, setIsAiGenSubmitting] = useState(false);
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);


  const form = useForm<z.infer<typeof riskSchema>>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
        description: '',
        severity: 1,
        probability: 1,
        mitigationPlan: '',
        residualRisk: '',
        contingencyPlan: '',
    }
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingRisk) {
        form.reset(editingRisk);
      } else {
        form.reset({
            description: '',
            severity: 1,
            probability: 1,
            mitigationPlan: '',
            residualRisk: '',
            contingencyPlan: '',
        });
      }
    }
  }, [isDialogOpen, editingRisk, form]);
  
  const onAiGenSubmit = async () => {
    if (!project?.summary) {
      toast({ variant: 'destructive', title: 'Error', description: 'A project summary is required to generate risks.' });
      return;
    }
    setIsAiGenSubmitting(true);
    try {
      const result = await getAiRiskSuggestions({ projectSummary: project.summary }) as any;
      if (result.error) {
        throw new Error(result.error);
      }

      for (const risk of (result.risks || [])) {
        await addRisk(risk);
      }
      toast({ title: 'Success', description: `${(result.risks || []).length} risks generated successfully.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not generate risks.' });
    } finally {
      setIsAiGenSubmitting(false);
      setIsAiGenOpen(false);
    }
  };

  const handleDialogOpen = (risk: Risk | null) => {
    setEditingRisk(risk);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRisk) return;
    const success = await deleteRisk(deletingRisk.id);
    if (success) {
      toast({ title: "Success", description: "Risk moved to trash." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not move risk to trash." });
    }
    setDeletingRisk(null);
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (selectedRisks.length === 0) return;
    
    const promises = selectedRisks.map(id => deleteRisk(id));
    const results = await Promise.all(promises);

    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
        toast({ title: "Success", description: `${successCount} risk(s) moved to trash.` });
    }
    if (successCount < selectedRisks.length) {
        toast({ variant: "destructive", title: "Error", description: `Could not move ${selectedRisks.length - successCount} risk(s) to trash.` });
    }
    
    setSelectedRisks([]);
    setShowBulkDeleteConfirm(false);
  };

  const onSubmit = async (values: z.infer<typeof riskSchema>) => {
    setIsSubmitting(true);
    const riskData = {
        ...values,
        severity: values.severity as RiskSeverity,
        probability: values.probability as RiskProbability,
    };

    const success = editingRisk
      ? await updateRisk(editingRisk.id, riskData)
      : await addRisk(riskData);

    if (success) {
      toast({ title: "Success", description: `Risk ${editingRisk ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingRisk(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingRisk ? 'update' : 'add'} risk.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Risks" description="Manage and track all project risks.">
          {selectedRisks.length > 0 && (
            <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRisks.length})
            </Button>
          )}
          <Dialog open={isAiGenOpen} onOpenChange={setIsAiGenOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    AI Risk Gen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Risks with AI</DialogTitle>
                    <DialogDescription>The AI will analyze the project summary to generate relevant project risks. Do you want to proceed?</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAiGenOpen(false)}>Cancel</Button>
                    <Button onClick={onAiGenSubmit} disabled={isAiGenSubmitting}>
                        {isAiGenSubmitting ? 'Generating...' : 'Proceed'}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Risk
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                    <Checkbox
                        checked={risks.length > 0 && selectedRisks.length === risks.length}
                        onCheckedChange={(value) =>
                            setSelectedRisks(value ? risks.map(item => item.id) : [])
                        }
                        aria-label="Select all"
                    />
                </TableHead>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead className="w-[30%]">Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Risk Potential</TableHead>
                <TableHead>Mitigation Plan</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {risks.map((risk) => {
                const potential = getRiskPotential(risk.severity, risk.probability);
                return (
                    <TableRow key={risk.id} data-state={selectedRisks.includes(risk.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedRisks.includes(risk.id)}
                                onCheckedChange={(value) =>
                                    setSelectedRisks(
                                        value
                                        ? [...selectedRisks, risk.id]
                                        : selectedRisks.filter((id) => id !== risk.id)
                                    )
                                }
                                aria-label="Select row"
                            />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{risk.riskId}</TableCell>
                        <TableCell className="break-words">{risk.description}</TableCell>
                        <TableCell>{severityOptions.find(o => o.value === risk.severity)?.label}</TableCell>
                        <TableCell>{probabilityOptions.find(o => o.value === risk.probability)?.label}</TableCell>
                        <TableCell>
                            <Badge className={cn('font-semibold', potential.className)}>{potential.label}</Badge>
                        </TableCell>
                        <TableCell className="break-words">{risk.mitigationPlan}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(risk)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeletingRisk(risk)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingRisk(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add New Risk'}</DialogTitle>
            <DialogDescription>
              {editingRisk ? 'Update the details for this risk.' : 'Fill in the details for the new risk.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Risk Description</FormLabel>
                        <FormControl><Textarea placeholder="Describe the potential risk..." {...field} rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="severity" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value.toString()}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {severityOptions.map(opt => <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="probability" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Probability</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value.toString()}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {probabilityOptions.map(opt => <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                <FormField control={form.control} name="mitigationPlan" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mitigation Plan</FormLabel>
                        <FormControl><Textarea placeholder="Describe the plan to mitigate this risk..." {...field} rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="residualRisk" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Residual Risk</FormLabel>
                        <FormControl><Textarea placeholder="Describe the risk that remains after mitigation..." {...field} rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="contingencyPlan" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contingency Plan</FormLabel>
                        <FormControl><Textarea placeholder="Describe the plan if the risk materializes..." {...field} rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingRisk ? 'Saving...' : 'Creating...') : (editingRisk ? 'Save Changes' : 'Create Risk')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingRisk} onOpenChange={(isOpen) => !isOpen && setDeletingRisk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the risk to the trash. It will be permanently deleted after 30 days.
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
              This will move the selected {selectedRisks.length} risk(s) to the trash.
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
