
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
});

export default function InitialEstimationPage() {
  const { project, updateProject } = useProject();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof estimationSchema>>({
    resolver: zodResolver(estimationSchema),
  });

  useEffect(() => {
    if (project) {
      form.reset({
        summary: project.summary || '',
      });
    }
  }, [project, form]);

  const onSubmit = async (values: z.infer<typeof estimationSchema>) => {
    setIsSubmitting(true);
    try {
      if (project && project.summary !== values.summary) {
        const projectSuccess = await updateProject({ summary: values.summary });
        if (projectSuccess) {
          toast({ title: "Success", description: "Initial estimation saved successfully." });
        } else {
          toast({ variant: "destructive", title: "Failure", description: "Failed to save estimation." });
        }
      } else {
        toast({ title: "No Changes", description: "No changes to save." });
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
          <PageHeader title="Initial Estimation" description="Provide a high-level summary of the project.">
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Summary'}
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
        </form>
      </Form>
    </div>
  );
}
