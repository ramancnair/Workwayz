
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Holiday, ProjectSettings } from '@/types';
import { format } from 'date-fns';
import { useProject } from '@/context/ProjectContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const holidayFormSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  date: z.string().min(1, 'Date is required.'),
});

const weekdays = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
  { id: 0, label: 'Sunday' },
];

export default function ProjectHolidayPage() {
  const { 
    holidays, 
    weeklyOffDays,
    projectSettings,
    addHoliday, 
    updateHoliday,
    deleteHoliday,
    setWeeklyOffDays,
    updateProjectSettings,
  } = useProject();
  const { toast } = useToast();
  
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const holidayForm = useForm<z.infer<typeof holidayFormSchema>>({
    resolver: zodResolver(holidayFormSchema),
  });

  const isOverrideEnabled = !!projectSettings?.overrideGlobalHolidays;

  const handleOverrideToggle = async (checked: boolean) => {
    await updateProjectSettings({ overrideGlobalHolidays: checked });
  };
  
  const handleDayToggle = async (dayId: number) => {
    const newOffDays = weeklyOffDays.includes(dayId)
      ? weeklyOffDays.filter((d) => d !== dayId)
      : [...weeklyOffDays, dayId];
    
    await setWeeklyOffDays(newOffDays);
  };
  
  const openHolidayDialog = (holiday: Holiday | null) => {
    setEditingHoliday(holiday);
    if (holiday) {
      holidayForm.reset({
        description: holiday.description,
        date: format(new Date(holiday.date), 'yyyy-MM-dd'),
      });
    } else {
      holidayForm.reset({ description: '', date: '' });
    }
    setIsHolidayDialogOpen(true);
  };
  
  const onHolidaySubmit = async (values: z.infer<typeof holidayFormSchema>) => {
    const holidayData = {
      description: values.description,
      date: new Date(values.date).toISOString(),
    };

    const success = editingHoliday
        ? await updateHoliday(editingHoliday.id, holidayData)
        : await addHoliday(holidayData);

    if (success) {
      toast({ title: 'Success', description: `Holiday ${editingHoliday ? 'updated' : 'added'}.` });
      setIsHolidayDialogOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Could not save holiday.` });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    await deleteHoliday(id);
    toast({ title: 'Success', description: 'Holiday deleted.' });
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Holiday Calendar" description="Manage weekly off-days and yearly holidays for this project." />
        
        <Card>
            <CardHeader>
                <CardTitle>Holiday Settings</CardTitle>
                <CardDescription>
                    By default, this project uses the global holiday calendar. You can override these settings for this project specifically.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center space-x-2">
                    <Switch
                        id="override-holidays"
                        checked={isOverrideEnabled}
                        onCheckedChange={handleOverrideToggle}
                    />
                    <Label htmlFor="override-holidays">Override global holiday settings for this project</Label>
                </div>
                {!isOverrideEnabled && (
                    <Alert>
                        <AlertDescription>
                            This project is currently using the global holiday settings. To make project-specific changes, enable the override switch above. Global settings can be managed in the main portfolio dashboard.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Off-Days</CardTitle>
              <CardDescription>Select the days of the week that are consistently off.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {weekdays.map(day => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.id}`}
                    checked={weeklyOffDays.includes(day.id)}
                    onCheckedChange={() => handleDayToggle(day.id)}
                    disabled={!isOverrideEnabled}
                  />
                  <label
                    htmlFor={`day-${day.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Yearly Holidays</CardTitle>
                  <CardDescription>Add specific holiday dates for the year.</CardDescription>
                </div>
                <Button onClick={() => openHolidayDialog(null)} disabled={!isOverrideEnabled}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Holiday
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(holiday => (
                    <TableRow key={holiday.id}>
                      <TableCell>{format(new Date(holiday.date), 'PPP')}</TableCell>
                      <TableCell>{holiday.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openHolidayDialog(holiday)} disabled={!isOverrideEnabled}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(holiday.id)} disabled={!isOverrideEnabled}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={holidayForm.handleSubmit(onHolidaySubmit)} className="space-y-4">
              <FormField
                control={holidayForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={holidayForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., New Year's Day" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{editingHoliday ? 'Save Changes' : 'Add Holiday'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
