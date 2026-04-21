

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  format,
  startOfWeek,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
  getMonth,
  getYear,
  setMonth,
  setYear,
} from 'date-fns';
import type { Employee, Story, WorklogItem } from '@/types';
import {
  PlusCircle,
  Trash2,
  Edit,
  Save,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { v4 as uuidv4 } from 'uuid';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export default function WorklogPage() {
  const {
    employees,
    stories,
    worklogs,
    saveWorklog,
    holidays,
    weeklyOffDays,
    isLoading,
  } = useProject();
  const { toast } = useToast();

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayDate, setDisplayDate] = useState<Date>(new Date());
  const [logItems, setLogItems] = useState<WorklogItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [workItemInputValues, setWorkItemInputValues] = useState<
    Record<string, string>
  >({});
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(0, i), 'MMMM'),
  }));
  const currentYear = getYear(new Date());
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
    setDisplayDate(today);
  }, []);

  const weekStartDate = useMemo(
    () => startOfWeek(displayDate, { weekStartsOn: 0 }),
    [displayDate]
  );
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStartDate);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [weekStartDate]);


  const workItemOptions = useMemo(() => {
    const storyItems = stories.map((s) => ({
      value: s.id,
      label: `[${s.storyId}] ${s.title}`,
      group: s.itemType,
    }));
    const specialItems = [
      { value: 'meeting', label: 'Meeting', group: 'General' },
      { value: 'other', label: 'Other', group: 'General' },
      { value: 'holiday', label: 'Holiday', group: 'General' },
      { value: 'weekend', label: 'Weekend', group: 'General' },
    ];
    return [...specialItems, ...storyItems];
  }, [stories]);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

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

  // Effect to auto-populate holidays and weekends for the displayed week
  useEffect(() => {
    if (!selectedEmployee || isLoading) return;
  
    const autoPopulateWeek = async () => {
      for (const day of weekDays) {
        const dateString = format(day, 'yyyy-MM-dd');
        const existingLog = worklogs.find(
          (log) =>
            log.employeeId === selectedEmployee.id &&
            format(parseISO(log.date), 'yyyy-MM-dd') === dateString
        );

        if (!existingLog) {
          const holiday = holidays.find((h) => isSameDay(new Date(h.date), day));
          const isWeekend = weeklyOffDays.includes(day.getDay());

          let autoPopulatedItem: Omit<WorklogItem, 'id'> | null = null;
          if (holiday) {
            autoPopulatedItem = { itemId: 'holiday', itemType: 'Other', hours: 8, description: holiday.description };
          } else if (isWeekend) {
            autoPopulatedItem = { itemId: 'weekend', itemType: 'Other', hours: 8, description: 'Weekend' };
          }

          if (autoPopulatedItem) {
            const autoPopulatedLog = {
              employeeId: selectedEmployee.id,
              date: dateString,
              items: [autoPopulatedItem],
              totalHours: 8,
            };
            await saveWorklog(autoPopulatedLog);
          }
        }
      }
    };

    autoPopulateWeek();
  }, [selectedEmployee, weekStartDate, worklogs, holidays, weeklyOffDays, saveWorklog, isLoading]);


  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingLog = worklogs.find(
        (log) =>
          log.employeeId === selectedEmployee.id &&
          format(parseISO(log.date), 'yyyy-MM-dd') === dateString
      );

      if (existingLog && existingLog.items.length > 0) {
        const newLogItems = existingLog.items.map((item) => ({
          ...item,
          id: uuidv4(),
        }));
        setLogItems(newLogItems);

        const newInputValues: Record<string, string> = {};
        newLogItems.forEach((item) => {
          const option = workItemOptions.find((opt) => opt.value === item.itemId);
          if (option) {
            newInputValues[item.id] = option.label;
          } else if (item.itemType === 'Other') {
            newInputValues[item.id] = 'Other';
          }
        });
        setWorkItemInputValues(newInputValues);
      } else {
        setLogItems([]);
        setWorkItemInputValues({});
      }
    }
  }, [selectedEmployee, selectedDate, worklogs, workItemOptions]);

  const handleAddItem = () => {
    const newId = uuidv4();
    setLogItems([
      ...logItems,
      { id: newId, itemId: '', itemType: 'WorkItem', hours: 0 },
    ]);
    setWorkItemInputValues((prev) => ({ ...prev, [newId]: '' }));
  };

  const handleRemoveItem = (id: string) => {
    setLogItems(logItems.filter((item) => item.id !== id));
    const newInputs = { ...workItemInputValues };
    delete newInputs[id];
    setWorkItemInputValues(newInputs);
    handleAutoSave();
  };

  const handleItemChange = (
    id: string,
    field: keyof Omit<WorklogItem, 'id'>,
    value: any
  ) => {
    setLogItems(
      logItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleWorkItemInputChange = (id: string, inputValue: string) => {
    setWorkItemInputValues((prev) => ({ ...prev, [id]: inputValue }));

    const matchingOption = workItemOptions.find(
      (opt) => opt.label === inputValue
    );
    if (matchingOption) {
      let itemType: 'WorkItem' | 'Meeting' | 'Other' = 'WorkItem';
      if (matchingOption.value === 'meeting') itemType = 'Meeting';
      if (['other', 'holiday', 'weekend'].includes(matchingOption.value)) itemType = 'Other';
      setLogItems(
        logItems.map((item) =>
          item.id === id
            ? { ...item, itemId: matchingOption.value, itemType }
            : item
        )
      );
    } else {
      setLogItems(
        logItems.map((item) =>
          item.id === id ? { ...item, itemId: '', itemType: 'WorkItem' } : item
        )
      );
    }
  };

  const handleAutoSave = async () => {
    if (!selectedEmployee || !selectedDate) return;
    
    // De-duplicate items before saving
    const itemMap = new Map<string, WorklogItem>();
    logItems.forEach(item => {
        if(item.itemId) { // only consider items with a selected work item
            const existing = itemMap.get(item.itemId);
            if(existing) {
                existing.hours += item.hours;
                if(item.description) {
                    existing.description = (existing.description || '') + ' ' + item.description;
                }
            } else {
                itemMap.set(item.itemId, { ...item });
            }
        }
    });

    const finalItems = Array.from(itemMap.values());

    setIsSaving(true);
    const totalHours = finalItems.reduce((sum, item) => sum + Number(item.hours), 0);

    const worklogData = {
      employeeId: selectedEmployee.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      items: finalItems.map(({ id, ...rest }) => rest),
      totalHours: totalHours,
    };

    const success = await saveWorklog(worklogData);

    if (success) {
      // Data will refresh via snapshot listener, no need to toast on every save
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save worklog.',
      });
    }
    setIsSaving(false);
  };


  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader
          title="Worklog"
          description="Log daily work for project resources."
        />
        <Card>
          <CardHeader>
            <CardTitle>Select Employee & Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Select
                onValueChange={(id) =>
                  setSelectedEmployee(employees.find((e) => e.id === id) || null)
                }
                value={selectedEmployee?.id}
              >
                <SelectTrigger className="w-full md:w-1/3">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <div className="flex items-center gap-4 my-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDisplayDate(subWeeks(displayDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  <Select
                    value={String(getMonth(displayDate))}
                    onValueChange={(m) =>
                      setDisplayDate(setMonth(displayDate, Number(m)))
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(getYear(displayDate))}
                    onValueChange={(y) =>
                      setDisplayDate(setYear(displayDate, Number(y)))
                    }
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDisplayDate(addWeeks(displayDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-2 rounded-md border p-2">
                {weekDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const hours = dailyHoursMap[dateKey] || 0;
                  return (
                    <Button
                      key={day.toISOString()}
                      variant={isSameDay(day, selectedDate) ? 'default' : 'outline'}
                      onClick={() => setSelectedDate(day)}
                      className="flex flex-col h-auto p-2"
                    >
                      <span className="text-xs">{format(day, 'EEE')}</span>
                      <span className="text-lg font-bold">{format(day, 'd')}</span>
                      <span className="text-xs text-muted-foreground font-semibold">
                        {hours.toFixed(1)}h
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedEmployee && selectedDate && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  Log for {selectedEmployee.firstName} on {format(selectedDate, 'PPP')}
                </CardTitle>
                <CardDescription>
                  Add or modify items and hours worked. Changes are saved automatically.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                {logItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_120px_1fr_auto] gap-4 items-end mb-2"
                  >
                    <div className="space-y-1">
                      {index === 0 && (
                        <label className="text-sm font-medium">Work Item</label>
                      )}
                      <Input
                        list="work-item-options"
                        placeholder="Search work item..."
                        value={workItemInputValues[item.id] || ''}
                        onChange={(e) => handleWorkItemInputChange(item.id, e.target.value)}
                        onBlur={handleAutoSave}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      {index === 0 && (
                        <label className="text-sm font-medium">Hours</label>
                      )}
                      <Input
                        type="number"
                        placeholder="Hours"
                        value={item.hours}
                        onChange={(e) => handleItemChange(item.id, 'hours', parseFloat(e.target.value) || 0)}
                        onBlur={handleAutoSave}
                        min="0.5"
                        step="0.5"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-1">
                      {item.itemType === 'Other' && (
                        <>
                          {index === 0 && (
                            <label className="text-sm font-medium">
                              Description
                            </label>
                          )}
                          <Input
                            placeholder="Describe other work..."
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            onBlur={handleAutoSave}
                            disabled={isSaving}
                          />
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <datalist id="work-item-options">
                  {workItemOptions.map((option) => (
                    <option key={option.value} value={option.label} />
                  ))}
                </datalist>
                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={handleAddItem} disabled={isSaving}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
