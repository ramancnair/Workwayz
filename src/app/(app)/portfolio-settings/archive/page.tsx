'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, setDoc, doc, getDocs, updateDoc, Timestamp, query, where } from '@/lib/db-provider';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArchiveRestore } from 'lucide-react';
import type { Project, ArchiveSettings } from '@/types';
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

const archiveSettingsSchema = z.object({
  autoArchiveCompletedProjects: z.boolean(),
  autoArchiveAfterMonths: z.string(),
  autoDeleteArchivedProjects: z.boolean(),
  autoDeleteAfterMonths: z.string(),
  customDeleteMonths: z.number().int().min(1).optional(),
});

type SettingsFormValues = z.infer<typeof archiveSettingsSchema>;

export default function ArchiveSettingsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [eligibleForArchive, setEligibleForArchive] = useState<Project[]>([]);
  const [eligibleForDelete, setEligibleForDelete] = useState<Project[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(archiveSettingsSchema),
    defaultValues: {
      autoArchiveCompletedProjects: false,
      autoArchiveAfterMonths: "1",
      autoDeleteArchivedProjects: false,
      autoDeleteAfterMonths: "3",
      customDeleteMonths: 4,
    },
  });

  const watchAutoDelete = form.watch('autoDeleteAfterMonths');

  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'Administrator' || user.accessLevel === 'Administrator') {
          setIsAdmin(true);
        }
      } catch (e) { }
    }

    if (!db) {
      setIsLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'settings', 'archiveSettings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ArchiveSettings;
        form.reset({
          autoArchiveCompletedProjects: data.autoArchiveCompletedProjects ?? false,
          autoArchiveAfterMonths: data.autoArchiveAfterMonths ?? '1',
          autoDeleteArchivedProjects: data.autoDeleteArchivedProjects ?? false,
          autoDeleteAfterMonths: data.autoDeleteAfterMonths ?? '3',
          customDeleteMonths: data.customDeleteMonths ?? 4,
        });
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [form]);

  const onSubmit = async (values: SettingsFormValues) => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'archiveSettings'), values, { merge: true });
      toast({ title: 'Success', description: 'Archive settings updated successfully.' });
    } catch (error) {
      console.error('Error saving archive settings:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update archive settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDateThreshold = (monthsStr: string, customMonths?: number) => {
    const months = monthsStr === 'Custom' ? (customMonths || 0) : parseInt(monthsStr, 10);
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  };

  const handlePreviewArchiving = async () => {
    if (!db) return;
    try {
      setIsArchiving(true);
      const values = form.getValues();
      
      const projectsSnap = await getDocs(query(collection(db, 'projects'), where('isDeleted', '!=', true)));
      const projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));

      const toArchive: Project[] = [];
      const toDelete: Project[] = [];

      if (values.autoArchiveCompletedProjects) {
        const thresholdDate = calculateDateThreshold(values.autoArchiveAfterMonths);
        const eligible = projects.filter(p => !p.isArchived && p.status === 'Completed' && p.endDate && new Date(p.endDate) < thresholdDate);
        toArchive.push(...eligible);
      }

      if (values.autoDeleteArchivedProjects) {
        const thresholdDate = calculateDateThreshold(values.autoDeleteAfterMonths, values.customDeleteMonths);
        const eligible = projects.filter(p => p.isArchived && p.archivedAt && new Date(p.archivedAt) < thresholdDate);
        toDelete.push(...eligible);
      }

      setEligibleForArchive(toArchive);
      setEligibleForDelete(toDelete);
      
      if (toArchive.length === 0 && toDelete.length === 0) {
        toast({ title: 'No Projects Found', description: 'There are no projects eligible for archiving or deletion based on current settings.' });
      } else {
        setShowConfirmDialog(true);
      }

    } catch (error) {
      console.error("Failed to preview archiving objects", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to calculate archiving queue.' });
    } finally {
      setIsArchiving(false);
    }
  };

  const executeArchiving = async () => {
    if (!db) return;
    try {
      setIsArchiving(true);
      
      const archivePromises = eligibleForArchive.map(p => {
        return updateDoc(doc(db!, 'projects', p.id), { 
          isArchived: true, 
          archivedAt: new Date().toISOString() 
        });
      });
      
      const deletePromises = eligibleForDelete.map(p => {
        return updateDoc(doc(db!, 'projects', p.id), { 
          isDeleted: true, 
          deletedAt: Timestamp.now() 
        });
      });

      await Promise.all([...archivePromises, ...deletePromises]);
      toast({ title: 'Success', description: 'Maintenance process completed successfully.' });
      setShowConfirmDialog(false);
    } catch (err) {
      console.error("Error executing auto-archive", err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete the archiving process.' });
    } finally {
      setIsArchiving(false);
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
        title="Project Archiving" 
        description="Configure rules for automatically archiving completed projects and expiring old archived data." 
      />

      <Card>
        <CardHeader>
          <CardTitle>Archive Settings</CardTitle>
          <CardDescription>Determine when projects are moved to archive or permanently deleted from it.</CardDescription>
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
                        <FormLabel>Auto-Archive Completed Projects</FormLabel>
                        <FormDescription>
                          Determine if completed projects should be automatically hidden from the active list.
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
                      <FormLabel>Archive Timeframe</FormLabel>
                      <Select disabled={!form.watch('autoArchiveCompletedProjects')} onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select months" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 Month after Completion</SelectItem>
                          <SelectItem value="3">3 Months after Completion</SelectItem>
                          <SelectItem value="6">6 Months after Completion</SelectItem>
                          <SelectItem value="12">12 Months after Completion</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Based on the project's End Date.
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
                        <FormLabel>Auto-Delete Archived Projects</FormLabel>
                        <FormDescription>
                          Sweep old archived projects to the Trash to save space and reduce clutter.
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
                        <Select disabled={!form.watch('autoDeleteArchivedProjects')} onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="3">3 Months</SelectItem>
                            <SelectItem value="6">6 Months</SelectItem>
                            <SelectItem value="12">1 Year</SelectItem>
                            <SelectItem value="24">2 Years</SelectItem>
                            <SelectItem value="36">3 Years</SelectItem>
                            <SelectItem value="Custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Based on when the project was archived.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchAutoDelete === 'Custom' && (
                    <FormField
                      control={form.control}
                      name="customDeleteMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Months</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              disabled={!form.watch('autoDeleteArchivedProjects')}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value, 10))}
                            />
                          </FormControl>
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
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={handlePreviewArchiving} disabled={isArchiving || isSaving}>
                  <ArchiveRestore className="mr-2 h-4 w-4" /> Run Manual Archiving
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Maintenance</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Based on your current settings, the following actions will be performed:</p>
              <ul className="list-disc pl-5">
                <li><strong>{eligibleForArchive.length}</strong> active projects will be moved to Archive.</li>
                <li><strong>{eligibleForDelete.length}</strong> archived projects will be sent to the Trash.</li>
              </ul>
              <p className="pt-2">Depending on the amount of data, this may take a moment. Ensure no one is actively editing these projects.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeArchiving} className="bg-primary text-primary-foreground">
              Execute Maintenance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
