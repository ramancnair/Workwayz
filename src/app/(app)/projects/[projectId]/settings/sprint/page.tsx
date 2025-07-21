

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const sprintSettingsSchema = z.object({
    sprintDurationInWeeks: z.coerce.number().min(1, 'Duration must be at least 1 week.').max(8, 'Duration cannot exceed 8 weeks.'),
    sprintStartDay: z.coerce.number().min(0).max(6),
});

const weekDays = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

export default function SprintSettingsPage() {
  const { projectSettings, updateSprintSettings } = useProject();
  const { toast } = useToast();

  const sprintSettingsForm = useForm<z.infer<typeof sprintSettingsSchema>>({
    resolver: zodResolver(sprintSettingsSchema),
    defaultValues: {
      sprintDurationInWeeks: projectSettings?.sprintDurationInWeeks || 2,
      sprintStartDay: projectSettings?.sprintStartDay || 1,
    }
  });

  const onSprintSettingsSubmit = async (values: z.infer<typeof sprintSettingsSchema>) => {
    const success = await updateSprintSettings(values);
    if (success) {
      toast({ title: 'Success', description: 'Sprint settings updated.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update sprint settings.' });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Sprint Settings" description="Manage default settings for your sprints." />
      <Card>
          <CardHeader>
              <CardTitle>Default Sprint Configuration</CardTitle>
              <CardDescription>
                  Configure the default duration and start day for new sprints.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Form {...sprintSettingsForm}>
                  <form
                      onSubmit={sprintSettingsForm.handleSubmit(onSprintSettingsSubmit)}
                      className="space-y-4 max-w-md"
                  >
                      <FormField
                          control={sprintSettingsForm.control}
                          name="sprintDurationInWeeks"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Sprint Duration (in weeks)</FormLabel>
                                  <FormControl>
                                      <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={sprintSettingsForm.control}
                          name="sprintStartDay"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Sprint Start Day</FormLabel>
                                  <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                                      <FormControl>
                                          <SelectTrigger>
                                              <SelectValue />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          {weekDays.map(day => (
                                              <SelectItem key={day.value} value={String(day.value)}>
                                                  {day.label}
                                              </SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <Button type="submit">Save Sprint Settings</Button>
                  </form>
              </Form>
          </CardContent>
      </Card>
    </div>
  );
}
