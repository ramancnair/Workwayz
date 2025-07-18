
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import type { Employee, Story, WorklogItem } from '@/types';
import { PlusCircle, Trash2, Lock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
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
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';

export default function WorklogPage() {
  const { employees, stories, worklogs, saveWorklog, worklogSubmissions, submitWorklogForWeek, isLoading } = useProject();
  const { toast } = useToast();
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [logItems, setLogItems] = useState<WorklogItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workItemInputValues, setWorkItemInputValues] = useState<Record<string, string>>({});
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [totalWeeklyHours, setTotalWeeklyHours] = useState(0);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekStartDateString = format(weekStart, 'yyyy-MM-dd');

  const isWeekSubmitted = useMemo(() => {
    if (!selectedEmployee) return false;
    return worklogSubmissions.some(s => s.employeeId === selectedEmployee.id && s.weekStartDate === weekStartDateString);
  }, [selectedEmployee, worklogSubmissions, weekStartDateString]);


  const workItemOptions = useMemo(() => {
    const storyItems = stories.map(s => ({
        value: s.id,
        label: `[${s.storyId}] ${s.title}`,
        group: s.itemType,
    }));
    const specialItems = [
        { value: 'meeting', label: 'Meeting', group: 'General' },
        { value: 'other', label: 'Other', group: 'General' },
    ];
    return [...specialItems, ...storyItems];
  }, [stories]);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingLog = worklogs.find(
        log => log.employeeId === selectedEmployee.id && format(parseISO(log.date), 'yyyy-MM-dd') === dateString
      );
      if (existingLog) {
        const newLogItems = existingLog.items.map(item => ({...item, id: uuidv4()}));
        setLogItems(newLogItems);
        
        const newInputValues: Record<string, string> = {};
        newLogItems.forEach(item => {
            const option = workItemOptions.find(opt => opt.value === item.itemId);
            if (option) {
                newInputValues[item.id] = option.label;
            }
        });
        setWorkItemInputValues(newInputValues);
      } else {
        setLogItems([]);
        setWorkItemInputValues({});
      }
    }
  }, [selectedEmployee, selectedDate, worklogs, workItemOptions]);

  const dailyHoursMap = useMemo(() => {
    if (!selectedEmployee) return {};
    return worklogs.reduce((acc, log) => {
      if (log.employeeId === selectedEmployee.id) {
        const dateKey = format(parseISO(log.date), 'yyyy-MM-dd');
        acc[dateKey] = log.totalHours;
      }
      return acc;
    }, {} as Record<string, number>);
  }, [worklogs, selectedEmployee]);

  const handleAddItem = () => {
    const newId = uuidv4();
    setLogItems([...logItems, { id: newId, itemId: '', itemType: 'WorkItem', hours: 0 }]);
    setWorkItemInputValues(prev => ({...prev, [newId]: ''}));
  };

  const handleRemoveItem = (id: string) => {
    setLogItems(logItems.filter(item => item.id !== id));
    const newInputs = {...workItemInputValues};
    delete newInputs[id];
    setWorkItemInputValues(newInputs);
  };

  const handleItemChange = (id: string, field: keyof WorklogItem, value: any) => {
    setLogItems(logItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleWorkItemInputChange = (id: string, inputValue: string) => {
     setWorkItemInputValues(prev => ({...prev, [id]: inputValue}));

     const matchingOption = workItemOptions.find(opt => opt.label === inputValue);
     if (matchingOption) {
        let itemType: 'WorkItem' | 'Meeting' | 'Other' = 'WorkItem';
        if (matchingOption.value === 'meeting') itemType = 'Meeting';
        if (matchingOption.value === 'other') itemType = 'Other';
        setLogItems(logItems.map(item => item.id === id ? { ...item, itemId: matchingOption.value, itemType } : item));
     } else {
        setLogItems(logItems.map(item => item.id === id ? { ...item, itemId: '', itemType: 'WorkItem' } : item));
     }
  };
  
  const handleSave = async () => {
    if (!selectedEmployee || !selectedDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an employee and date.' });
      return;
    }
    
    if (logItems.some(item => !item.itemId || item.hours <= 0)) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill out all worklog items and hours properly.' });
        return;
    }
    
    setIsSubmitting(true);

    const totalHours = logItems.reduce((sum, item) => sum + Number(item.hours), 0);

    const worklogData = {
        employeeId: selectedEmployee.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        items: logItems.map(({id, ...rest}) => rest), // Remove client-side uuid before saving
        totalHours: totalHours,
    };

    const success = await saveWorklog(worklogData);

    if (success) {
      toast({ title: 'Success', description: 'Worklog saved successfully.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save worklog.' });
    }
    setIsSubmitting(false);
  };

  const handleValidateAndSubmit = () => {
    if (!selectedEmployee) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select an employee first.' });
        return;
    }
    const weeklyLogs = worklogs.filter(log => 
        log.employeeId === selectedEmployee.id &&
        isWithinInterval(parseISO(log.date), { start: weekStart, end: weekEnd })
    );

    const hours = weeklyLogs.reduce((sum, log) => sum + log.totalHours, 0);
    setTotalWeeklyHours(hours);

    if (hours < 40) {
        setIsSubmitDialogOpen(true);
    } else {
        confirmSubmit();
    }
  };

  const confirmSubmit = async () => {
    if (!selectedEmployee) return;

    const success = await submitWorklogForWeek(selectedEmployee.id, weekStartDateString);
    if(success) {
        toast({ title: 'Success', description: 'Weekly worklog submitted successfully!' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit worklog.' });
    }
    setIsSubmitDialogOpen(false);
  };
  
  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Worklog" description="Log daily work for project resources.">
        <Button onClick={handleValidateAndSubmit} disabled={isWeekSubmitted}>
          {isWeekSubmitted ? <Lock className="mr-2 h-4 w-4" /> : null}
          Submit Week's Worklog
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
            <CardHeader>
              <CardTitle>Select Employee & Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                 <label className="text-sm font-medium">Employee</label>
                 <Select onValueChange={(id) => setSelectedEmployee(employees.find(e => e.id === id) || null)} value={selectedEmployee?.id}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               <div>
                  <label className="text-sm font-medium">Date</label>
                  <div className="grid grid-cols-7 gap-2 rounded-md border p-2">
                    {weekDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const hours = dailyHoursMap[dateKey] || 0;
                        return (
                            <Button
                                key={day.toISOString()}
                                variant={isSameDay(day, selectedDate || new Date(0)) ? 'default' : 'outline'}
                                onClick={() => setSelectedDate(day)}
                                className="flex flex-col h-auto p-2"
                                disabled={isWeekSubmitted}
                            >
                                <span className="text-xs">{format(day, 'EEE')}</span>
                                <span className="text-lg font-bold">{format(day, 'd')}</span>
                                <span className="text-xs text-muted-foreground font-semibold">{hours.toFixed(1)}h</span>
                            </Button>
                        )
                    })}
                  </div>
               </div>
            </CardContent>
        </Card>
      </div>

       {isWeekSubmitted && selectedEmployee && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Worklog Submitted</AlertTitle>
          <AlertDescription>
            The worklog for {selectedEmployee.firstName} for this week has been submitted and is now locked for editing.
          </AlertDescription>
        </Alert>
      )}
      
      {selectedEmployee && selectedDate && !isWeekSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle>Log for {selectedEmployee.firstName} on {format(selectedDate, 'PPP')}</CardTitle>
            <CardDescription>Add items and hours worked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr_120px_1fr_auto] gap-4 items-end">
                  <div className="space-y-1">
                      {index === 0 && <label className="text-sm font-medium">Work Item</label>}
                      <Input
                        list="work-item-options"
                        placeholder="Search work item..."
                        value={workItemInputValues[item.id] || ''}
                        onChange={(e) => handleWorkItemInputChange(item.id, e.target.value)}
                        onBlur={(e) => {
                            const matchingOption = workItemOptions.find(opt => opt.label === e.target.value);
                            if (!matchingOption) {
                                handleWorkItemInputChange(item.id, '');
                            }
                        }}
                      />
                  </div>
                   <div className="space-y-1">
                      {index === 0 && <label className="text-sm font-medium">Hours</label>}
                      <Input
                        type="number"
                        placeholder="Hours"
                        value={item.hours}
                        onChange={(e) => handleItemChange(item.id, 'hours', parseFloat(e.target.value) || 0)}
                        min="0.5"
                        step="0.5"
                      />
                  </div>
                  <div className="space-y-1">
                    {item.itemType === 'Other' && (
                        <>
                           {index === 0 && <label className="text-sm font-medium">Description</label>}
                           <Textarea
                                placeholder="Describe other work..."
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            />
                        </>
                    )}
                  </div>
                 
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
              </div>
            ))}
             <datalist id="work-item-options">
                {workItemOptions.map(option => (
                    <option key={option.value} value={option.label} />
                ))}
            </datalist>
             <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={handleAddItem}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting || logItems.length === 0}>
                  {isSubmitting ? 'Saving...' : 'Save Daily Log'}
                </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

    <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Worklog?</AlertDialogTitle>
            <AlertDialogDescription>
              You have logged {totalWeeklyHours.toFixed(1)} hours for this week, which is less than the standard 40 hours. Do you still want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSubmit}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
