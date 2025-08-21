
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

const effortSettingsSchema = z.object({
    manMonthToDays: z.coerce.number().min(1, 'Value must be at least 1.'),
    manDayToHours: z.coerce.number().min(1, 'Value must be at least 1.'),
    storyPointToHours: z.coerce.number().min(1, 'Value must be at least 1.'),
});

export default function EffortSettingsPage() {
  const { projectSettings, updateEffortSettings } = useProject();
  const { toast } = useToast();

  const effortSettingsForm = useForm<z.infer<typeof effortSettingsSchema>>({
    resolver: zodResolver(effortSettingsSchema),
    values: {
      manMonthToDays: projectSettings?.manMonthToDays || 22,
      manDayToHours: projectSettings?.manDayToHours || 8,
      storyPointToHours: projectSettings?.storyPointToHours || 8,
    }
  });

  const onEffortSettingsSubmit = async (values: z.infer<typeof effortSettingsSchema>) => {
    const success = await updateEffortSettings(values);
    if (success) {
      toast({ title: 'Success', description: 'Effort settings updated.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update effort settings.' });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Effort Settings" description="Manage effort conversion formulas for this project." />
      <Form {...effortSettingsForm}>
        <form
            onSubmit={effortSettingsForm.handleSubmit(onEffortSettingsSubmit)}
            className="space-y-6"
        >
          <Card>
              <CardHeader>
                  <CardTitle>SDLC</CardTitle>
                  <CardDescription>
                      Industry Standard: 1 MM = 22 MD and 1 MD = 8 MH
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                  <FormField
                      control={effortSettingsForm.control}
                      name="manMonthToDays"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Man-Month to Man-Days</FormLabel>
                              <FormControl>
                                  <div className="flex items-center gap-2">
                                      <span>1 Man-Month =</span>
                                      <Input type="number" className="w-24" {...field} />
                                      <span>Man-Days</span>
                                  </div>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={effortSettingsForm.control}
                      name="manDayToHours"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Man-Day to Man-Hours</FormLabel>
                              <FormControl>
                                  <div className="flex items-center gap-2">
                                      <span>1 Man-Day =</span>
                                      <Input type="number" className="w-24" {...field} />
                                      <span>Man-Hours</span>
                                  </div>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Agile</CardTitle>
              <CardDescription>
                  For US/Europe 1 SP = 8 hrs. For Middle East/Asia 1 SP = 4 hrs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <FormField
                control={effortSettingsForm.control}
                name="storyPointToHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Story Point to Hours</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <span>1 Story Point =</span>
                        <Input type="number" className="w-24" {...field} />
                        <span>Hours</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit">Save Effort Settings</Button>
        </form>
      </Form>
    </div>
  );
}
