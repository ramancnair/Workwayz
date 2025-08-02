
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import { type ImpactedSystem } from '@/types';

const estimationSchema = z.object({
  summary: z.string().optional(),
  systems: z.array(z.object({
    id: z.string(),
    explanation: z.string().optional(),
    estimate: z.coerce.number().optional(),
  })),
});

export default function InitialEstimationPage() {
  const { project, impactedSystems, updateProject, updateImpactedSystem } = useProject();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof estimationSchema>>({
    resolver: zodResolver(estimationSchema),
  });

  useEffect(() => {
    if (project && impactedSystems) {
      form.reset({
        summary: project.summary || '',
        systems: impactedSystems.map(system => ({
          id: system.id,
          explanation: system.explanation || '',
          estimate: system.estimate || 0,
        })),
      });
    }
  }, [project, impactedSystems, form]);

  const onSubmit = async (values: z.infer<typeof estimationSchema>) => {
    setIsSubmitting(true);
    let allSucceeded = true;

    try {
      // Update project summary
      if (project && project.summary !== values.summary) {
        const projectSuccess = await updateProject({ summary: values.summary });
        if (!projectSuccess) allSucceeded = false;
      }

      // Update each impacted system
      for (const systemData of values.systems) {
        const originalSystem = impactedSystems.find(s => s.id === systemData.id);
        if (originalSystem && (originalSystem.explanation !== systemData.explanation || originalSystem.estimate !== systemData.estimate)) {
          const systemSuccess = await updateImpactedSystem(systemData.id, {
            explanation: systemData.explanation,
            estimate: systemData.estimate,
          });
          if (!systemSuccess) allSucceeded = false;
        }
      }
      
      if (allSucceeded) {
        toast({ title: "Success", description: "Initial estimation saved successfully." });
      } else {
        toast({ variant: "destructive", title: "Partial Failure", description: "Some updates failed to save." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An error occurred while saving." });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <PageHeader title="Initial Estimation" description="Provide a high-level summary and man-day estimates for impacted systems.">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Estimation'}
            </Button>
          </PageHeader>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Project Summary</CardTitle>
              <CardDescription>Provide a brief overview of the project's goals and scope.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
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
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Impacted System Estimates</CardTitle>
              <CardDescription>Explain the impact and provide a man-day estimate for each system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-[200px_1fr_150px] items-center gap-4 font-medium text-muted-foreground px-2 py-1 text-sm">
                    <div>System Name</div>
                    <div>Explanation of Impact</div>
                    <div>Estimate (Man-Days)</div>
                </div>
                <div className="space-y-4">
                    {form.getValues('systems')?.map((system, index) => {
                       const systemDetails = impactedSystems.find(s=>s.id === system.id);
                       return (
                        <div key={system.id} className="grid grid-cols-[200px_1fr_150px] items-start gap-4 p-2 rounded-md hover:bg-muted/50">
                            <div className="font-semibold pt-2">{systemDetails?.name}</div>
                            <FormField
                                control={form.control}
                                name={`systems.${index}.explanation`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                    <Textarea placeholder={`Describe how ${systemDetails?.name} is impacted...`} {...field} className="min-h-0" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`systems.${index}.estimate`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                    <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                       );
                    })}
                </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
