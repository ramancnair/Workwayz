

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
  Search,
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
import { usePermissions } from '@/hooks/use-permissions';
import { z } from 'zod';

const normalizeDateKey = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (dateVal.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      return dateVal.slice(0, 10);
    }
    try {
      return format(parseISO(dateVal), 'yyyy-MM-dd');
    } catch {
      return dateVal;
    }
  }
  if (dateVal instanceof Date) {
    return format(dateVal, 'yyyy-MM-dd');
  }
  if (dateVal?.toDate) {
    return dateVal.toDate().toISOString().slice(0, 10);
  }
  return '';
};

export default function WorklogPage() {
  const { userRole } = usePermissions();
  const isAdmin = userRole === 'Administrator' || userRole === 'Super Admin';

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

  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('workwayz_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }, []);

  const currentEmployee = useMemo(() => {
    if (!currentUser || employees.length === 0) return null;
    return (
      employees.find(
        (e) =>
          (e.id && currentUser.empId && e.id.toLowerCase() === currentUser.empId.toLowerCase()) ||
          (e.email && currentUser.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (`${e.firstName} ${e.lastName}`.trim().toLowerCase() === currentUser.name?.trim().toLowerCase())
      ) || null
    );
  }, [employees, currentUser]);

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
  const [optimisticDailyHours, setOptimisticDailyHours] = useState<Record<string, number>>({});
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
    if (employees.length === 0) return;

    if (!isAdmin && currentEmployee) {
      setSelectedEmployee(currentEmployee);
    } else if (!selectedEmployee) {
      setSelectedEmployee(currentEmployee || employees[0]);
    }
  }, [employees, isAdmin, currentEmployee, selectedEmployee]);

  const dailyHoursMap = useMemo(() => {
    if (!selectedEmployee) return {};
    const map = worklogs.reduce((acc, log) => {
      if (log.employeeId === selectedEmployee.id) {
        const dateKey = normalizeDateKey(log.date);
        if (dateKey) {
          acc[dateKey] = log.totalHours;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    Object.entries(optimisticDailyHours).forEach(([dateKey, hours]) => {
      map[dateKey] = hours;
    });

    return map;
  }, [worklogs, selectedEmployee, optimisticDailyHours]);

  const weeklyTotalHours = useMemo(() => {
    return weekDays.reduce((sum, day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return sum + (dailyHoursMap[dateKey] || 0);
    }, 0);
  }, [weekDays, dailyHoursMap]);

  const weeklyRequiredHours = useMemo(() => {
    const offDays = weeklyOffDays || [];
    const hList = holidays || [];
    const workingDaysCount = weekDays.filter((day) => {
      const isWeekend = offDays.includes(day.getDay());
      const isHoliday = hList.some((h) => isSameDay(new Date(h.date), day));
      return !isWeekend && !isHoliday;
    }).length;
    return workingDaysCount * 8;
  }, [weekDays, weeklyOffDays, holidays]);

  // Effect to auto-populate holidays and weekends for the displayed week
  useEffect(() => {
    if (!selectedEmployee || isLoading) return;
  
    const autoPopulateWeek = async () => {
      for (const day of weekDays) {
        const dateString = format(day, 'yyyy-MM-dd');
        const existingLog = worklogs.find(
          (log) =>
            log.employeeId === selectedEmployee.id &&
            normalizeDateKey(log.date) === dateString
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
  }, [selectedEmployee, weekStartDate, weekDays, worklogs, holidays, weeklyOffDays, saveWorklog, isLoading]);


  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const existingLog = worklogs.find(
        (log) =>
          log.employeeId === selectedEmployee.id &&
          normalizeDateKey(log.date) === dateString
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

  const currentTotalHours = useMemo(() => {
    return logItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  }, [logItems]);

  const handleAddItem = () => {
    if (currentTotalHours >= 24) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Total logged effort for a single day cannot exceed 24 hours.',
      });
      return;
    }
    const hasBlankRow = logItems.some((item) => !item.itemId);
    if (hasBlankRow) return;

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
    let finalValue = value;
    if (field === 'hours') {
      let num = parseFloat(value);
      if (isNaN(num)) num = 0;
      const otherHours = logItems
        .filter((item) => item.id !== id)
        .reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
      const maxAllowed = Math.max(0, 24 - otherHours);
      if (num > maxAllowed) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: `Total logged effort for a single day cannot exceed 24 hours (Current other items: ${otherHours.toFixed(1)}h, max allowed for this item: ${maxAllowed.toFixed(1)}h).`,
        });
        finalValue = maxAllowed;
      } else {
        finalValue = Math.max(0, Math.min(24, num));
      }
    }
    setLogItems(
      logItems.map((item) => (item.id === id ? { ...item, [field]: finalValue } : item))
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

  const handleSave = async (showToast = true) => {
    if (!selectedEmployee || !selectedDate) return;
    
    if (!isAdmin && currentEmployee && selectedEmployee.id !== currentEmployee.id) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only Administrators can log work effort for other resources.',
      });
      return;
    }

    // De-duplicate items before saving
    const itemMap = new Map<string, WorklogItem>();
    logItems.forEach(item => {
      const key = item.itemId || item.id;
      const existing = itemMap.get(key);
      const numHours = Number(item.hours) || 0;
      if (existing) {
        existing.hours += numHours;
        if (item.description) {
          existing.description = (existing.description || '') + ' ' + item.description;
        }
      } else {
        itemMap.set(key, { ...item, hours: numHours });
      }
    });

    const finalItems = Array.from(itemMap.values()).filter(it => it.itemId || it.hours > 0);
    const totalHours = finalItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);

    if (totalHours > 24) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: `Total logged effort for a single day cannot exceed 24 hours (Current total: ${totalHours.toFixed(1)}h).`,
      });
      return;
    }

    setIsSaving(true);
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setOptimisticDailyHours(prev => ({ ...prev, [dateKey]: totalHours }));

    const worklogData = {
      employeeId: selectedEmployee.id,
      date: dateKey,
      items: finalItems.map(({ id, ...rest }) => rest),
      totalHours: totalHours,
    };

    const success = await saveWorklog(worklogData);

    if (success) {
      if (showToast) {
        toast({
          title: 'Worklog Saved',
          description: `Successfully saved ${totalHours.toFixed(1)}h for ${format(selectedDate, 'PPP')}.`,
        });
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save worklog.',
      });
    }
    setIsSaving(false);
  };

  const handleAutoSave = () => handleSave(false);


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
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium">Employee</label>
                {!isAdmin && (
                  <span className="text-xs text-muted-foreground italic">
                    (Only Administrators can select other resources)
                  </span>
                )}
              </div>
              <Select
                disabled={!isAdmin}
                onValueChange={(id) =>
                  { setSelectedEmployee(employees.find((e) => e.id === id) || null); setOptimisticDailyHours({}); }
                }
                value={selectedEmployee?.id}
              >
                <SelectTrigger className="w-full md:w-1/3">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {(isAdmin ? employees : (currentEmployee ? [currentEmployee] : employees))
                    .filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '')
                    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' }))
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.empId.trim()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Date</label>
                <div className="flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-md border text-sm">
                  <span className="text-muted-foreground text-xs font-medium">Weekly Total:</span>
                  <span className="font-bold text-foreground">{weeklyTotalHours.toFixed(1)} hrs</span>
                </div>
              </div>
              <div className="flex items-center gap-4 my-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { setDisplayDate(subWeeks(displayDate, 1)); setOptimisticDailyHours({}); }}
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
                  onClick={() => { setDisplayDate(addWeeks(displayDate, 1)); setOptimisticDailyHours({}); }}
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
                  Add or modify items and hours worked. Click Save to update the weekly calendar.
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
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          list="work-item-options"
                          placeholder="Search work item..."
                          className="pl-9"
                          value={workItemInputValues[item.id] || ''}
                          onChange={(e) => handleWorkItemInputChange(item.id, e.target.value)}
                          onBlur={handleAutoSave}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      {index === 0 && (
                        <label className="text-sm font-medium">Hours</label>
                      )}
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={item.hours === 0 ? '' : item.hours}
                        onChange={(e) => handleItemChange(item.id, 'hours', e.target.value)}
                        onBlur={handleAutoSave}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(true); } }}
                        min="0"
                        max="24"
                        step="any"
                        className="font-mono"
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        title="Save hours"
                        className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isSaving}
                        title="Remove item"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <datalist id="work-item-options">
                  {workItemOptions.map((option) => (
                    <option key={option.value} value={option.label} />
                  ))}
                </datalist>
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between pt-4 border-t mt-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleAddItem} disabled={isSaving || currentTotalHours >= 24}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                    <Button
                      onClick={() => handleSave(true)}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    >
                      <Save className="mr-2 h-4 w-4" /> Save Log
                    </Button>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="text-xs text-muted-foreground block">Weekly Required Hours</span>
                      <span className="text-base font-bold text-foreground">
                        {weeklyRequiredHours.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="border-l pl-4 border-border/60">
                      <span className="text-xs text-muted-foreground block">Weekly Total Logged</span>
                      <span className="text-base font-bold text-foreground">
                        {weeklyTotalHours.toFixed(1)} hrs
                      </span>
                    </div>
                  </div>
                </div>
                {currentTotalHours > 24 && (
                  <p className="text-xs text-destructive font-medium mt-2 text-right">
                    Total effort for a single day cannot exceed 24 hours.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
