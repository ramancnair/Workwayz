

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
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
import type { Holiday } from '@/types';
import { format } from 'date-fns';

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

export default function HolidayCalendarPage() {
  const { holidays, weeklyOffDays, setWeeklyOffDays, addHoliday, updateHoliday, deleteHoliday } = useProject();
  const { toast } = useToast();
  
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const holidayForm = useForm<z.infer<typeof holidayFormSchema>>({
    resolver: zodResolver(holidayFormSchema),
  });
  
  const handleDayToggle = (dayId: number) => {
    const newOffDays = weeklyOffDays.includes(dayId)
      ? weeklyOffDays.filter((d) => d !== dayId)
      : [...weeklyOffDays, dayId];
    setWeeklyOffDays(newOffDays);
    toast({ title: 'Success', description: 'Weekly off-days updated.' });
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
      date: new Date(values.date),
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
    const success = await deleteHoliday(id);
     if (success) {
      toast({ title: 'Success', description: 'Holiday deleted.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Could not delete holiday.` });
    }
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Holiday Calendar" description="Manage weekly off-days and yearly holidays." />

        <div className="grid gap-6 md:grid-cols-2">
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
                <Button onClick={() => openHolidayDialog(null)}>
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
                        <Button variant="ghost" size="icon" onClick={() => openHolidayDialog(holiday)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(holiday.id)}>
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
          <Form {...holidayForm}>
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
