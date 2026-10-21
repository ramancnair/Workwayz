'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onSnapshot, setDoc, doc } from '@/lib/db-provider';
import { db } from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { ArchiveSettings } from '@/types';

const archiveSettingsSchema = z.object({
  autoArchiveCompletedProjects: z.boolean(),
  autoArchiveAfterMonths: z.string(),
  autoDeleteArchivedProjects: z.boolean(),
  autoDeleteAfterMonths: z.string(),
  customDeleteYears: z.number().int().min(1).max(20).optional(),
  customDeleteMonths: z.number().int().min(1).optional(),
});

type SettingsFormValues = z.infer<typeof archiveSettingsSchema>;

const getYearsFromMonths = (months?: number, years?: number): number => {
  if (years && years >= 1 && years <= 20) return years;
  if (!months) return 4;
  if (months % 12 === 0) {
    return Math.min(20, Math.max(1, months / 12));
  }
  if (months >= 1 && months <= 20) {
    return months;
  }
  return Math.min(20, Math.max(1, Math.round(months / 12)));
};

export default function ArchiveSettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(archiveSettingsSchema),
    defaultValues: {
      autoArchiveCompletedProjects: false,
      autoArchiveAfterMonths: "1",
      autoDeleteArchivedProjects: false,
      autoDeleteAfterMonths: "12",
      customDeleteYears: 4,
      customDeleteMonths: 48,
    },
  });

  const watchAutoDelete = form.watch('autoDeleteAfterMonths');

  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'Administrator' || user.accessLevel === 'Administrator' || user.role === 'Super Admin' || user.accessLevel === 'Super Admin') {
          setIsAdmin(true);
        }
      } catch (e) { }
    }

    if (!db) {
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'settings', 'archiveSettings'), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ArchiveSettings;
        const initialYears = getYearsFromMonths(data.customDeleteMonths, data.customDeleteYears);
        form.reset({
          autoArchiveCompletedProjects: data.autoArchiveCompletedProjects ?? false,
          autoArchiveAfterMonths: data.autoArchiveAfterMonths ?? '1',
          autoDeleteArchivedProjects: data.autoDeleteArchivedProjects ?? false,
          autoDeleteAfterMonths: (data.autoDeleteAfterMonths === '3' || data.autoDeleteAfterMonths === '6')
            ? '12'
            : (data.autoDeleteAfterMonths ?? '12'),
          customDeleteYears: initialYears,
          customDeleteMonths: initialYears * 12,
        });
      }
      setIsLoading(false);
    }, (err: any) => {
      console.warn('[ArchiveSettings] Settings listener error:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, [form]);

  const onSubmit = async (values: SettingsFormValues) => {
    if (!db) return;
    setIsSaving(true);
    try {
      const years = values.customDeleteYears ?? 4;
      const dataToSave = {
        ...values,
        customDeleteYears: years,
        customDeleteMonths: years * 12,
      };
      await setDoc(doc(db, 'settings', 'archiveSettings'), dataToSave, { merge: true });
      toast({ title: 'Success', description: 'Inactive settings updated successfully.' });
    } catch (error) {
      console.error('Error saving inactive settings:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update inactive settings.' });
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
      return (
          <div className="p-8 text-center text-muted-foreground">
             You do not have permission to view this page.
          </div>
      );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader 
        title="Inactive Projects Settings" 
        description="Configure rules for automatically moving inactive projects and expiring old inactive data." 
      />

      <Card>
        <CardHeader>
          <CardTitle>Inactive Settings</CardTitle>
          <CardDescription>Determine when projects are moved to inactive status or permanently deleted from it.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4 rounded-md border p-4 bg-muted/40">
                <FormField
                  control={form.control}
                  name="autoArchiveCompletedProjects"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Auto-Move Inactive Projects</FormLabel>
                        <FormDescription>
                          Automatically move projects with any status other than Initial Estimation or Active to Inactive if inactive for the specified period or if marked as Closed, On Hold, or Cancelled.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoArchiveAfterMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inactivity Timeframe</FormLabel>
                      <Select disabled={!form.watch('autoArchiveCompletedProjects')} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timeframe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Immediately on Closed / On Hold / Cancelled</SelectItem>
                          <SelectItem value="1">1 Month of Inactivity</SelectItem>
                          <SelectItem value="3">3 Months of Inactivity</SelectItem>
                          <SelectItem value="6">6 Months of Inactivity</SelectItem>
                          <SelectItem value="12">12 Months of Inactivity</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Based on the project&apos;s last activity, update date, or completion date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-md border p-4 bg-muted/40">
                <FormField
                  control={form.control}
                  name="autoDeleteArchivedProjects"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Auto-Delete Inactive Projects</FormLabel>
                        <FormDescription>
                          Sweep old inactive projects to the Trash to save space and reduce clutter.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="autoDeleteAfterMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delete Timeframe</FormLabel>
                        <Select disabled={!form.watch('autoDeleteArchivedProjects')} onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12">1 Year</SelectItem>
                            <SelectItem value="24">2 Years</SelectItem>
                            <SelectItem value="36">3 Years</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Based on when the project became inactive.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchAutoDelete === 'Custom' && (
                    <FormField
                      control={form.control}
                      name="customDeleteYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Years</FormLabel>
                          <Select
                            disabled={!form.watch('autoDeleteArchivedProjects')}
                            onValueChange={(val) => {
                              const numVal = parseInt(val, 10);
                              field.onChange(numVal);
                              form.setValue('customDeleteMonths', numVal * 12);
                            }}
                            value={field.value ? field.value.toString() : '4'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select years" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 20 }, (_, i) => i + 1).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year} {year === 1 ? 'Year' : 'Years'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
