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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Holiday, ProjectSettings } from '@/types';
import { format } from 'date-fns';
import { db } from '@/lib/db-provider';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
} from '@/lib/db-provider';
import { aiHolidayGenerator } from '@/ai/flows/ai-holiday-generator';

const holidayFormSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  date: z.string().min(1, 'Date is required.'),
  type: z.enum(['National', 'Regional', 'Optional']).optional(),
});

const aiHolidaySchema = z.object({
  country: z.string().min(1, 'Country is required.'),
  year: z.coerce.number().min(2000, 'Invalid year.').max(2100, 'Invalid year.'),
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

const defaultSettings = {
  weeklyOffDays: [0, 6],
};

export default function HolidayPage() {
  const { toast } = useToast();
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>(defaultSettings.weeklyOffDays);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!db) return;
    
    // Listener for holidays
    const unsubHolidays = onSnapshot(collection(db, 'holidays'), (snapshot: any) => {
        const holidaysData = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            } as Holiday
        });
        setHolidays(holidaysData);
    }, (err: any) => {
        console.warn('[HolidayCalendar] Holidays listener error:', err);
    });
    
    // Listener for settings
    const settingsDocRef = doc(db, 'settings', 'main');
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ProjectSettings;
        setWeeklyOffDays(data.weeklyOffDays || defaultSettings.weeklyOffDays);
      } else {
        // Initialize settings if they don't exist
        setDoc(settingsDocRef, defaultSettings).catch((e: any) => console.error("Failed to set default settings", e));
      }
    }, (err: any) => {
      console.warn('[HolidayCalendar] Settings listener error:', err);
    });

    return () => {
        unsubHolidays();
        unsubSettings();
    };
  }, []);

  const holidayForm = useForm<z.infer<typeof holidayFormSchema>>({
    resolver: zodResolver(holidayFormSchema),
  });
  
  const aiForm = useForm<z.infer<typeof aiHolidaySchema>>({
    resolver: zodResolver(aiHolidaySchema),
    defaultValues: {
      country: '',
      year: new Date().getFullYear(),
    }
  });
  
  const handleDayToggle = async (dayId: number) => {
    if (!db) return;
    const newOffDays = weeklyOffDays.includes(dayId)
      ? weeklyOffDays.filter((d) => d !== dayId)
      : [...weeklyOffDays, dayId];
    
    try {
        await setDoc(doc(db, 'settings', 'main'), { weeklyOffDays: newOffDays }, { merge: true });
        toast({ title: 'Success', description: 'Weekly off-days updated.' });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update weekly off-days.' });
        console.error("Error updating weekly off days:", e);
    }
  };
  
  const openHolidayDialog = (holiday: Holiday | null) => {
    setEditingHoliday(holiday);
    if (holiday) {
      holidayForm.reset({
        description: holiday.description,
        date: format(new Date(holiday.date), 'yyyy-MM-dd'),
        type: holiday.type,
      });
    } else {
      holidayForm.reset({ description: '', date: '', type: undefined });
    }
    setIsHolidayDialogOpen(true);
  };
  
  const onHolidaySubmit = async (values: z.infer<typeof holidayFormSchema>) => {
    if (!db) return;
    const holidayData: any = {
      description: values.description,
      date: Timestamp.fromDate(new Date(values.date)),
    };
    if (values.type) {
       holidayData.type = values.type;
    }

    let success = false;
    try {
        if (editingHoliday) {
            await updateDoc(doc(db, 'holidays', editingHoliday.id), holidayData);
        } else {
            await addDoc(collection(db, 'holidays'), holidayData);
        }
        success = true;
    } catch (e) {
        console.error("Error saving holiday:", e);
    }

    if (success) {
      toast({ title: 'Success', description: `Holiday ${editingHoliday ? 'updated' : 'added'}.` });
      setIsHolidayDialogOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Could not save holiday.` });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, 'holidays', id));
        toast({ title: 'Success', description: 'Holiday deleted.' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not delete holiday.` });
        console.error("Error deleting holiday:", e);
    }
  }

  const onAiSubmit = async (values: z.infer<typeof aiHolidaySchema>) => {
    setIsGenerating(true);
    try {
      const result = await aiHolidayGenerator({
          country: values.country,
          year: values.year,
      });
      if (result.holidays && db) {
         for (const holiday of result.holidays) {
             await addDoc(collection(db, 'holidays'), {
               description: holiday.description,
               date: Timestamp.fromDate(new Date(holiday.date)),
               type: holiday.type,
             });
         }
         toast({ title: 'Success', description: `Added ${result.holidays.length} holidays.` });
         setIsAiDialogOpen(false);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate holidays.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Company Holidays" description="Manage global weekly off-days and yearly holidays." />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Off-Days</CardTitle>
              <CardDescription>Select the days of the week that are consistently off for all projects.</CardDescription>
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
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setIsAiDialogOpen(true)}>
                    <Bot className="mr-2 h-4 w-4" /> Auto-fill with AI
                  </Button>
                  <Button onClick={() => openHolidayDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Holiday
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.length > 0 ? (
                    holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(holiday => (
                      <TableRow key={holiday.id}>
                        <TableCell>{format(new Date(holiday.date), 'PPP')}</TableCell>
                        <TableCell>{holiday.description}</TableCell>
                        <TableCell>{holiday.type || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openHolidayDialog(holiday)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(holiday.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                        No holidays logged in the system.
                      </TableCell>
                    </TableRow>
                  )}
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
              <FormField
                control={holidayForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select holiday type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="National">National</SelectItem>
                        <SelectItem value="Regional">Regional</SelectItem>
                        <SelectItem value="Optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
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
      
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-fill Holidays with AI</DialogTitle>
          </DialogHeader>
          <Form {...aiForm}>
            <form onSubmit={aiForm.handleSubmit(onAiSubmit)} className="space-y-4">
              <FormField
                control={aiForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={aiForm.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Auto-fill'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
